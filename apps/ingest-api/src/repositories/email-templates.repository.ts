import { getPool } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('EmailTemplatesRepository');

export interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  html_body: string;
  description: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface CreateEmailTemplateData {
  name: string;
  subject: string;
  html_body: string;
  description?: string;
}

export interface UpdateEmailTemplateData {
  name?: string;
  subject?: string;
  html_body?: string;
  description?: string;
}

/**
 * List all email templates
 */
export async function listEmailTemplates(): Promise<EmailTemplate[]> {
  const pool = getPool();
  const query = `
    SELECT 
      id, name, subject, html_body, description, created_at, updated_at
    FROM lm_email_templates
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logger.error({ error }, 'Failed to list email templates');
    throw error;
  }
}

/**
 * Get email template by ID
 */
export async function getEmailTemplateById(id: string): Promise<EmailTemplate | null> {
  const pool = getPool();
  const query = `
    SELECT 
      id, name, subject, html_body, description, created_at, updated_at
    FROM lm_email_templates
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [id]);
    return result.rows[0] || null;
  } catch (error) {
    logger.error({ error, id }, 'Failed to get email template');
    throw error;
  }
}

/**
 * Create new email template
 */
export async function createEmailTemplate(data: CreateEmailTemplateData): Promise<EmailTemplate> {
  const pool = getPool();
  const query = `
    INSERT INTO lm_email_templates (name, subject, html_body, description)
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, subject, html_body, description, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, [
      data.name,
      data.subject,
      data.html_body,
      data.description || null
    ]);

    logger.info({ templateId: result.rows[0].id }, 'Created email template');
    return result.rows[0];
  } catch (error) {
    logger.error({ error, data }, 'Failed to create email template');
    throw error;
  }
}

/**
 * Update email template
 */
export async function updateEmailTemplate(id: string, data: UpdateEmailTemplateData): Promise<EmailTemplate | null> {
  const pool = getPool();
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.subject !== undefined) {
    updates.push(`subject = $${paramIndex++}`);
    values.push(data.subject);
  }
  if (data.html_body !== undefined) {
    updates.push(`html_body = $${paramIndex++}`);
    values.push(data.html_body);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }

  if (updates.length === 0) {
    return getEmailTemplateById(id);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE lm_email_templates
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, subject, html_body, description, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    logger.info({ templateId: id }, 'Updated email template');
    return result.rows[0];
  } catch (error) {
    logger.error({ error, id, data }, 'Failed to update email template');
    throw error;
  }
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(id: string): Promise<boolean> {
  const pool = getPool();
  const query = `DELETE FROM lm_email_templates WHERE id = $1`;

  try {
    const result = await pool.query(query, [id]);
    const deleted = result.rowCount !== null && result.rowCount > 0;
    
    if (deleted) {
      logger.info({ templateId: id }, 'Deleted email template');
    }
    
    return deleted;
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete email template');
    throw error;
  }
}

/**
 * Preview email template with sample data
 */
export function previewEmailTemplate(htmlBody: string, sampleData?: { email?: string; download_url?: string; subscriber_name?: string }): string {
  const data = {
    email: sampleData?.email || 'exemple@email.com',
    download_url: sampleData?.download_url || 'https://example.com/download/sample-token',
    subscriber_name: sampleData?.subscriber_name || 'Jean Dupont'
  };

  return htmlBody
    .replace(/\{\{email\}\}/g, data.email)
    .replace(/\{\{download_url\}\}/g, data.download_url)
    .replace(/\{\{subscriber_name\}\}/g, data.subscriber_name);
}
