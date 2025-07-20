import { BaseLLMProvider } from './baseLLM.abstract';

export abstract class LLMService {
  protected provider: BaseLLMProvider;

  constructor(provider: BaseLLMProvider) {
    this.provider = provider;
  }

  /**
   * Abstract generate
   */
  //   protected abstract generate(
  //     prompt: string,
  //     config?: object
  //   ): Promise<string | Array<any> | object | undefined | null>;
}
