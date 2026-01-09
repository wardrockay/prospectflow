import { Request, Response, NextFunction } from 'express';

/**
 * Base Controller class with common controller patterns
 */
export class BaseController {
  /**
   * Send success response
   */
  protected sendSuccess(res: Response, data: any, statusCode: number = 200) {
    res.status(statusCode).json({
      status: 'success',
      data,
    });
  }

  /**
   * Send error response (should be handled by error middleware instead)
   */
  protected sendError(res: Response, message: string, statusCode: number = 500) {
    res.status(statusCode).json({
      status: 'error',
      message,
    });
  }

  /**
   * Wrap async handler to catch errors
   */
  protected asyncHandler(fn: (req: Request, res: Response, next: NextFunction) => Promise<void>) {
    return (req: Request, res: Response, next: NextFunction) => {
      Promise.resolve(fn(req, res, next)).catch(next);
    };
  }
}
