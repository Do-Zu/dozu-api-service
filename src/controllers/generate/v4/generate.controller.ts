import { Request, Response } from 'express';
import { generateService } from '@/services/generative/v4/generate.service';
import { GenerateContentRequestInterface } from '@/dtos/generate';
import { BadRequest } from '@/core/error';
import { isNilOrEmpty } from '@/utils/common';
import logger from '@/utils/logger';

/**
 * Sets up HTTP streaming headers for chunked transfer encoding
 * @param res Express Response object
 */
const setupStreamHeaders = (res: Response): void => {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
};

/**
 * Validates the stream generate request payload
 * @param body Request body
 * @throws BadRequest if validation fails
 */
const validateStreamRequest = (body: GenerateContentRequestInterface): void => {
    const { content, type } = body;

    if (isNilOrEmpty(content)) {
        throw new BadRequest('Content is required');
    }

    if (isNilOrEmpty(type)) {
        throw new BadRequest('Type is required');
    }
};

class GenerateController {
    /**
     * Handles HTTP streaming for LLM content generation using chunked transfer encoding
     *
     * This method:
     * 1. Validates the incoming request
     * 2. Sets up HTTP streaming with chunked transfer encoding
     * 3. Streams raw content chunks from the LLM service
     * 4. Handles client disconnection gracefully
     * 5. Properly closes the stream on completion or error
     *
     * @param req Express Request object containing GenerateContentRequestInterface
     * @param res Express Response object for HTTP streaming
     */
    public async httpStreamGenerateContent(req: Request, res: Response): Promise<void> {
        const payload = req.body as GenerateContentRequestInterface;

        validateStreamRequest(payload);

        let isClientDisconnected = false;

        setupStreamHeaders(res);

        const handleDisconnect = (): void => {
            isClientDisconnected = true;
            logger.info('Stream client disconnected');
        };

        req.on('close', handleDisconnect);
        req.on('aborted', handleDisconnect);
        res.on('error', handleDisconnect);

        try {
            const streamGenerator = generateService.streamGenerate(payload);

            for await (const packet of streamGenerator) {
                if (isClientDisconnected) {
                    break;
                }

                const canContinue = res.write(packet.data);

                // Handle backpressure - wait for drain if buffer is full
                if (!canContinue && !isClientDisconnected) {
                    await new Promise<void>(resolve => res.once('drain', resolve));
                }
            }
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
            logger.error(`Stream generation error: ${errorMessage}`);

            // Only attempt to send error if headers haven't been sent or client still connected
            if (!isClientDisconnected && !res.writableEnded) {
                res.write(`\n[Error: ${errorMessage}]`);
            }
        } finally {
            req.removeListener('close', handleDisconnect);
            req.removeListener('aborted', handleDisconnect);
            res.removeListener('error', handleDisconnect);

            if (!isClientDisconnected && !res.writableEnded) {
                res.end();
            }
        }
    }
}

export const generateController = new GenerateController();
