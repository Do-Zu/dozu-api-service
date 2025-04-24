import logger from '@/utils/logger';
import OpenAI from 'openai';

const API_KEY_GOOGLE_STUDIO = process.env.GOOGLE_STUDIO_API_KEY;
const DEFAULT_MODEL = 'gemini-2.0-flash';
const URL_API_GOOGLE_STUDIO = 'https://generativelanguage.googleapis.com/v1beta/openai/';

let openai: OpenAI | null = null;

function getGoogleStudioClient(): OpenAI | null {
  if (!API_KEY_GOOGLE_STUDIO) {
    logger.warn('Google Studio API key is not set. Service will be unavailable.');
    return null;
  }

  if (!URL_API_GOOGLE_STUDIO) {
    logger.warn('Google Studio base URL is not set. Service will be unavailable.');
    return null;
  }

  try {
    return new OpenAI({
      apiKey: API_KEY_GOOGLE_STUDIO,
      baseURL: URL_API_GOOGLE_STUDIO,
    });
  } catch (error) {
    logger.error(
      `Failed to initialize Google Studio client: ${error instanceof Error ? error.message : String(error)}`
    );
    return null;
  }
}
/**
 * Generate content using Google Studio with streaming capability via OpenAI client
 * Processes response in chunks to handle downtime more effectively
 * @param prompt The prompt to generate content for
 * @param model The model to use for generation
 * @returns AsyncGenerator that yields content chunks
 */
export async function* streamContentFromGoogleStudio(
  prompt: string,
  model: string = DEFAULT_MODEL
): AsyncGenerator<string, void, unknown> {
  if (openai === null) {
    openai = getGoogleStudioClient();
  }

  if (!openai || !(openai instanceof OpenAI)) {
    logger.warn('Cannot stream content: Google Studio client is not available');
    yield 'Error: Google Studio service is currently unavailable.';
    return;
  }

  const mappedModel = model.replace('gemini-', 'gemini-');

  const stream = await openai.chat.completions.create({
    model: mappedModel,
    messages: [
      {
        role: 'system',
        content: 'You are an expert at creating educational content from academic content.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 8000,
    temperature: 0.1,
    stream: true,
    stream_options: {
      include_usage: true,
    },
  });

  for await (const chunk of stream) {
    const content = chunk.choices[0]?.delta?.content;
    if (content) {
      yield content;
    }
  }
}
