import { IVector, calculateTermFrequency } from '@/services/recommendation/utils/TF-IDF';
import { wordFrequencyRedis } from '@/libs/redis/wordFrequency/redisWordFrequency';
import { cleanText } from './textProcessing';

/**
 * Generate vector embeddings using TF-IDF with a fixed dimensionality
 */
export class EmbeddingGenerator {
  private static instance: EmbeddingGenerator;
  private readonly TARGET_DIMENSIONS = 384;
  private dimensionMap: Map<string, number> = new Map();
  private vocabularySize = 0;
  private isInitialized = false;

  private constructor() {}

  public static getInstance(): EmbeddingGenerator {
    if (!EmbeddingGenerator.instance) {
      EmbeddingGenerator.instance = new EmbeddingGenerator();
    }
    return EmbeddingGenerator.instance;
  }

  /**
   * Generate a fixed-dimension embedding from text using TF-IDF
   */
  public async generateEmbedding(text: string): Promise<number[]> {
    // Clean the input text
    const cleanedText = cleanText(text);

    // Extract terms with their frequencies
    const termFreqs = calculateTermFrequency(cleanedText, 2); // Use unigrams and bigrams

    // Get global document frequencies for the terms
    const terms = Object.keys(termFreqs);
    const documentFrequencies = await wordFrequencyRedis.getTermFrequencies(terms);
    const totalDocuments = (await wordFrequencyRedis.getDocumentCount()) || 1;

    // Calculate TF-IDF weights
    const tfidfWeights: IVector = {};

    for (const term of terms) {
      const tf = termFreqs[term];
      const df = documentFrequencies[term] || 0;
      const idf = Math.log((totalDocuments - df + 0.5) / (df + 0.5 + 1.0));
      tfidfWeights[term] = tf * idf;
    }

    // Create the fixed-dimension vector
    return this.createFixedDimensionVector(tfidfWeights);
  }

  /**
   * Create a fixed-dimension vector from TF-IDF weights using hash-based feature mapping
   * This approach handles cases where terms exceed available dimensions
   */
  private createFixedDimensionVector(tfidfWeights: IVector): number[] {
    // Initialize vector
    const vector = new Array(this.TARGET_DIMENSIONS).fill(0);

    // Get top terms by weight (to reduce noise)
    const sortedTerms = Object.entries(tfidfWeights)
      .sort((a, b) => b[1] - a[1])
      .slice(0, Math.min(1000, Object.keys(tfidfWeights).length)); // Limit to top 1000 terms

    // Use signed hash for improved distribution - reduces positive bias
    for (const [term, weight] of sortedTerms) {
      // Use multiple hash functions to reduce collision impact (feature hashing technique)
      const hash1 = this.hashString(term);
      const hash2 = this.hashString(term.split('').reverse().join(''));

      // Distribute a single term across two dimensions to reduce collision impact
      const dimension1 = Math.abs(hash1) % this.TARGET_DIMENSIONS;
      const dimension2 = Math.abs(hash2) % this.TARGET_DIMENSIONS;

      // Split weight between dimensions, with primary dimension getting more weight
      vector[dimension1] += weight * 0.7;
      vector[dimension2] += weight * 0.3;
    }

    // Apply dimensionality reduction to focus on most significant dimensions
    // This helps pgvector's indexing by reducing noise dimensions
    //const significantDimensions = this.getSignificantDimensions(vector, 0.01);

    // L2 normalization (essential for cosine similarity in pgvector)
    const magnitude = Math.sqrt(vector.reduce((sum, value) => sum + value * value, 0));
    if (magnitude > 0) {
      for (let i = 0; i < vector.length; i++) {
        vector[i] = vector[i] / magnitude;
      }
    }

    return vector;
  }

  /**
   * Keep only significant dimensions above threshold to reduce noise
   */
  private getSignificantDimensions(vector: number[], threshold: number): number[] {
    const result = [...vector];
    const absThreshold = threshold * Math.max(...vector.map(v => Math.abs(v)));

    for (let i = 0; i < result.length; i++) {
      if (Math.abs(result[i]) < absThreshold) {
        result[i] = 0;
      }
    }

    return result;
  }

  /**
   * Improved string hashing function with better distribution properties
   */
  private hashString(str: string): number {
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;

    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ char, 2654435761);
      h2 = Math.imul(h2 ^ char, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 = Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 = Math.imul(h2 ^ (h2 >>> 13), 3266489909);

    return 4294967296 * (2097151 & h2) + (h1 >>> 0);
  }

  /**
   * Fallback method to generate a random but consistent embedding when no data is available
   */
  public generateFallbackEmbedding(text: string): number[] {
    // Create a simple hash of the text to seed a random generator
    const hash = Array.from(text).reduce((acc, char) => {
      return (acc << 5) - acc + char.charCodeAt(0);
    }, 0);

    // Generate pseudo-random but consistent vector based on the hash
    const vector = new Array(this.TARGET_DIMENSIONS).fill(0);
    for (let i = 0; i < this.TARGET_DIMENSIONS; i++) {
      // Use a simple PRNG based on the hash
      const value = Math.sin(hash * (i + 1)) * 10000;
      vector[i] = value - Math.floor(value);
    }

    // Normalize the vector
    const magnitude = Math.sqrt(vector.reduce((sum, val) => sum + val * val, 0));
    return vector.map(val => val / magnitude);
  }
}

export const embeddingGenerator = EmbeddingGenerator.getInstance();
