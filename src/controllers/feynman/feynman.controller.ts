import { Request, Response } from 'express';
import { feynmanService } from '@/services/feynman/feynman.service';
import { SuccessResponse } from '@/core/success';

/**
 * Controller class for Feynman functionality
 */
class FeynmanController {


  // FeynmanDemoController  async (req: Request, res: Response) => {
  // const data = null;
  // SuccessResponse.ok(res, data);
};

export const feynmanController = new FeynmanController();

