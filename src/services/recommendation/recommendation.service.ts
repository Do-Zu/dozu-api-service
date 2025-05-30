import { ContentBasedFiltering } from './algorithms/contentBasedFiltering.algorithm';

class RecommendationService {
  private contentBasedEngine: ContentBasedFiltering;

  private readonly mockItems = [
    { id: 1, content: 'Machine learning algorithms for classification and regression' },
    { id: 2, content: 'Deep learning neural networks for image recognition' },
    { id: 3, content: 'Natural language processing techniques for text analysis' },
    { id: 4, content: 'Statistical methods for data analysis' },
    { id: 5, content: 'Database optimization techniques for large datasets' },
    { id: 6, content: 'Mobile app development with React Native' },
    { id: 7, content: 'Web development frameworks comparison' },
    { id: 8, content: 'Cloud computing services overview' },
    { id: 9, content: 'Network security fundamentals and encryption' },
    { id: 10, content: 'Agile development methodology and scrum practices' },
  ];

  constructor() {
    // Initialize the content-based filtering engine
    this.contentBasedEngine = new ContentBasedFiltering();
    // Add mock items to the engine
    this.contentBasedEngine.addItems(this.mockItems);
  }

  /**
   * Get content-based recommendations based on user interests
   * @param userInterest String representing user interests
   * @param limit Maximum number of recommendations to return
   * @param excludeIds IDs to exclude from recommendations
   * @returns Object containing recommended items with similarity scores
   */
  public getContentBasedRecommendations(
    userInterest: string,
    limit: number = 5,
    excludeIds: (string | number)[] = []
  ) {
    // Get raw recommendations (only IDs and scores)
    const rawRecommendations = this.contentBasedEngine.getRecommendations(
      userInterest,
      limit,
      excludeIds
    );

    // Enrich recommendations with item details
    const enrichedRecommendations = rawRecommendations.map(rec => {
      const item = this.mockItems.find(i => i.id === rec.id);
      return {
        id: rec.id,
        content: item?.content || '',
        score: rec.score,
      };
    });

    return {
      userInterest,
      recommendations: enrichedRecommendations,
    };
  }
}

export const recommendationService = new RecommendationService();
