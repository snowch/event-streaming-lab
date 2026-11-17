"""Actual Kafka protocol clients. Broker storage/coordination is librdkafka's mock."""
import json
import time
from confluent_kafka import Producer, Consumer, TopicPartition, KafkaError
from bytewax.connectors.kafka import KafkaSource
import bytewax.operators as op
from bytewax.dataflow import Dataflow
from bytewax.testing import TestingSink, run_main

TOPIC = 'orders'

def _broker(orders):
    producer=Producer({'test.mock.num.brokers':1,'log_level':0})
    brokers=','.join(f'{b.host}:{b.port}' for b in producer.list_topics(timeout=15).brokers.values())
    errors=[]
    def delivered(error, message):
        if error: errors.append(str(error))
    for order in orders:
        producer.produce(TOPIC, key=order['shop'], value=json.dumps(order),
                         partition=0 if order['shop']=='North' else 1, on_delivery=delivered)
    if producer.flush(15) or errors: raise RuntimeError(f'Delivery failed: {errors}')
    return producer, brokers

def _rows(messages):
    result={'0':[],'1':[]}
    for partition,offset,event in messages:
        result[str(partition)].append({'offset':offset,'id':event['id']})
    for rows in result.values(): rows.sort(key=lambda r:r['offset'])
    return result

def partition_log(orders):
    owner,brokers=_broker(orders)
    flow=Dataflow('kafka_partitions')
    stream=op.input('kafka',flow,KafkaSource([brokers],[TOPIC],tail=False,batch_size=1))
    decoded=op.map('decode',stream,lambda m:(m.partition,m.offset,json.loads(m.value)))
    messages=[]
    op.output('collect',decoded,TestingSink(messages))
    run_main(flow)
    return _rows(messages)

def _read_group(brokers, group, initial):
    config={'bootstrap.servers':brokers,'group.id':group,'enable.auto.commit':False,
            'enable.partition.eof':True,'auto.offset.reset':'earliest'}
    # Commit actual positions to the mock's coordinator, then reopen the client.
    client=Consumer(config)
    try: client.commit(offsets=[TopicPartition(TOPIC,p,initial) for p in (0,1)],asynchronous=False)
    finally: client.close()
    client=Consumer(config)
    try:
        positions=client.committed([TopicPartition(TOPIC,p) for p in (0,1)],timeout=15)
        assert all(p.offset==initial for p in positions), positions
        client.assign(positions)
        ended=set();messages=[];deadline=time.monotonic()+30
        while len(ended)<2:
            if time.monotonic()>deadline: raise TimeoutError('Kafka group read timed out')
            message=client.poll(0.1)
            if message is None: continue
            if message.error():
                if message.error().code()==KafkaError._PARTITION_EOF:
                    ended.add(message.partition());continue
                raise RuntimeError(str(message.error()))
            messages.append((message.partition(),message.offset(),json.loads(message.value())))
        return _rows(messages)
    finally: client.close()

def consume_log(orders, committed=1):
    if not 0 <= committed <= 2: raise ValueError('Use a next position between 0 and 2')
    owner,brokers=_broker(orders)
    return {'sales':_read_group(brokers,'sales',committed),
            'audit':_read_group(brokers,'audit',0),
            'note':'Real group-offset commit/fetch requests to an in-memory Kafka simulator; next position, not a durable broker guarantee.'}
