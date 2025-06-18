import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';

export const saveMindmapController = async (req: Request, res: Response) => {
  // const data = await handleServiceDemo(req.body);
  SuccessResponse.ok(res, { message: 'Mindmap running' });
};
