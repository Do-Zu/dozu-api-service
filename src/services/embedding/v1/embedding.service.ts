import { BadRequest } from '@/core/error';
import { BaseEmbeddingService } from './base';
import { IEmbeddingStrategy } from './BaseEmbeddingStrategy';
import { EmbeddingInput } from './embedding.type';
import { youtubeEmbeddingService } from './strategies/YoutubeEmbeddingStrategy';

class EmbeddingService extends BaseEmbeddingService {
    private strategies: IEmbeddingStrategy[] = [];

    constructor() {
        super();
        this.initializeStrategies();
    }

    private initializeStrategies() {
        this.strategies = [youtubeEmbeddingService];
    }

    /**
     * Generate embedding using appropriate strategy
     */
    public async generateEmbedding(payload: EmbeddingInput): Promise<any> {
        const strategy = this.strategies.find(s => s.canHandle(payload));

        if (!strategy) throw new BadRequest('Strategy Unavailable');

        if (!this.validateInput(payload)) {
            throw new BadRequest('Payload Unexpected');
        }

        const result = await strategy.process(payload);

        return result;
    }

    /**
     * Validate input
     */
    protected validateInput(payload: EmbeddingInput): boolean {
        if (payload) return true;

        return false;
    }
}

export const embeddingService = new EmbeddingService();
