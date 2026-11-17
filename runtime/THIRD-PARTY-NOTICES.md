# Third-party runtime notices

The course's Apache-2.0 code and CC BY-NC prose licenses apply to its original work. They do not relicense these runtime components.

| Component | License and corresponding upstream source |
| --- | --- |
| container2wasm 0.6.3, demo distribution | Apache-2.0; [tool source, build recipe and embedded patches](https://github.com/container2wasm/container2wasm/tree/v0.6.3), [demo source](https://github.com/ktock/container2wasm-demo/tree/8228aaa4a7c9d179cbe266a119e69f58746f1742) |
| Bochs and VGA BIOS | LGPL-2.1; [patched source and license in the selected tool release](https://github.com/container2wasm/container2wasm/tree/v0.6.3/patches/bochs/Bochs) |
| Linux 6.1 | GPL-2.0; [kernel source](https://github.com/torvalds/linux/tree/v6.1); configuration/patches in the selected container2wasm release |
| GRUB | GPL-3.0; source/configuration references in the preserved container2wasm Dockerfile |
| BusyBox 1.36.1 | GPL-2.0; [source](https://git.busybox.net/busybox/tag/?h=1_36_1) and configuration in container2wasm |
| runc 1.1.12 | Apache-2.0; [source](https://github.com/opencontainers/runc/tree/v1.1.12) |
| tini 0.19.0 | MIT; [source](https://github.com/krallin/tini/tree/v0.19.0) |
| wasi-vfs 0.3.0 | MIT; [source](https://github.com/kateinoigakukun/wasi-vfs/tree/v0.3.0) |
| Alpine base image and its original Python 3.11 | Packages retain their licenses; [image source](https://github.com/ktock/container2wasm-demo/blob/8228aaa4a7c9d179cbe266a119e69f58746f1742/src/amd64-python-wasi/image), [Alpine package sources](https://gitlab.alpinelinux.org/alpine/aports). This Python is unused by the course. |
| CPython 3.12 | PSF license; [CPython source](https://github.com/python/cpython), LICENSE.txt in the runtime bundle |
| Debian Bookworm shared libraries | Their individual package licenses; copyright notices are retained in `bundle/debian-notices`; [Debian source packages](https://sources.debian.org/) |
| Bytewax 0.21.1 | Apache-2.0; [source](https://github.com/bytewax/bytewax) and wheel notices retained in the bundle |
| confluent-kafka 2.6.1 / librdkafka 2.6.1 | Apache-2.0 / BSD-2-Clause; [Python client source](https://github.com/confluentinc/confluent-kafka-python/tree/v2.6.1), [librdkafka source and mock API](https://github.com/confluentinc/librdkafka/tree/v2.6.1) |
| prometheus-client 0.26.0, typing-extensions 4.16.0 | Apache-2.0 / PSF; pinned wheel provenance and package notices retained in the runtime |
| browser_wasi_shim 0.4.2 | MIT or Apache-2.0; [source](https://github.com/bjorn3/browser_wasi_shim), both license texts copied into the generated site |
| fflate 0.8.3 | MIT, copyright Arjun Barrett; [source](https://github.com/101arrowz/fflate), license text copied into the generated site |

No networking proxy, xterm, JSLinux x86 emulator or external execution service is shipped. The guest uses real TCP loopback. The custom worker provides WASI file and clock integration; it does not replace Bytewax operators or fabricate engine output.
