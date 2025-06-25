import { BaseLLMProvider } from '../core/baseLLM.abstract';
import { LLMConfiguration } from '../core/llmConfiguration';
import { OpenAIService } from '../strategies/providers/openai/openai.service';

export class LLMStrategyFactory {
  static createStrategy(config: LLMConfiguration): BaseLLMProvider {
    const provider = config.provider.toLocaleLowerCase();

    switch (provider) {
      case 'openai':
        return new OpenAIService();
      case 'google':
        return new OpenAIService();
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }
}
