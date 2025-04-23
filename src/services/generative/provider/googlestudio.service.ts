import OpenAI from 'openai';

const API_KEY_GOOGLE_STUDIO = process.env.GOOGLE_STUDIO_API_KEY;

const DEFAULT_MODEL = 'gemini-2.0-flash';
const URL_API_GOOGLE_STUDIO = 'https://generativelanguage.googleapis.com/v1beta/openai/';

const openai = new OpenAI({
  apiKey: API_KEY_GOOGLE_STUDIO,
  baseURL: URL_API_GOOGLE_STUDIO,
});

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
