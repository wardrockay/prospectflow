import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

/**
 * MapPage Integration Tests
 * 
 * These tests verify the page structure and configuration.
 * Full page behavior is tested via E2E tests with Playwright.
 * 
 * The composable (useColumnMapping) is comprehensively tested separately.
 */
describe('MapPage', () => {
  const pageContent = readFileSync(
    resolve(__dirname, '../../../../pages/prospects/import/map.vue'),
    'utf-8'
  );

  describe('Page Structure', () => {
    it('should have auth middleware configured', () => {
      expect(pageContent).toContain("middleware: 'auth'");
    });

    it('should have default layout', () => {
      expect(pageContent).toContain("layout: 'default'");
    });

    it('should import useColumnMapping composable', () => {
      expect(pageContent).toContain('useColumnMapping');
    });

    it('should use ProspectColumnMapper component', () => {
      expect(pageContent).toContain('ProspectColumnMapper');
    });
  });

  describe('Required Elements', () => {
    it('should have page title', () => {
      expect(pageContent).toContain('Mapping des colonnes');
    });

    it('should have loading state with spinner', () => {
      expect(pageContent).toContain('v-if="loading');
      expect(pageContent).toContain('animate-spin');
    });

    it('should have error alert', () => {
      expect(pageContent).toContain('v-if="error"');
      expect(pageContent).toContain('UAlert');
    });

    it('should extract upload_id from query params', () => {
      expect(pageContent).toContain('route.query.upload_id');
    });

    it('should handle missing upload_id with error', () => {
      expect(pageContent).toContain('createError');
      expect(pageContent).toContain('Upload ID manquant');
    });
  });

  describe('Navigation Handling', () => {
    it('should navigate to import page on back', () => {
      expect(pageContent).toContain("/prospects/import'");
    });

    it('should navigate to validation page on confirm', () => {
      expect(pageContent).toContain('/prospects/import/validate');
    });
  });

  describe('Toast Notifications', () => {
    it('should show success toast on submit', () => {
      expect(pageContent).toContain('Mappings sauvegardés');
    });

    it('should show error toast on failure', () => {
      expect(pageContent).toContain("title: 'Erreur'");
    });
  });

  describe('Event Handlers', () => {
    it('should handle update-mapping event', () => {
      expect(pageContent).toContain('@update-mapping="handleUpdateMapping"');
    });

    it('should handle back event', () => {
      expect(pageContent).toContain('@back="handleBack"');
    });

    it('should handle confirm event', () => {
      expect(pageContent).toContain('@confirm="handleConfirm"');
    });
  });
});
