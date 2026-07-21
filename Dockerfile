FROM node:22

# Install Claude Code globally
RUN npm install -g @anthropic-ai/claude-code@2.1.173

# Install the Go toolchain (arch auto-detected: amd64 or arm64)
ENV GO_VERSION=1.23.5
RUN set -eux; \
    arch="$(dpkg --print-architecture)"; \
    url="https://go.dev/dl/go${GO_VERSION}.linux-${arch}.tar.gz"; \
    curl -fsSL "$url" -o /tmp/go.tar.gz; \
    tar -C /usr/local -xzf /tmp/go.tar.gz; \
    rm /tmp/go.tar.gz
ENV PATH="/usr/local/go/bin:${PATH}"

# Create a non-root user inside the container
RUN useradd -m -s /bin/bash dev
USER dev

# Go caches (module + build) under the dev user's home
ENV GOPATH="/home/dev/go"
ENV PATH="/home/dev/go/bin:${PATH}"

WORKDIR /workspace