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
 * File filter to accept CSV and XLSX files
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback,
): void => {
  const isValidType =
    file.mimetype === 'text/csv' ||
    file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
    file.originalname.match(/\.(csv|xlsx)$/i);

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
      new Error('Format non supporté. Formats acceptés : CSV, Excel (.xlsx)') as any,
      false,
    );
  }
};

/**
 * Multer middleware configured for CSV and XLSX uploads
 * - Memory storage (max 50MB)
 * - CSV and XLSX files only
 */
export const uploadCsv = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB
  },
});
