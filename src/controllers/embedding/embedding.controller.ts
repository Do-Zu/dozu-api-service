import { SuccessResponse } from '@/core/success';
import { embeddingService } from '@/services/embedding/v1/embedding.service';
import { EmbeddingInput, IQuerySimilarity } from '@/services/embedding/v1/embedding.type';
import { Request, Response } from 'express';

class EmbeddingController {
    public processEmbedding = async (req: Request, res: Response) => {
        const payload = req.body as EmbeddingInput;

        const result = await embeddingService.generateEmbedding(payload);

        SuccessResponse.ok(res, result);
    };

    public queryTopSimilarity = async (req: Request, res: Response) => {
        const payload = req.body as IQuerySimilarity;

        const result = await embeddingService.queryTopSimilarity(payload);

        SuccessResponse.ok(res, result);
    };
}

export const embeddingController = new EmbeddingController();
