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
RUN cmake -B build \
    -DWHISPER_BUILD_SERVER=ON \
    -DCMAKE_BUILD_TYPE=Release && \
    cmake --build build --target whisper-server

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
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# CREATE vendor/whisper folder 
RUN mkdir -p /app/vendor/whisper

# whisper-server requires these following files
COPY --from=whisper-builder /whisper/build/ggml/src/libggml.so.0 \
    /usr/local/lib/

COPY --from=whisper-builder /whisper/build/src/libwhisper.so.1 \
    /usr/local/lib/

COPY --from=whisper-builder /whisper/build/ggml/src/libggml-base.so.0 \
    /usr/local/lib/

COPY --from=whisper-builder /whisper/build/ggml/src/libggml-cpu.so.0 \
    /usr/local/lib/

# Copy model tiny from build stage to /vendor/whisper
COPY --from=whisper-builder /whisper/models/ggml-tiny.bin \
    /app/vendor/whisper/ggml-tiny.bin

# Copy whisper-server to /vendor/whisper
COPY --from=whisper-builder /whisper/build/bin/whisper-server \
    /app/vendor/whisper/whisper-server

# Update shared library cache (for finding .so files in /usr/local/lib)
RUN ldconfig

EXPOSE 8624 

# Run whisper-server from /vendor/whisper, this will start a server that uses downloaded tiny model and runs on port 8624 
# Execute command: /app/vendor/whisper/whisper-server -m /app/vendor/whisper/ggml-tiny.bin --host 0.0.0.0 --port 8624 
# Pass --convert true option to enable converting other media files (eg. .mp3, .mp4) to .wav files (using ffmpeg server)
CMD ["/app/vendor/whisper/whisper-server", "-m", "/app/vendor/whisper/ggml-tiny.bin", "--host", "0.0.0.0", "--port", "8624", "--convert"]
