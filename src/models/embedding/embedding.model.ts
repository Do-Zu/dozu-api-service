import { pgTable, serial, integer, text, timestamp, vector, jsonb, index, varchar } from 'drizzle-orm/pg-core';
import { topicsTable } from '@/models/topic/topic.model';

export const embeddingsTable = pgTable(
    'embeddings',
    {
        embeddingId: serial('embedding_id').primaryKey(),

        topicId: integer('topic_id')
            .notNull()
            .references(() => topicsTable.topicId, { onDelete: 'cascade' }),

        // 384 dimensions for sentence-transformers, adjust if using different model
        embedding: vector('embedding', { dimensions: 384 }).notNull(),

        // Original content chunk that was embedded
        originContent: jsonb('origin_content').notNull().$type<{
            type: string;
            content: string;
        }>(),

        contentType: varchar('content_type', { length: 50 }).notNull(), // Content type: 'document', 'video', 'audio', 'youtube'

        // sourceIdentifier: text('source_identifier'), // Source identifier (file path, YouTube URL, etc.)

        // Flexible metadata for different content types
        // For video/audio: { startTime, endTime, duration, index }
        // For documents: { pageIndex, lineStart, lineEnd }
        // For YouTube: { startTime, etc }
        metadata: jsonb('metadata').notNull().default('{}'),

        // Chunk sequence number within the source
        chunkIndex: integer('chunk_index').notNull().default(0),

        // Optional: Store hash of origin_text for deduplication
        // contentHash: varchar('content_hash', { length: 64 }),

        createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
        updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
    },
    table => ({
        // Index for vector similarity search (HNSW)
        embeddingIdx: index('embedding_vector_idx').using('hnsw', table.embedding.op('vector_cosine_ops')),

        // Index for topic-based queries
        topicIdIdx: index('embeddings_topic_id_idx').on(table.topicId),
    })
);

export type OriginContent = {
    type: 'text' | 'image' | 'audio';
    content: string;
};

export type TypeMetaDataChunkEmbed = Record<string, string | number | object | Array<unknown>>;
