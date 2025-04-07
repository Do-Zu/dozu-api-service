import { Response, Request } from 'express';
import { SuccessResponse } from '@/core/success';
import { handleServiceDemo } from '@/services/demo.service';

export const handleDemoController = async (req: Request, res: Response) => {
  const data = await handleServiceDemo(req.body);
  SuccessResponse.ok(res, data);
};
