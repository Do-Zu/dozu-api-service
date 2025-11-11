import { Request, Response } from 'express';
import { contentService } from '@/services/content/content.service';
import { SuccessResponse } from '@/core/success';

/**
 * Controller class for Content functionality
 */
class ContentController {


  // ContentDemoController  async (req: Request, res: Response) => {
  // const data = null;
  // SuccessResponse.ok(res, data);
};

export const contentController = new ContentController();

