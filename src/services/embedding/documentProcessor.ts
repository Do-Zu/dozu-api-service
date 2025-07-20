import { documentEmbeddingService } from './documentEmbedding.service';

/**
 * Process a batch of documents and generate embeddings
 */
export async function processBulkDocuments(
  documents: Array<{
    userId: number;
    topicId?: number;
    title: string;
    description?: string;
    contentType?: string;
    content: string;
    metadata?: Record<string, any>;
  }>
): Promise<number[]> {
  // Process documents in batches to avoid overwhelming services
  const batchSize = 10;
  const results: number[] = [];

  for (let i = 0; i < documents.length; i += batchSize) {
    const batch = documents.slice(i, i + batchSize);
    const promises = batch.map(doc => documentEmbeddingService.processDocument(doc));
    const batchResults = await Promise.all(promises);

    results.push(...batchResults);
  }

  return results;
}

/**
 * Process a single document and generate embeddings
 */
export function processDocument(document: {
  userId: number;
  topicId?: number;
  title: string;
  description?: string;
  contentType?: string;
  content: string;
  metadata?: Record<string, object>;
}): Promise<number> {
  return documentEmbeddingService.processDocument(document);
}

/**
 * Find similar documents based on text query
 */
export function findSimilarDocuments(queryText: string, limit: number = 10): Promise<any[]> {
  return documentEmbeddingService.findSimilarDocuments(queryText, limit);
}
