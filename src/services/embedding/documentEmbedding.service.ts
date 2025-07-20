import { wordFrequencyRedis } from '@/libs/redis/wordFrequency/redisWordFrequency';
import { extractTerms } from './utils/textProcessing';
import { sql } from 'drizzle-orm';
import db from '@/libs/drizzleClient.lib';
import { embeddingGenerator } from './utils/embeddingGenerator';
import { topicsTable } from '@/models';
import { cosineSimilarity, similarityFilter } from '@/utils/pgvector';

export class DocumentEmbeddingService {
  private static instance: DocumentEmbeddingService;

  public static getInstance(): DocumentEmbeddingService {
    if (!DocumentEmbeddingService.instance) {
      DocumentEmbeddingService.instance = new DocumentEmbeddingService();
    }
    return DocumentEmbeddingService.instance;
  }

  /**
   * Update global word frequency counts in Redis
   */
  private async updateGlobalWordFrequencies(document: string): Promise<void> {
    const { terms } = extractTerms(document);
    await wordFrequencyRedis.incrementTermFrequencies(terms);
  }

  /**
   * Calculate TF-IDF weights for a document
   */
  private async calculateTfIdfWeights(document: string): Promise<Record<string, number>> {
    const { termFrequency } = extractTerms(document);
    const terms = Object.keys(termFrequency);

    // Get document frequencies from Redis
    const documentFrequencies = await wordFrequencyRedis.getTermFrequencies(terms);
    const totalDocuments = await wordFrequencyRedis.getDocumentCount();

    // Calculate TF-IDF
    const tfidf: Record<string, number> = {};
    const docLength = terms.length;

    for (const term of terms) {
      // Term frequency in current document (normalized by doc length)
      const tf = termFrequency[term] / docLength;

      // Inverse document frequency
      const df = documentFrequencies[term] || 0;
      const idf = Math.log((totalDocuments + 1) / (df + 1));

      // TF-IDF weight
      tfidf[term] = tf * idf;
    }

    return tfidf;
  }

  /**
   * Generate embeddings using our TF-IDF approach
   * @param text Text to generate embeddings for
   * @returns 384-dimensional vector
   */
  private async generateEmbedding(text: string): Promise<number[]> {
    try {
      return await embeddingGenerator.generateEmbedding(text);
    } catch (error) {
      console.error('Failed to generate embedding:', error);
      // Fallback to a consistent but simple embedding
      return embeddingGenerator.generateFallbackEmbedding(text);
    }
  }

  /**
   * Process a document: update word frequencies, generate embedding, and store in PostgreSQL
   */
  public async processDocument(document: {
    userId: number;
    topicId?: number;
    title: string;
    description?: string;
    content: string;
  }): Promise<number> {
    // Update global word frequencies
    await this.updateGlobalWordFrequencies(document.content);

    // Generate embeddings (using content and title for better representation)
    const textToEmbed = `${document.title} ${document.description || ''} ${document.content}`;

    //Generate embedding using the embedding generator
    const embedding = await this.generateEmbedding(textToEmbed);

    //  Store document with embedding in PostgreSQL
    // const result = await db
    //   .update(topicsTable)
    //   .set({
    //     embedding,
    //   })
    //   .where(sql`${topicsTable.topicId} = ${document.topicId}`);

    const rs = await db.insert(topicsTable).values({
      name: document.title,
      description: document.description,
      userId: document.userId,
      embedding,
    });

    if (!rs.rowCount) return -1;

    return rs.rowCount;
  }

  /**
   * Find similar documents based on content similarity
   */ public async findSimilarDocuments(queryText: string, limit: number = 10): Promise<any[]> {
    // Generate embedding for the query text
    const queryEmbedding = await this.generateEmbedding(queryText);

    // Use optimized pgvector query with HNSW index
    const result = await db.execute(sql`
    SELECT 
      topic_id as "topicId",
      name,
      description, 
      ${cosineSimilarity('embedding', queryEmbedding)} as similarity
    FROM topics
    WHERE ${similarityFilter('embedding', queryEmbedding, 0.1)}
    ORDER BY similarity DESC
    LIMIT ${limit}
  `);

    return result.rows;
  }
}

export const documentEmbeddingService = DocumentEmbeddingService.getInstance();
