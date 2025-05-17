/**
 * Utility functions for working with pgvector
 */

import { SQLWrapper } from 'drizzle-orm';
import { sql } from 'drizzle-orm';

/**
 * Converts a JavaScript array to a PostgreSQL vector string for use in SQL
 * @param vector Array of numbers representing a vector
 * @returns SQL fragment for a cast vector
 */
export function toVectorSql(vector: number[]): SQLWrapper {
  // Convert the array to a string representation for PostgreSQL
  const vectorString = `[${vector.join(',')}]`;

  // Return as SQL with proper casting
  return sql`(${vectorString}::vector)`;
}

/**
 * Calculate cosine similarity between two vectors
 * @param columnName Name of the vector column
 * @param vector Array of numbers to compare against
 * @returns SQL fragment for calculating similarity
 */
export function cosineSimilarity(columnName: string, vector: number[]): SQLWrapper {
  return sql`(1 - (${sql.identifier(columnName)} <=> ${toVectorSql(vector)}))`;
}

/**
 * SQL fragment for filtering by similarity threshold
 * @param columnName Name of the vector column
 * @param vector Array of numbers to compare against
 * @param threshold Minimum similarity threshold (0-1)
 * @returns SQL fragment for the WHERE clause
 */
export function similarityFilter(
  columnName: string,
  vector: number[],
  threshold: number
): SQLWrapper {
  return sql`${cosineSimilarity(columnName, vector)} > ${threshold}`;
}
