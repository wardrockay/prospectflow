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
   * Send error response
   * @deprecated Use error middleware instead - throw AppError and let errorHandler catch it
   * @example
   * // Don't use: this.sendError(res, 'Error', 400)
   * // Instead: throw new ValidationError('Error message')
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
