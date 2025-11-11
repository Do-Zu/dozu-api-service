import { BadRequest } from '@/core/error';
import { BaseEmbeddingService } from './base';
import { IEmbeddingStrategy } from './BaseEmbeddingStrategy';
import { EmbeddingInput, IQuerySimilarity } from './embedding.type';
import { youtubeEmbeddingService } from './strategies/YoutubeEmbeddingStrategy';
import { IReturnItemQuery } from '@/repositories/embedding/embedding.repo';

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
    public override async generateEmbedding(payload: EmbeddingInput): Promise<any> {
        const strategy = this.strategies.find(s => s.canHandle(payload?.type));

        if (!strategy) throw new BadRequest('Strategy Unavailable');

        if (!this.validateInput(payload)) {
            throw new BadRequest('Payload Unexpected');
        }

        const result = await strategy.process(payload);

        return result;
    }

    public override async queryTopSimilarity(payload: IQuerySimilarity): Promise<IReturnItemQuery[]> {
        const { type } = payload;

        const strategy = this.strategies.find(s => s.canHandle(type));

        if (!strategy) throw new BadRequest('Strategy Unavailable');

        const result = await strategy.queryTopSimilarity(payload);

        return result;
    }

    /**
     * Validate input
     */
    protected override validateInput(payload: EmbeddingInput): boolean {
        if (payload) return true;

        return false;
    }
}

export const embeddingService = new EmbeddingService();
