// tests/unit/controllers/prospects.controller.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProspectsController } from '../../../src/controllers/prospects.controller.js';
import { prospectsService } from '../../../src/services/prospects.service.js';
import { Request, Response, NextFunction } from 'express';

// Mock du service
vi.mock('../../../src/services/prospects.service.js', () => ({
  prospectsService: {
    handleUpload: vi.fn(),
    generateTemplate: vi.fn(),
  },
}));

describe('ProspectsController', () => {
  let prospectsController: ProspectsController;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    prospectsController = new ProspectsController();

    mockReq = {
      params: { campaignId: 'campaign-123' },
      file: {
        originalname: 'prospects.csv',
        size: 2048,
        buffer: Buffer.from('company_name,contact_email\nAcme,test@acme.com'),
        mimetype: 'text/csv',
      } as Express.Multer.File,
      organisationId: 'org-123',
    };

    mockRes = {
      status: vi.fn().mockReturnThis(),
      json: vi.fn(),
      setHeader: vi.fn(),
      send: vi.fn(),
    };

    mockNext = vi.fn();
    vi.clearAllMocks();
  });

  describe('uploadCsv', () => {
    it('should return 201 with upload metadata when successful', async () => {
      // Arrange
      const mockUploadResult = {
        uploadId: 'upload-456',
        filename: 'prospects.csv',
        fileSize: 2048,
        rowCount: 1,
        uploadedAt: '2026-01-14T10:00:00Z',
      };

      vi.mocked(prospectsService.handleUpload).mockResolvedValue(mockUploadResult);

      // Act
      await prospectsController.uploadCsv(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(prospectsService.handleUpload).toHaveBeenCalledWith(
        'campaign-123',
        'org-123',
        mockReq.file,
      );
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: true,
        data: mockUploadResult,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 400 when no file is provided', async () => {
      // Arrange
      mockReq.file = undefined;

      // Act
      await prospectsController.uploadCsv(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'No file uploaded',
      });
      expect(prospectsService.handleUpload).not.toHaveBeenCalled();
    });

    it('should return 401 when organisationId is missing', async () => {
      // Arrange
      mockReq.organisationId = undefined;

      // Act
      await prospectsController.uploadCsv(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        success: false,
        error: 'Unauthorized - Organisation ID missing',
      });
      expect(prospectsService.handleUpload).not.toHaveBeenCalled();
    });

    it('should call next with error when service fails', async () => {
      // Arrange
      const mockError = new Error('Campaign not found');
      vi.mocked(prospectsService.handleUpload).mockRejectedValue(mockError);

      // Act
      await prospectsController.uploadCsv(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });

  describe('downloadTemplate', () => {
    it('should return CSV template with correct headers', async () => {
      // Arrange
      const mockTemplate =
        'company_name,contact_email,contact_name,website_url\nAcme Corp,sarah@acmecorp.com,Sarah Johnson,https://acmecorp.com';
      vi.mocked(prospectsService.generateTemplate).mockResolvedValue(mockTemplate);

      // Act
      await prospectsController.downloadTemplate(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(mockRes.setHeader).toHaveBeenCalledWith('Content-Type', 'text/csv');
      expect(mockRes.setHeader).toHaveBeenCalledWith(
        'Content-Disposition',
        'attachment; filename="prospect_import_template.csv"',
      );
      expect(mockRes.send).toHaveBeenCalledWith(mockTemplate);
    });

    it('should call next with error when template generation fails', async () => {
      // Arrange
      const mockError = new Error('Template generation failed');
      vi.mocked(prospectsService.generateTemplate).mockRejectedValue(mockError);

      // Act
      await prospectsController.downloadTemplate(
        mockReq as Request,
        mockRes as Response,
        mockNext as NextFunction,
      );

      // Assert
      expect(mockNext).toHaveBeenCalledWith(mockError);
    });
  });
});
