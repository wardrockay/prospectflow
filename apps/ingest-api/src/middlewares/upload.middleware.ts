/**
 * Upload Middleware - Multer configuration for CSV file uploads
 */
import multer from 'multer';
import { Request } from 'express';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('UploadMiddleware');

// Store in memory for validation before persisting
const storage = multer.memoryStorage();

/**
 * File filter to accept only CSV files
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  const isValidType = file.mimetype === 'text/csv' || file.originalname.endsWith('.csv');

  if (isValidType) {
    logger.debug({ filename: file.originalname, mimetype: file.mimetype }, 'File accepted');
    cb(null, true);
  } else {
    logger.warn(
      { filename: file.originalname, mimetype: file.mimetype },
      'File rejected - invalid type',
    );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    cb(
      new Error('Only CSV files are allowed. Please upload a file with .csv extension.') as any,
      false,
    );
  }
};

/**
 * Multer middleware configured for CSV uploads
 * - Memory storage (max 5MB)
 * - CSV files only
 */
export const uploadCsv = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});
