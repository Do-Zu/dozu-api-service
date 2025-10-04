import { calculateTFIDF, calculateCosineSimilarityVectors, IVector } from '../utils/TF-IDF';

interface Item {
  id: number | string;
  content: string;
}

export class ContentBasedFiltering {
  private itemVectors: Map<string | number, IVector> = new Map();
  private allDocuments: string[] = [];

  /**
   * Add items to the recommendation engine
   * @param items List of items with content to process
   */
  public addItems(items: Item[]): void {
    // Extract all documents for IDF calculation
    this.allDocuments = items.map(item => item.content);

    // Pre-compute TF-IDF vectors for all items
    for (const item of items) {
      const vector = calculateTFIDF(item.content, this.allDocuments);
      this.itemVectors.set(item.id, vector);
    }
  }

  /**
   * Get recommendations based on a user profile or item
   * @param contentProfile Content to base recommendations on (user interests or item)
   * @param limit Number of recommendations to return
   * @param excludeIds IDs to exclude from recommendations (e.g., already viewed items)
   * @returns Array of recommended item IDs with similarity scores
   */
  public getRecommendations(
    contentProfile: string,
    limit: number = 10,
    excludeIds: (string | number)[] = []
  ): { id: string | number; score: number }[] {
    // Calculate TF-IDF vector for the content profile
    const profileVector = calculateTFIDF(contentProfile, this.allDocuments);

    // Calculate similarity scores for all items
    const recommendations: { id: string | number; score: number }[] = [];

    for (const [itemId, itemVector] of this.itemVectors.entries()) {
      // Skip excluded items
      if (excludeIds.includes(itemId)) {
        continue;
      }

      // Calculate cosine similarity
      const similarity = calculateCosineSimilarityVectors(profileVector, itemVector);

      recommendations.push({
        id: itemId,
        score: similarity,
      });
    }

    // Sort by similarity score (descending) and limit results
    return recommendations.sort((a, b) => b.score - a.score).slice(0, limit);
  }
}
