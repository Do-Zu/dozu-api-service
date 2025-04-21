import { redis, redisInstance } from '@/libs/redis/redis.connect';
import { bullMQService } from '@/libs/bullmq/bullmq';
import { OpenAIService } from '@/services/generative/v3/base/openai.service';
import logger from '@/utils/logger';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { convertJsonToArray, generatePromptText, TYPE_PROMPT } from '@/utils/prompt';
import { SQSEvent, SQSRecord } from 'aws-lambda';
import { ChatCompletionMessageParam } from 'openai/resources/chat';

// Lambda handler for SQS queue processing
export const handler = async (event: SQSEvent): Promise<APIGatewayProxyResult> => {
  try {
    logger.info('Lambda function invoked with event:', JSON.stringify(event));

    const responses = await Promise.allSettled(
      event.Records.map(record => processQueueMessage(record))
    );

    // Count successful and failed jobs
    const results = {
      successful: responses.filter(r => r.status === 'fulfilled').length,
      failed: responses.filter(r => r.status === 'rejected').length,
      total: responses.length,
    };

    logger.info(
      `Processed ${results.total} messages: ${results.successful} succeeded, ${results.failed} failed`
    );

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Lambda execution completed',
        results,
      }),
    };
  } catch (error) {
    logger.error('Error in Lambda handler:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: 'Error processing queue messages',
        error: error instanceof Error ? error.message : String(error),
      }),
    };
  }
};

// Process individual queue message
async function processQueueMessage(record: SQSRecord): Promise<void> {
  const RESULT_TTL = 60 * 60; // Cache results for 1 hour

  try {
    // Parse the message body
    const message = JSON.parse(record.body);
    const { jobId, content, type = 'FLASH_CARD' } = message;

    logger.info(`Processing job ${jobId} for content generation`);

    // Generate content using OpenAI
    const result = await generateContent(content, type);

    // Store result in Redis
    const key = `content:result:${jobId}`;
    await redisInstance.set(key, JSON.stringify(result), RESULT_TTL);

    // Optional: Send through WebSocket if required
    await notifyClientThroughWebSocket(jobId, result);

    logger.info(`Successfully processed job ${jobId}`);
  } catch (error) {
    logger.error('Error processing queue message:', error);
    throw error; // Propagate error to the handler for proper reporting
  }
}

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
    logger.error('Error generating content with OpenAI:', error);
    throw new Error(
      `Failed to generate content: ${error instanceof Error ? error.message : String(error)}`
    );
  }
}

// Notify client through WebSocket (implementation would depend on your WebSocket setup)
async function notifyClientThroughWebSocket(jobId: string, result: any): Promise<void> {
  try {
    // This is a placeholder - actual implementation would depend on your WebSocket service
    // For example, using AWS ApiGatewayManagementApi:
    /*
    const connections = await getActiveConnections(jobId);
    for (const connectionId of connections) {
      await apiGateway.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify({
          type: 'CONTENT_READY',
          jobId,
          result
        })
      }).promise();
    }
    */

    logger.info(`WebSocket notification would be sent for job ${jobId}`);
  } catch (error) {
    // Log but don't throw - WebSocket notification failure shouldn't fail the whole process
    logger.error(`Failed to send WebSocket notification for job ${jobId}:`, error);
  }
}
