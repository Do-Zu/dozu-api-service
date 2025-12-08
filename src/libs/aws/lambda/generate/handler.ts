import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { generatePromptText, TYPE_PROMPT } from '../../../../utils/prompt';
import { decompressContent } from '../../../../utils/compress';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import OpenAI from 'openai';
import { IGenerateOptions } from '@/dtos/generate/models/GenerateContentRequestInterface';

// Configure Redis connection
const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
const REDIS_PASSWORD = process.env.REDIS_PASSWORD;

// Redis singleton for Lambda to reuse across invocations
let redisConnection: Redis | null = null;

// Get or create Redis connection
function getRedisConnection(): Redis {
    if (!redisConnection) {
        console.log(`Connecting to Redis at ${REDIS_HOST}:${REDIS_PORT}...`);
        redisConnection = new Redis({
            host: REDIS_HOST,
            port: REDIS_PORT,
            password: REDIS_PASSWORD,
            maxRetriesPerRequest: 1,
            enableReadyCheck: false,
            connectTimeout: 10000,
            disconnectTimeout: 2000,
            // Lambda-optimized settings
            retryStrategy: times => Math.min(times * 50, 2000),
        });

        redisConnection.on('error', err => {
            console.error('Redis connection error:', err);
        });

        redisConnection.on('connect', () => {
            console.log('Connected to Redis server');
        });
    }
    return redisConnection;
}

// Create a queue instance
function createQueue(name: string): Queue {
    const connection = getRedisConnection();
    return new Queue(name, { connection });
}

export const handler = async (event: any) => {
    try {
        console.log({ event });

        if (!event || !event.data) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Missing event data structure',
                }),
            };
        }

        const {
            jobId,
            content,
            queue_name,
            type,
            job_name,
            model,
            apiKey,
            options,
            providerBaseUrl,
            isRawText = false,
            isAsync = true,
        } = event.data;

        if (!jobId || !content || !queue_name || !type || !model || !apiKey || !providerBaseUrl) {
            return {
                statusCode: 400,
                body: JSON.stringify({
                    message: 'Missing required parameters',
                    details: {
                        jobId: !jobId ? 'missing' : 'ok',
                        content: content === undefined ? 'missing' : 'ok',
                        queue_name: !queue_name ? 'missing' : 'ok',
                        type: !type ? 'missing' : 'ok',
                    },
                }),
            };
        }

        console.log({ model });

        const contentDecompressed = isRawText ? content : decompressContent(content);

        console.log({
            jobId,
            content,
            queue_name,
            type,
            job_name,
        });

        //generate content
        const result = await generateContent(contentDecompressed, type, apiKey, providerBaseUrl, model, options);

        let job;

        if (isAsync) {
            const queue = createQueue(queue_name);

            // Add job to the queue
            job = await queue.add(
                job_name,
                { data: result, jobId, type, isError: false },
                {
                    attempts: 3,
                    backoff: {
                        type: 'exponential',
                        delay: 1000,
                    },
                    removeOnComplete: 5,
                    removeOnFail: 5,
                }
            );

            console.log(`Job added to queue ${queue_name}, job ID: ${job.id}`);

            if (redisConnection) {
                await redisConnection.quit();
                redisConnection = null;
                console.log('Redis connection closed');
            }
        }

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Job processed',
                jobId,
                queueJobId: job?.id,
                type,
                result,
            }),
        };
    } catch (error) {
        console.error('Lambda handler error:', error);

        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorData = {
            message: 'Failed to process job',
            error: errorMessage,
            errorType: error instanceof Error ? error.name : 'UnknownError',
            status: 'error',
            timestamp: new Date().toISOString(),
        };

        // Push error to queue before closing connection
        try {
            const { jobId, queue_name, job_name, type, isAsync = true } = event.data || {};

            if (isAsync && jobId && queue_name && job_name) {
                const queue = createQueue(queue_name);

                // Add error job to the queue
                await queue.add(
                    job_name,
                    { data: errorData, jobId, type, isError: true },
                    {
                        attempts: 1,
                        removeOnComplete: 5,
                        removeOnFail: 5,
                    }
                );

                console.log(`Error job added to queue ${queue_name} for job ${jobId}`);
            }
        } catch (queueError) {
            console.error('Failed to push error to queue:', queueError);
        }

        if (redisConnection) {
            try {
                await redisConnection.quit();
                redisConnection = null;
            } catch (e) {
                console.error('Error closing Redis connection:', e);
            }
        }
        return {
            statusCode: 500,
            body: JSON.stringify(errorData),
        };
    }
};

// Generate content using OpenAI
async function generateContent(
    content: string,
    type: TYPE_PROMPT,
    apiKey: string,
    baseURL: string,
    model: string,
    options?: IGenerateOptions
): Promise<any> {
    console.log(`Starting content generation with type: ${type}`);

    try {
        // Initialize OpenAI with proper credentials from parameters
        const openai = new OpenAI({
            apiKey: apiKey,
            baseURL: baseURL,
        });

        console.log('OpenAI client initialized');

        // Generate the appropriate prompt for the requested content type
        const prompt = generatePromptText(content, type, options);

        console.log(`Generated prompt`);

        // Set up messages for the chat completion
        const messages: ChatCompletionMessageParam[] = [
            {
                role: 'system',
                content: 'You are a helpful assistant that generates educational content in valid JSON format.',
            },
            {
                role: 'user',
                content: prompt,
            },
        ];

        console.log('Creating OpenAI completion...');

        // Create a non-streaming chat completion
        const completion = await openai.chat.completions.create({
            model,
            messages: messages,
            stream: false,
            temperature: 0.5,
            max_tokens: 120000,
            response_format: {
                type: 'json_object',
            },
        });

        console.log('Completion received, processing response...');

        const responseContent = completion.choices?.[0]?.message?.content;

        if (!responseContent || responseContent.trim().length === 0) {
            console.warn('Warning: Received empty content from OpenAI');
            return {
                data: [],
                rawText: '',
                timestamp: new Date().toISOString(),
            };
        }

        // Parse the generated content directly as JSON
        try {
            const jsonData = JSON.parse(responseContent);

            console.log(`Successfully parsed JSON data`);

            return {
                data: jsonData,
                rawText: responseContent,
                timestamp: new Date().toISOString(),
            };
        } catch (parseError) {
            console.error('Error parsing response as JSON:', parseError);

            // Return the raw text and error information if parsing fails
            return {
                data: [],
                rawText: responseContent,
                error: 'Failed to parse LLM response as JSON',
                timestamp: new Date().toISOString(),
            };
        }
    } catch (error) {
        console.error('OpenAI API error:', error);

        // Properly format and return the error
        throw new Error(`Failed to generate content: ${error instanceof Error ? error.message : String(error)}`);
    }
}
