import {
  LambdaClient,
  InvokeCommand,
  InvocationResponse,
  InvokeCommandInput,
} from '@aws-sdk/client-lambda';
import logger from '@/utils/logger';
import { TYPE_PROMPT } from '@/utils/prompt';

export interface LambdaTriggerOptions {
  functionName: string;
  payload: Record<string, any>;
  invocationType?: 'RequestResponse' | 'Event';
  logType?: 'None' | 'Tail';
  qualifier?: string;
}

export interface LambdaTriggerResult {
  success: boolean;
  statusCode?: number;
  response?: InvocationResponse;
  error?: Error | string;
}

export class LambdaService {
  private readonly lambdaClient: LambdaClient;
  private readonly FUNCTION_NAME_GEN_CONTENT = '';
  constructor(
    region: string = process.env.AWS_REGION || 'ap-southeast-1',
    accessKeyId: string = process.env.ACCESS_KEY_ID_AWS || '',
    secretAccessKey: string = process.env.SECRET_ACCESS_KEY_AWS || ''
  ) {
    this.lambdaClient = new LambdaClient({
      region,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    });
  }

  /**
   * Triggers a Lambda function asynchronously (fire and forget)
   * @param functionName Name of the lambda function to invoke
   * @param payload Data to pass to the lambda function
   * @returns Promise resolving to true if successfully triggered, false otherwise
   */
  public async triggerAsync(functionName: string, payload: Record<string, any>): Promise<boolean> {
    return this.trigger({
      functionName,
      payload,
      invocationType: 'Event', // Asynchronous invocation
    }).then(result => result.success);
  }

  /**
   * Triggers a Lambda function synchronously and waits for the response
   * @param functionName Name of the lambda function to invoke
   * @param payload Data to pass to the lambda function
   * @returns Promise resolving to lambda function result or null if error occurred
   */
  public async triggerSync<T = any>(
    functionName: string,
    payload: Record<string, any>
  ): Promise<T | null> {
    console.log({ payload });
    const result = await this.trigger({
      functionName,
      payload,
      invocationType: 'RequestResponse', // Synchronous invocation
    });

    if (!result.success || !result.response?.Payload) {
      return null;
    }

    try {
      // Convert Buffer or Uint8Array to string, then parse as JSON
      let responseString: string;
      const responsePayload = result.response.Payload;

      if (Buffer.isBuffer(responsePayload)) {
        responseString = responsePayload.toString('utf-8');
      } else if (responsePayload instanceof Uint8Array) {
        responseString = new TextDecoder().decode(responsePayload);
      } else if (typeof responsePayload === 'string') {
        responseString = responsePayload;
      } else {
        // Handle other potential payload types
        responseString = JSON.stringify(responsePayload);
      }

      // Parse the string as JSON
      const parsedResponse = JSON.parse(responseString);

      // If the response contains a body property that's a JSON string, parse that too
      if (parsedResponse.body && typeof parsedResponse.body === 'string') {
        try {
          parsedResponse.body = JSON.parse(parsedResponse.body);
        } catch (innerError) {
          // If body isn't valid JSON, keep it as a string
          logger.debug('Lambda response body is not valid JSON, keeping as string');
        }
      }

      logger.debug('Lambda response successfully parsed', parsedResponse);
      return parsedResponse as T;
    } catch (error) {
      logger.error('Failed to parse Lambda response payload', error);
      return null;
    }
  }

  /**
   * Core method to trigger Lambda functions with full control over options
   * @param options Lambda invocation options
   * @returns Result object with success status and additional details
   */
  public async trigger(options: LambdaTriggerOptions): Promise<LambdaTriggerResult> {
    const { functionName, payload, invocationType, logType = 'None', qualifier } = options;

    try {
      // Validate inputs
      if (!functionName) {
        throw new Error('Function name is required');
      }

      // Construct the command input
      const input: InvokeCommandInput = {
        FunctionName: functionName,
        InvocationType: invocationType,
        LogType: logType,
        Payload: Buffer.from(JSON.stringify(payload)),
      };

      // Add qualifier if provided (version or alias)
      if (qualifier) {
        input.Qualifier = qualifier;
      }

      const command = new InvokeCommand(input);

      // Send the command to AWS
      const response = await this.lambdaClient.send(command);

      // Check for function error
      if (response.FunctionError) {
        logger.error(
          `Lambda function ${functionName} returned an error: ${response.FunctionError}`
        );
        return {
          success: false,
          statusCode: response.$metadata.httpStatusCode,
          response,
          error: response.FunctionError,
        };
      }

      // For async invocations, status code 202 means success
      // For sync invocations, status code 200 means success
      const isSuccess =
        invocationType === 'Event'
          ? response.$metadata.httpStatusCode === 202
          : response.$metadata.httpStatusCode === 200;

      if (isSuccess) {
        logger.info(`Successfully invoked Lambda function ${functionName}`);
      } else {
        logger.warn(
          `Lambda function ${functionName} invocation returned unexpected status code: ${response.$metadata.httpStatusCode}`
        );
      }

      return {
        success: isSuccess,
        statusCode: response.$metadata.httpStatusCode,
        response,
      };
    } catch (error) {
      logger.error(`Error triggering Lambda function ${functionName}:`, error);
      return {
        success: false,
        error: error instanceof Error ? error : String(error),
      };
    }
  }

  /**
   * Specifically for triggering content generation Lambda
   * @param jobId Unique job identifier
   * @returns Promise resolving to true if successfully triggered, false otherwise
   */
  public async triggerContentGeneration(data: object, type: TYPE_PROMPT): Promise<boolean> {
    return this.triggerAsync('gen-content-lambda', {
      data,
      type,
    });
  }

  /**
   * Specifically for triggering content generation Lambda
   * @param jobId Unique job identifier
   * @returns Promise resolving to true if successfully triggered, false otherwise
   */
  public async triggerContentGenerationSync(data: object, type: TYPE_PROMPT): Promise<any> {
    return this.triggerSync('gen-content-lambda', {
      data,
      type,
    });
  }
}

// Export singleton instance
export const lambdaService = new LambdaService();
