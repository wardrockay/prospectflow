import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

/**
 * E2E Test: Complete Prospect Import Flow
 * 
 * Tests the full user journey from upload to import:
 * 1. Login as authenticated user
 * 2. Navigate to import page
 * 3. Upload CSV file
 * 4. Map columns
 * 5. View validation results
 * 6. Execute import
 * 7. Verify success
 * 
 * Covers stories: ui-2-1, ui-2-2, ui-2-3
 */

test.describe('Prospect Import Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'TestPassword123!');
    await page.click('button[type="submit"]');
    
    // Wait for redirect to dashboard
    await page.waitForURL('**/dashboard', { timeout: 5000 });
  });

  test('complete prospect import flow with valid data', async ({ page }) => {
    // Step 1: Navigate to import page with campaign
    await page.goto('/prospects/import?campaignId=test-campaign-123');
    await expect(page.locator('h1')).toContainText('Import de Prospects');

    // Step 2: Upload CSV file
    const testCsvPath = join(__dirname, '../fixtures/valid-prospects.csv');
    
    // Create test CSV if doesn't exist
    const csvContent = `company_name,contact_email,contact_first_name,contact_last_name
Acme Corp,john@acme.com,John,Doe
Tech Startup,jane@techstartup.com,Jane,Smith
Global Industries,bob@global.com,Bob,Johnson`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'valid-prospects.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for upload to complete and redirect to mapping page
    await page.waitForURL('**/import/map?upload_id=*', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Mapping des colonnes');

    // Step 3: Verify column mappings are detected
    await expect(page.locator('text=company_name')).toBeVisible();
    await expect(page.locator('text=contact_email')).toBeVisible();

    // Step 4: Confirm mappings
    await page.click('button:has-text("Valider le mapping")');

    // Wait for redirect to validation page
    await page.waitForURL('**/import/validate?upload_id=*&campaign_id=*', { timeout: 10000 });
    await expect(page.locator('h1')).toContainText('Résultats de validation');

    // Step 5: Verify validation summary displays
    await expect(page.locator('text=/\\d+ lignes valides/i')).toBeVisible();
    
    // Check for quality indicator
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toBeVisible();
    
    // Wait for validation to complete
    await page.waitForTimeout(1000);

    // Step 6: Execute import
    const importButton = page.locator('button:has-text("Importer")');
    await expect(importButton).toBeEnabled();
    await importButton.click();

    // Step 7: Verify success toast appears
    await expect(page.locator('.toast-success, [role="alert"]:has-text("Import réussi")')).toBeVisible({ timeout: 10000 });

    // Step 8: Verify navigation to campaign details
    await page.waitForURL('**/campaigns/**?tab=prospects', { timeout: 10000 });
  });

  test('should handle validation errors gracefully', async ({ page }) => {
    // Navigate to import
    await page.goto('/prospects/import?campaignId=test-campaign-123');

    // Upload CSV with invalid data
    const invalidCsvContent = `company_name,contact_email,contact_first_name,contact_last_name
Acme Corp,invalid-email,John,Doe
,jane@techstartup.com,Jane,Smith
Tech Company,bob@global,Bob,Johnson`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'invalid-prospects.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(invalidCsvContent),
    });

    // Wait for mapping page
    await page.waitForURL('**/import/map?upload_id=*', { timeout: 10000 });
    
    // Confirm mappings
    await page.click('button:has-text("Valider le mapping")');

    // Wait for validation page
    await page.waitForURL('**/import/validate?upload_id=*&campaign_id=*', { timeout: 10000 });

    // Verify error count is displayed
    await expect(page.locator('text=/\\d+ lignes invalides/i')).toBeVisible();
    
    // Verify error details table exists
    await expect(page.locator('table')).toBeVisible();
    await expect(page.locator('th:has-text("Ligne #")')).toBeVisible();
    await expect(page.locator('th:has-text("Erreur")')).toBeVisible();

    // Verify import button is still enabled (partial import allowed)
    const importButton = page.locator('button:has-text("Importer")');
    await expect(importButton).toBeVisible();
  });

  test('should allow navigation back through import flow', async ({ page }) => {
    // Navigate to import
    await page.goto('/prospects/import?campaignId=test-campaign-123');

    // Upload CSV
    const csvContent = `company_name,contact_email
Acme Corp,john@acme.com`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    // Wait for mapping page
    await page.waitForURL('**/import/map?upload_id=*', { timeout: 10000 });
    
    // Confirm mappings
    await page.click('button:has-text("Valider le mapping")');

    // Wait for validation page
    await page.waitForURL('**/import/validate?upload_id=*&campaign_id=*', { timeout: 10000 });

    // Click back button
    await page.click('button:has-text("Retour")');

    // Should return to mapping page
    await page.waitForURL('**/import/map?upload_id=*', { timeout: 5000 });
    await expect(page.locator('h1')).toContainText('Mapping des colonnes');
  });

  test('should prevent import during loading state', async ({ page }) => {
    // Navigate to import and upload
    await page.goto('/prospects/import?campaignId=test-campaign-123');

    const csvContent = `company_name,contact_email
Acme Corp,john@acme.com`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForURL('**/import/map?upload_id=*', { timeout: 10000 });
    await page.click('button:has-text("Valider le mapping")');
    await page.waitForURL('**/import/validate?upload_id=*&campaign_id=*', { timeout: 10000 });

    // Click import button
    const importButton = page.locator('button:has-text("Importer")');
    await importButton.click();

    // Button should be disabled or show loading state
    await expect(importButton).toBeDisabled();
  });

  test('should display accessibility announcements', async ({ page }) => {
    // Navigate to import
    await page.goto('/prospects/import?campaignId=test-campaign-123');

    const csvContent = `company_name,contact_email
Acme Corp,john@acme.com`;
    
    await page.setInputFiles('input[type="file"]', {
      name: 'test.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from(csvContent),
    });

    await page.waitForURL('**/import/map?upload_id=*', { timeout: 10000 });
    await page.click('button:has-text("Valider le mapping")');
    await page.waitForURL('**/import/validate?upload_id=*&campaign_id=*', { timeout: 10000 });

    // Check for screen reader announcements
    const statusAnnouncements = page.locator('[role="status"]');
    await expect(statusAnnouncements.first()).toBeAttached();

    // Verify progress bar has ARIA attributes
    const progressBar = page.locator('[role="progressbar"]');
    await expect(progressBar).toHaveAttribute('aria-valuenow');
    await expect(progressBar).toHaveAttribute('aria-valuemin', '0');
    await expect(progressBar).toHaveAttribute('aria-valuemax', '100');
  });
});

test.describe('Prospect Import Error Scenarios', () => {
  test('should handle missing campaignId', async ({ page }) => {
    // Try to navigate without campaignId
    await page.goto('/prospects/import');

    // Should show error or redirect
    await expect(page.locator('text=/ID de campagne manquant/i, text=/Erreur/i')).toBeVisible({ timeout: 5000 });
  });

  test('should handle missing uploadId on validation page', async ({ page }) => {
    // Try to navigate to validation without uploadId
    await page.goto('/prospects/import/validate?campaign_id=test-campaign-123');

    // Should show error
    await expect(page.locator('text=/Upload ID.*requis/i')).toBeVisible({ timeout: 5000 });
  });
});
