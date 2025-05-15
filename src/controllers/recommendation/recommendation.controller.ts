import { Request, Response } from 'express';
import { recommendationService } from '@/services/recommendation/recommendation.service';
import { SuccessResponse } from '@/core/success';
import { BadRequest } from '@/core/error';

/**
 * Controller class for Recommendation functionality
 */
class RecommendationController {
  /**
   * Get content-based recommendations based on user interests
   * @param req Request object with userInterest in query params
   * @param res Response object
   */
  public async testContentBasedRecommendations(req: Request, res: Response) {
    const { userInterest, limit = '2', excludeIds = '' } = req.query;

    if (!userInterest || typeof userInterest !== 'string') {
      throw new BadRequest('User interest is required and must be a string');
    }

    // Parse limit and excludeIds
    const parsedLimit = parseInt(limit as string, 10) || 5;
    const parsedExcludeIds = excludeIds
      ? (excludeIds as string).split(',').map(id => {
          // Try to parse as number first, if fails, keep as string
          const parsed = parseInt(id, 10);
          return isNaN(parsed) ? id : parsed;
        })
      : [];

    const recommendations = recommendationService.getContentBasedRecommendations(
      userInterest,
      parsedLimit,
      parsedExcludeIds
    );

    SuccessResponse.ok(res, recommendations);
  }
}

export const recommendationController = new RecommendationController();
