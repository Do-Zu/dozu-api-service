const STATUS_GEN = {
    connected: "connected",
    register: 'register',
    success: 'success',
    completed: 'completed',
    fallback: 'fallback',
    error: 'error',
    not_found: 'not found',
};

const DEFAULT_MAX_SIZE_PAYLOAD_ASYNC_TO_LAMBDA = 262_144 - 100; // 256 KB - 100 bytes for overhead

const DEFAULT_MAX_SIZE_PAYLOAD_SYNC_TO_LAMBDA = 6_144_000; //6MB

export { DEFAULT_MAX_SIZE_PAYLOAD_ASYNC_TO_LAMBDA, DEFAULT_MAX_SIZE_PAYLOAD_SYNC_TO_LAMBDA, STATUS_GEN };
