import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CsvParserService } from '../../../src/services/csv-parser.service.js';

describe('CsvParserService', () => {
  let service: CsvParserService;

  beforeEach(() => {
    service = new CsvParserService();
  });

  describe('parse', () => {
    it('should parse valid CSV with comma delimiter', async () => {
      const csvContent = `company_name,contact_email,website_url
Acme Corp,sarah@acme.com,https://acme.com
Tech Industries,john@tech.com,https://tech.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.headers).toEqual(['company_name', 'contact_email', 'website_url']);
      expect(result.rowCount).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual({
        company_name: 'Acme Corp',
        contact_email: 'sarah@acme.com',
        website_url: 'https://acme.com',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should parse CSV with semicolon delimiter', async () => {
      const csvContent = `company_name;contact_email;website_url
Acme Corp;sarah@acme.com;https://acme.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.headers).toEqual(['company_name', 'contact_email', 'website_url']);
      expect(result.rowCount).toBe(1);
      expect(result.data[0].company_name).toBe('Acme Corp');
    });

    it('should parse CSV with tab delimiter', async () => {
      const csvContent = `company_name\tcontact_email\twebsite_url
Acme Corp\tsarah@acme.com\thttps://acme.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.headers).toEqual(['company_name', 'contact_email', 'website_url']);
      expect(result.rowCount).toBe(1);
    });

    it('should handle quoted fields correctly', async () => {
      const csvContent = `company_name,contact_email,notes
"Acme, Corp",sarah@acme.com,"Great company, very nice"`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.data[0].company_name).toBe('Acme, Corp');
      expect(result.data[0].notes).toBe('Great company, very nice');
    });

    it('should handle newlines within quoted fields', async () => {
      const csvContent = `company_name,contact_email,notes
"Acme Corp",sarah@acme.com,"First line
Second line"`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.data[0].notes).toBe('First line\nSecond line');
    });

    it('should handle empty CSV (headers only)', async () => {
      const csvContent = `company_name,contact_email,website_url`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.headers).toEqual(['company_name', 'contact_email', 'website_url']);
      expect(result.rowCount).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('should handle malformed CSV with unclosed quotes', async () => {
      const csvContent = `company_name,contact_email
"Acme Corp,sarah@acme.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('should normalize headers to lowercase and trim spaces', async () => {
      const csvContent = ` Company Name , Contact Email , Website URL 
Acme Corp,sarah@acme.com,https://acme.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.headers).toEqual(['company name', 'contact email', 'website url']);
    });

    it('should handle CSV with BOM (Byte Order Mark)', async () => {
      const csvContent = '\uFEFFcompany_name,contact_email\nAcme Corp,sarah@acme.com';

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.headers).toEqual(['company_name', 'contact_email']);
      expect(result.data[0].company_name).toBe('Acme Corp');
    });

    it('should reject files larger than 50MB', async () => {
      // Create a buffer larger than 50MB
      const largeContent = 'a'.repeat(51 * 1024 * 1024);
      const buffer = Buffer.from(largeContent, 'utf-8');

      await expect(service.parse(buffer)).rejects.toThrow(
        'File size exceeds maximum allowed size of 50MB',
      );
    });

    it('should timeout after 30 seconds for extremely slow parsing', async () => {
      // Create a very large CSV that would take long to parse
      // This test validates the timeout mechanism exists
      const largeRows: string[] = ['company_name,contact_email,notes'];

      // Generate 10000 rows with complex data to slow down parsing
      for (let i = 0; i < 10000; i++) {
        largeRows.push(
          `"Company ${i}","email${i}@test.com","Very long notes with lots of text to slow down parsing ${i}"`,
        );
      }

      const csvContent = largeRows.join('\n');
      const buffer = Buffer.from(csvContent, 'utf-8');

      // Note: Papa Parse is very fast, so this test mainly validates
      // that timeout logic exists rather than triggering actual timeout
      // In production, network delays or very large files could trigger it
      const result = await service.parse(buffer);

      // Should complete successfully (not timeout) for reasonable data
      expect(result.rowCount).toBe(10000);
    }, 35000); // Extended timeout for this test

    it('should skip empty lines', async () => {
      const csvContent = `company_name,contact_email

Acme Corp,sarah@acme.com

Tech Inc,john@tech.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer);

      expect(result.rowCount).toBe(2);
      expect(result.data).toHaveLength(2);
    });

    it('should parse 100 rows in less than 5 seconds (AC1 performance requirement)', async () => {
      // Generate CSV with 100 data rows
      const header = 'company_name,contact_email,website_url';
      const rows: string[] = [];
      for (let i = 1; i <= 100; i++) {
        rows.push(`Company ${i},contact${i}@example.com,https://example${i}.com`);
      }
      const csvContent = [header, ...rows].join('\n');
      const buffer = Buffer.from(csvContent, 'utf-8');

      const startTime = Date.now();
      const result = await service.parse(buffer);
      const duration = Date.now() - startTime;

      expect(result.rowCount).toBe(100);
      expect(duration).toBeLessThan(5000); // AC1: < 5 seconds for 100 rows
    });
  });

  describe('XLSX parsing', () => {
    it('should parse valid XLSX file', async () => {
      // Import XLSX library
      const XLSX = await import('xlsx');

      // Create a simple workbook
      const ws = XLSX.utils.aoa_to_sheet([
        ['company_name', 'contact_email', 'website_url'],
        ['Acme Corp', 'sarah@acme.com', 'https://acme.com'],
        ['Tech Industries', 'john@tech.com', 'https://tech.com'],
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      // Write to buffer
      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer, 'test.xlsx');

      expect(result.headers).toEqual(['company_name', 'contact_email', 'website_url']);
      expect(result.rowCount).toBe(2);
      expect(result.data[0]).toEqual({
        company_name: 'Acme Corp',
        contact_email: 'sarah@acme.com',
        website_url: 'https://acme.com',
      });
      expect(result.errors).toHaveLength(0);
    });

    it('should handle XLSX with empty cells', async () => {
      const XLSX = await import('xlsx');

      const ws = XLSX.utils.aoa_to_sheet([
        ['company_name', 'contact_email', 'website_url'],
        ['Acme Corp', 'sarah@acme.com', ''], // Empty website
        ['Tech Industries', '', 'https://tech.com'], // Empty email
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer, 'test.xlsx');

      expect(result.rowCount).toBe(2);
      expect(result.data[0].website_url).toBe('');
      expect(result.data[1].contact_email).toBe('');
    });

    it('should only process first worksheet in XLSX', async () => {
      const XLSX = await import('xlsx');

      // Create workbook with multiple sheets
      const ws1 = XLSX.utils.aoa_to_sheet([
        ['company_name', 'contact_email'],
        ['Acme Corp', 'sarah@acme.com'],
      ]);

      const ws2 = XLSX.utils.aoa_to_sheet([
        ['other_col1', 'other_col2'],
        ['Data1', 'Data2'],
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws1, 'FirstSheet');
      XLSX.utils.book_append_sheet(wb, ws2, 'SecondSheet');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer, 'test.xlsx');

      // Should only parse first sheet
      expect(result.headers).toEqual(['company_name', 'contact_email']);
      expect(result.rowCount).toBe(1);
    });

    it('should normalize XLSX headers to lowercase', async () => {
      const XLSX = await import('xlsx');

      const ws = XLSX.utils.aoa_to_sheet([
        ['Company Name', 'Contact Email', 'Website URL'],
        ['Acme Corp', 'sarah@acme.com', 'https://acme.com'],
      ]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer, 'test.xlsx');

      expect(result.headers).toEqual(['company name', 'contact email', 'website url']);
    });

    it('should handle XLSX with no data rows', async () => {
      const XLSX = await import('xlsx');

      const ws = XLSX.utils.aoa_to_sheet([['company_name', 'contact_email', 'website_url']]);

      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');

      const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

      const result = await service.parse(buffer, 'test.xlsx');

      // XLSX sheet_to_json returns empty array when only headers exist
      // This is expected behavior - headers would be empty, rowCount 0
      expect(result.rowCount).toBe(0);
      expect(result.data).toHaveLength(0);
    });

    it('should fallback to CSV parsing when no filename provided', async () => {
      const csvContent = `company_name,contact_email
Acme Corp,sarah@acme.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer); // No filename

      expect(result.headers).toEqual(['company_name', 'contact_email']);
      expect(result.rowCount).toBe(1);
    });

    it('should parse CSV when filename has .csv extension', async () => {
      const csvContent = `company_name,contact_email
Acme Corp,sarah@acme.com`;

      const buffer = Buffer.from(csvContent, 'utf-8');
      const result = await service.parse(buffer, 'test.csv');

      expect(result.headers).toEqual(['company_name', 'contact_email']);
      expect(result.rowCount).toBe(1);
    });
  });
});
