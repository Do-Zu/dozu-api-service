import db from '@/libs/drizzleClient.lib';
import type { InferInsertModel } from 'drizzle-orm';
import { embeddingsTable } from '@/models/embedding/embedding.model';

export type NewEmbedding = Pick<
    InferInsertModel<typeof embeddingsTable>,
    'topicId' | 'embedding' | 'originContent' | 'contentType' | 'metadata' | 'chunkIndex'
>;

class EmbeddingRepo {
    /**
     * Insert multiple embeddings in batch (more efficient)
     */
    public async insertEmbeddingsBatch(data: NewEmbedding[]) {
        const results = await db.insert(embeddingsTable).values(data).returning({
            embeddingId: embeddingsTable.embeddingId,
            topicId: embeddingsTable.topicId,
            contentType: embeddingsTable.contentType,
            metadata: embeddingsTable.metadata,
            createdAt: embeddingsTable.createdAt,
        });

        return results;
    }

    /**
     * Insert embedding
     */
    public async insertEmbedding({
        topicId,
        embedding,
        originContent,
        contentType,
        metadata,
        chunkIndex,
    }: NewEmbedding): Promise<typeof embeddingsTable.$inferSelect> {
        const results = await db
            .insert(embeddingsTable)
            .values({
                topicId,
                embedding,
                originContent,
                contentType,
                metadata,
                chunkIndex,
            })
            .returning();

        const row = results[0];

        if (!row) {
            throw new Error('Failed to insert embedding');
        }

        return row;
    }
}

export const embeddingRepo = new EmbeddingRepo();
