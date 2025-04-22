import { OpenAIService } from '@/services/generative/v3/base/openai.service';
import { APIGatewayProxyHandler } from 'aws-lambda';
import { convertJsonToArray, generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { ChatCompletionMessageParam } from 'openai/resources/chat';
import Redis from 'ioredis';

let redis: Redis | null = null;

function getRedisClient() {
  if (!redis) {
    redis = new Redis({
      host: process.env.REDIS_HOST || 'localhost',
      port: Number(process.env.REDIS_PORT) || 6379,
      password: process.env.REDIS_PASSWORD,
      // Lambda-specific options to handle connections better
      maxRetriesPerRequest: 1,
      enableReadyCheck: false,
    });
  }
  return redis;
}

export const handler: APIGatewayProxyHandler = async event => {
  const redisClient = getRedisClient();

  try {
    const { jobId, type = 'FLASH_CARD' } = JSON.parse(event.body || '{}');

    if (!jobId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ message: 'Missing jobId' }),
      };
    }

    const key = `bull:QUEUE_HANDLER_OPEN_API_INTEGRATE_GEN_CONTENT:${jobId}`;
    const jobDataRaw = await redisClient.get(key);

    if (!jobDataRaw) {
      return {
        statusCode: 404,
        body: JSON.stringify({ message: 'Job data not found' }),
      };
    }

    const jobData = JSON.parse(jobDataRaw);
    const content = jobData?.data?.content;

    const result = await generateContent(content, type);

    // Store the result with proper key format
    const resultKey = `flashcard:result:${jobId}`;
    await redisClient.set(resultKey, JSON.stringify(result), 'EX', 300);

    // Close Redis connection - important in Lambda to avoid hanging
    await redisClient.quit();
    redis = null;

    return {
      statusCode: 200,
      body: JSON.stringify({ message: 'Job processed', jobId }),
    };
  } catch (error) {
    console.error('Lambda handler error:', error);

    // Always close Redis connection on error
    if (redis) {
      await redis.quit().catch(() => {});
      redis = null;
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
    const isModelAvailable = await openAIService.isAvailableModel();

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
