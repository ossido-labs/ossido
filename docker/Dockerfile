# ARGs obtained from the compose.yml file

ARG BASE_OS=bookworm
ARG RUST_VERSION=1.97.1

FROM rust:${RUST_VERSION}-${BASE_OS}

# Nodejs installation

RUN ["mkdir", "/usr/local/node"]
WORKDIR /usr/local/node

## Retrieves the targeted version of Node in the container

COPY .nvmrc /tmp/.nvmrc

## Download the Node.js standelone binary archive && extract it && clean files

RUN ["/bin/sh", "-c", "NODE_VERSION=$(cat /tmp/.nvmrc | tr -d '\r') && \
    wget https://nodejs.org/dist/v${NODE_VERSION}/node-v${NODE_VERSION}-linux-x64.tar.xz && \
    tar xf node-v${NODE_VERSION}-linux-x64.tar.xz --strip-components 1 && \
    rm node-v${NODE_VERSION}-linux-x64.tar.xz /tmp/.nvmrc"]

## Ensure Node.js binaries are available in the PATH

ENV PATH /usr/local/node/bin:$PATH

# cargo-watch installation (for Rust live-reloading during dev')
## `--locked` uses cargo-watch's pinned Cargo.lock so a transitive dep does not
## pull in a newer version with a higher MSRV than this image's rustc (e.g.
## notify-rust 4.18 requires rustc 1.89 while the image ships 1.88).

RUN ["cargo", "install", "cargo-watch", "--locked"]

# global configuration done ! let's focus on the project itself

## Copy project files into the container (excepted files/dir declared in .dockerignore) to /ossido directory

WORKDIR /ossido
COPY . .

# Bun installation (matches the `packageManager` field in package.json)
## The official install script needs curl + unzip (the image ships wget only).

RUN apt-get update && apt-get install -y --no-install-recommends curl unzip \
    && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://bun.sh/install | bash -s "bun-v1.3.14"
ENV BUN_INSTALL=/root/.bun
ENV PATH=$BUN_INSTALL/bin:$PATH

## Install Node.js dependencies (defined in package.json)
RUN ["bun", "install", "--frozen-lockfile"]

## Compile and add the directory with compiled binaries to the PATH for direct access

RUN ["cargo", "build"]
ENV PATH=/ossido/target/debug:$PATH
