import { Response, Request, NextFunction } from 'express';
import { HTTP_STATUS } from '@/constants/index.constant';

interface IApiResponse<T = any> {
  status: string;
  message: string;
  data?: T;
}

declare global {
  namespace Express {
    interface Response {
      success: <T>(data: T, message?: string) => Response;
      created: <T>(data: T, message?: string) => Response;
      noContent: () => Response;
    }
  }
}

/**
 * Success response formatter
 * Creates standardized success responses with proper status codes
 */
export class SuccessResponse {
  /**
   * Send an OK (200) response
   */
  public static ok<T>(res: Response, data: T, message = 'Success'): Response {
    const response: IApiResponse<T> = {
      status: 'success',
      message,
      data,
    };
    return res.status(HTTP_STATUS.OK).json(response);
  }

  /**
   * Send a Created (201) response
   */
  public static created<T>(
    res: Response,
    data: T,
    message = 'Resource created successfully'
  ): Response {
    const response: IApiResponse<T> = {
      status: 'success',
      message,
      data,
    };
    return res.status(HTTP_STATUS.CREATED).json(response);
  }

  /**
   * Send a No Content (204) response
   */
  public static noContent(res: Response): Response {
    return res.status(HTTP_STATUS.NO_CONTENT).send();
  }
}

const successHandler = (_req: Request, res: Response, next: NextFunction): void => {
  res.success = <T>(data: T, message?: string) => SuccessResponse.ok(res, data, message);
  res.created = <T>(data: T, message?: string) => SuccessResponse.created(res, data, message);
  res.noContent = () => SuccessResponse.noContent(res);
  next();
};

export default successHandler;
