import axios from 'axios';
import { HTTP_STATUS } from '@/constants/index.constant';
import { BadRequest, ServiceUnavailable } from '@/core/error';
import { CompareEmbeddingRequest, CompareEmbeddingResponse } from '../types/embedding.type';
import logger from '@/utils/logger';

export const BASE_API_EMBEDDING_SERVICE = process.env.EMBEDDING_API_URL;

class EmbeddingApiService {
    private baseUrl: string;
    private DEFAULT_TIMEOUT = 30000; // 30 seconds

    constructor() {
        this.baseUrl = BASE_API_EMBEDDING_SERVICE || '';

        if (!this.baseUrl) {
            logger.error('Missing EMBEDDING_API_URL environment variable');
        }
    }

    /**
     * Compare embeddings between pattern and query
     * @param request CompareEmbeddingRequest
     * @returns CompareEmbeddingResponse
     */
    async compareEmbedding(request: CompareEmbeddingRequest): Promise<CompareEmbeddingResponse> {
        try {
            const { pattern, query } = request;

            if (!pattern || !query) {
                throw new BadRequest('Pattern and query are required');
            }

            const url = `${this.baseUrl}/embedding/compare`;

            const { data } = await axios.post<CompareEmbeddingResponse>(
                url,
                {
                    pattern,
                    query,
                },
                {
                    timeout: this.DEFAULT_TIMEOUT,
                }
            );

            return data;
        } catch (error) {
            if (axios.isAxiosError(error)) {
                logger.error('EmbeddingApiService: compareEmbedding axios error', {
                    message: error.message,
                    status: error.response?.status,
                    data: error.response?.data,
                });

                if (error.response) {
                    throw new ServiceUnavailable(
                        `Embedding service error: ${error.response.statusText || 'Unknown error'}`
                    );
                } else if (error.request) {
                    throw new ServiceUnavailable('Unable to reach embedding service');
                }
            }

            logger.error('EmbeddingApiService: compareEmbedding error', error);
            throw error;
        }
    }
}

export const embeddingApiService = new EmbeddingApiService();
