FROM python:3.12-slim-bookworm@sha256:935c3c5b12357a7e10caa9c1e6ca5692344d97cf229832ef584be2cec9fc03df
COPY wheels /wheels
RUN python -m pip install --no-index --find-links=/wheels --no-cache-dir bytewax==0.21.1 confluent-kafka==2.6.1 prometheus-client==0.26.0 typing-extensions==4.16.0
COPY build_bundle.py /build_bundle.py
RUN python /build_bundle.py
