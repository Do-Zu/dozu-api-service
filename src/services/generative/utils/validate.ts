import { DEFAULT_MAX_SIZE_PAYLOAD_ASYNC_TO_LAMBDA } from './constant';

/**
 * Validates payload size against AWS Lambda limits
 * @param payload The payload object to validate
 * @param maxSizeKB Maximum allowed size in KB (default: 256)
 * @returns Buffer containing the serialized payload
 * @throws Error if payload exceeds size limit
 */
const validatePayloadSizeBuffer = (
    payload: object | string | number | Array<unknown>,
    maxSize = DEFAULT_MAX_SIZE_PAYLOAD_ASYNC_TO_LAMBDA
): boolean => {
    const payloadBuffer = Buffer.from(JSON.stringify(payload));
    const payloadSize = payloadBuffer.length;

    return payloadSize > maxSize;
};

export { validatePayloadSizeBuffer };
