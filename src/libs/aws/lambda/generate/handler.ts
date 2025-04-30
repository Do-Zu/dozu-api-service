import pako from 'pako';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import { OpenAIService } from '../../../../services/generative/v3/provider/llm/openai.service';
import { convertJsonToArray, generatePromptText, TYPE_PROMPT } from '../../../../utils/prompt';
import { decompressContent } from '../../../../utils/compress';
import { Queue } from 'bullmq';
import Redis from 'ioredis';

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

    const { jobId, content, queue_name, type, job_name } = event?.data;

    if (!jobId || !content || !queue_name || !type) {
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

    const contentDecompressed = decompressContent(content);

    console.log({
      jobId,
      content,
      queue_name,
      type,
      job_name,
      contentDecompressed,
    });

    //generate content
    const result = await generateContent(contentDecompressed, type);

    const queue = createQueue(queue_name);

    // Add job to the queue
    const job = await queue.add(
      job_name,
      { data: result, jobId, type },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
        removeOnComplete: true,
        removeOnFail: 5000,
      }
    );

    console.log(`Job added to queue ${queue_name}, job ID: ${job.id}`);

    // // Store the result with proper key format
    // await queue.addJob(queue_name, job_name, { data: result, jobId, type });

    // //disconnect with redis
    // await queue.disconnect();

    if (redisConnection) {
      await redisConnection.quit();
      redisConnection = null;
      console.log('Redis connection closed');
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Job processed',
        jobId,
        queueJobId: job.id,
      }),
    };
  } catch (error) {
    console.error('Lambda handler error:', error);
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
      body: JSON.stringify({
        message: 'Failed to process job',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

// Generate content using OpenAI
async function generateContent(content: string, type: TYPE_PROMPT): Promise<any> {
  try {
    const openAIService = new OpenAIService();
    const isModelAvailable = openAIService.isAvailable();

    if (!isModelAvailable) {
      throw new Error('OpenAI model not available');
    }

    const prompt = generatePromptText(content, type);

    let fullContent = '';

    const messages: ChatCompletionMessageParam[] = [
      {
        role: 'system',
        content: 'You are a helpful assistant that generates educational content.',
      },
      {
        role: 'user',
        content: prompt,
      },
    ];

    // Stream the content from OpenAI
    const stream = await openAIService.createStream(messages);

    if (!stream) return undefined;

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      fullContent += content;
    }

    // Parse the result
    const data = convertJsonToArray(fullContent || '[]');

    return {
      content: data,
      rawText: fullContent,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(
      `Failed to generate content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Notify client through WebSocket (implementation would depend on your WebSocket setup)
// async function notifyClientThroughWebSocket(jobId: string, result: any): Promise<void> {
//   try {
//     // This is a placeholder - actual implementation would depend on your WebSocket service
//     // For example, using AWS ApiGatewayManagementApi:
//     /*
//     const connections = await getActiveConnections(jobId);
//     for (const connectionId of connections) {
//       await apiGateway.postToConnection({
//         ConnectionId: connectionId,
//         Data: JSON.stringify({
//           type: 'CONTENT_READY',
//           jobId,
//           result
//         })
//       }).promise();
//     }
//     */
//   } catch (error) {
//     // Log but don't throw - WebSocket notification failure shouldn't fail the whole process
//   }
// }
