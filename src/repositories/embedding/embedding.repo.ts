import db from '@/libs/drizzleClient.lib';
import type { InferInsertModel } from 'drizzle-orm';
import { embeddingsTable, TypeMetaDataChunkEmbed } from '@/models/embedding/embedding.model';
import { sql, eq, desc } from 'drizzle-orm';

export type NewEmbedding = Pick<
    InferInsertModel<typeof embeddingsTable>,
    'topicId' | 'embedding' | 'originContent' | 'contentType' | 'metadata' | 'chunkIndex'
>;
export interface ReturnColumnEmbedding {
    embeddingId: number;
    topicId: number;
    contentType: string;
    originContent: TypeMetaDataChunkEmbed;
    metadata: unknown;
    createdAt: Date;
}

export interface IReturnItemQuery extends ReturnColumnEmbedding {
    similarity: number;
}

const DEFAULT_TOP_K = 5;
class EmbeddingRepo {
    /**
     * Insert multiple embeddings in batch (more efficient)
     */
    public async insertEmbeddingsBatch(data: NewEmbedding[]): Promise<ReturnColumnEmbedding[]> {
        const results = await db.insert(embeddingsTable).values(data).returning({
            embeddingId: embeddingsTable.embeddingId,
            topicId: embeddingsTable.topicId,
            contentType: embeddingsTable.contentType,
            originContent: embeddingsTable.originContent,
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

    /**
     * Find top K similar embeddings using cosine similarity
     * @param queryEmbedding - The embedding vector to compare against
     * @param topicId - Filter by topic ID
     * @param topK - Number of similar results to return
     * @param contentType - Optional filter by content type
     */
    public async findSimilarEmbeddings({
        queryEmbedding,
        topicId,
        topK = DEFAULT_TOP_K,
    }: {
        queryEmbedding: number[];
        topicId: number;
        topK: number;
    }): Promise<
        Array<{
            embeddingId: number;
            topicId: number;
            originContent: unknown;
            contentType: string;
            metadata: unknown;
            chunkIndex: number;
            similarity: number;
            createdAt: Date;
        }>
    > {
        const embeddingVector = JSON.stringify(queryEmbedding);

        // Base query with similarity calculation
        let query = db
            .select({
                embeddingId: embeddingsTable.embeddingId,
                topicId: embeddingsTable.topicId,
                originContent: embeddingsTable.originContent,
                contentType: embeddingsTable.contentType,
                metadata: embeddingsTable.metadata,
                chunkIndex: embeddingsTable.chunkIndex,
                createdAt: embeddingsTable.createdAt,
                // Calculate cosine similarity: 1 - cosine_distance
                similarity: sql<number>`1 - (${embeddingsTable.embedding} <=> ${embeddingVector}::vector)`,
            })
            .from(embeddingsTable)
            .where(eq(embeddingsTable.topicId, topicId));

        const results = await query
            .orderBy(desc(sql`1 - (${embeddingsTable.embedding} <=> ${embeddingVector}::vector)`))
            .limit(topK);

        return results;
    }

    /**
     * Find similar embeddings across all topics (without topic filter)
     */
    public async findSimilarEmbeddingsGlobal(
        queryEmbedding: number[],
        topK: number = DEFAULT_TOP_K
    ): Promise<IReturnItemQuery[]> {
        const embeddingVector = JSON.stringify(queryEmbedding);

        let query = db
            .select({
                embeddingId: embeddingsTable.embeddingId,
                topicId: embeddingsTable.topicId,
                originContent: embeddingsTable.originContent,
                contentType: embeddingsTable.contentType,
                metadata: embeddingsTable.metadata,
                chunkIndex: embeddingsTable.chunkIndex,
                createdAt: embeddingsTable.createdAt,
                similarity: sql<number>`1 - (${embeddingsTable.embedding} <=> ${embeddingVector}::vector)`,
            })
            .from(embeddingsTable);

        const results = await query
            .orderBy(desc(sql`1 - (${embeddingsTable.embedding} <=> ${embeddingVector}::vector)`))
            .limit(topK);

        return results;
    }
}

export const embeddingRepo = new EmbeddingRepo();
