import { GenerateContentRequestInterface, GenerateContentResponseInterface } from '@/dtos/generate';
import { BaseGenerativeService } from '../base/base.abstract';

class GenerateService extends BaseGenerativeService {
    public registerGenerateContentByLLM(
        // eslint-disable-next-line no-unused-vars, @typescript-eslint/no-unused-vars
        requestData: GenerateContentRequestInterface
    ): Promise<GenerateContentResponseInterface> {
        throw new Error('Method not implemented.');
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, no-unused-vars
    protected generateContentByLLMBackGround(content: string): Promise<unknown> {
        throw new Error('Method not implemented.');
    }

    /**
     * Stream generate content using LLM
     * Delegates to the base class streamGenerateContent generator
     *
     * @param payload The generation request payload
     * @yields Stream packets with status and data
     */
    public async *streamGenerate(
        payload: GenerateContentRequestInterface
    ): AsyncGenerator<{ status: string; data: string }, void, unknown> {
        yield* this.streamGenerateContent(payload);
    }
}

export const generateService = new GenerateService();
