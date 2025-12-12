# Stage 1 responsibilities: 
    # - Clone whisper.cpp source 
    # - Compile & generate whisper output files
    # - Download tiny model

# Node:22 runs on debian:12-slim, using it to avoid library conflicts
FROM debian:12-slim AS whisper-builder 

# install necessary packages to clone github source and compile C & C++ files
# - build-essential: including gcc, g++ to compile C & C++ files
# - git: run git clone
# - make: tool to compile C & C++ files to binary files
#       + this command will read the Makefile or CMakeLists file in whisper.cpp source to generate binary files
# -cmake: make requires cmake to run its command
# -curl: for downloading tiny model 

RUN apt-get update && apt-get install -y \
    build-essential \
    git \
    cmake \
    curl

WORKDIR /whisper
RUN git clone https://github.com/ggerganov/whisper.cpp .
# Compile and generate whisper output files 
RUN make

# download model tiny using 'curl'
RUN bash models/download-ggml-model.sh tiny

# Stage 2: 
    # - Stage 1 will generate whisper-server file (stage 2 will use this file to run a whisper HTTP server)
    # - Whisper HTTP server requires some generated output files in stage 1 
FROM debian:12-slim 

WORKDIR /app

# Debian-slim version lacks libgomp1, install it (whisper-server requires libgomp1)
RUN apt-get update && apt-get install -y \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# CREATE vendor/whisper folder 
RUN mkdir -p /app/vendor/whisper

# whisper-server requires these following files
COPY --from=whisper-builder /whisper/build/ggml/src/libggml.so.0 \
    /app/vendor/whisper/libggml.so.0

COPY --from=whisper-builder /whisper/build/src/libwhisper.so.1 \
    /app/vendor/whisper/libwhisper.so.1

COPY --from=whisper-builder /whisper/build/ggml/src/libggml-base.so.0 \
    /app/vendor/whisper/libggml-base.so.0

COPY --from=whisper-builder /whisper/build/ggml/src/libggml-cpu.so.0 \
    /app/vendor/whisper/libggml-cpu.so.0

# Copy model tiny from build stage to /vendor/whisper
COPY --from=whisper-builder /whisper/models/ggml-tiny.bin \
    /app/vendor/whisper/ggml-tiny.bin

# Copy whisper-server to /vendor/whisper
COPY --from=whisper-builder /whisper/build/bin/whisper-server \
    /app/vendor/whisper/whisper-server

# Ensure system find .so files in /vendor/whisper, (for some reasons, this line is not recommended in prod, would change later on)
ENV LD_LIBRARY_PATH=/app/vendor/whisper:$LD_LIBRARY_PATH

EXPOSE 8624 

# Run whisper-server from /vendor/whisper, this will start a server that uses downloaded tiny model and runs on port 8624 
# Execute command: /app/vendor/whisper/whisper-server -m /app/vendor/whisper/ggml-tiny.bin --host 0.0.0.0 --port 8624 
CMD ["/app/vendor/whisper/whisper-server", "-m", "/app/vendor/whisper/ggml-tiny.bin", "--host", "0.0.0.0", "--port", "8624"]
