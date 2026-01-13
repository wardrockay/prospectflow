import { AppError } from './AppError.js';

export class ValidationError extends AppError {
  public readonly fieldErrors?: Record<string, string[]>;

  constructor(message: string, fieldErrors?: Record<string, string[]>) {
    super(message, 400);
    this.name = 'ValidationError';
    this.fieldErrors = fieldErrors;
  }
}
