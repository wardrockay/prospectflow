import { getPool } from '../config/database.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('NurtureSequencesRepository');

export interface NurtureSequence {
  id: string;
  name: string;
  description: string | null;
  status: 'draft' | 'active' | 'archived';
  created_at: Date;
  updated_at: Date;
}

export interface NurtureEmail {
  id: string;
  sequence_id: string;
  template_id: string | null;
  order_index: number;
  subject: string;
  delay_days: number;
  notes: string | null;
  created_at: Date;
}

export interface CreateNurtureSequenceData {
  name: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
}

export interface UpdateNurtureSequenceData {
  name?: string;
  description?: string;
  status?: 'draft' | 'active' | 'archived';
}

export interface CreateNurtureEmailData {
  sequence_id: string;
  template_id?: string;
  order_index: number;
  subject: string;
  delay_days: number;
  notes?: string;
}

export interface UpdateNurtureEmailData {
  template_id?: string | null;
  order_index?: number;
  subject?: string;
  delay_days?: number;
  notes?: string | null;
}

/**
 * List all nurture sequences
 */
export async function listNurtureSequences(): Promise<NurtureSequence[]> {
  const pool = getPool();
  const query = `
    SELECT 
      id, name, description, status, created_at, updated_at
    FROM lm_nurture_sequences
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows;
  } catch (error) {
    logger.error({ error }, 'Failed to list nurture sequences');
    throw error;
  }
}

/**
 * Get nurture sequence by ID with its emails
 */
export async function getNurtureSequenceById(id: string): Promise<(NurtureSequence & { emails: NurtureEmail[] }) | null> {
  const pool = getPool();
  
  try {
    // Get sequence
    const sequenceQuery = `
      SELECT 
        id, name, description, status, created_at, updated_at
      FROM lm_nurture_sequences
      WHERE id = $1
    `;
    const sequenceResult = await pool.query(sequenceQuery, [id]);

    if (sequenceResult.rows.length === 0) {
      return null;
    }

    // Get emails
    const emailsQuery = `
      SELECT 
        id, sequence_id, template_id, order_index, subject, delay_days, notes, created_at
      FROM lm_nurture_emails
      WHERE sequence_id = $1
      ORDER BY order_index ASC
    `;
    const emailsResult = await pool.query(emailsQuery, [id]);

    return {
      ...sequenceResult.rows[0],
      emails: emailsResult.rows
    };
  } catch (error) {
    logger.error({ error, id }, 'Failed to get nurture sequence');
    throw error;
  }
}

/**
 * Create new nurture sequence
 */
export async function createNurtureSequence(data: CreateNurtureSequenceData): Promise<NurtureSequence> {
  const pool = getPool();
  const query = `
    INSERT INTO lm_nurture_sequences (name, description, status)
    VALUES ($1, $2, $3)
    RETURNING id, name, description, status, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, [
      data.name,
      data.description || null,
      data.status || 'draft'
    ]);

    logger.info({ sequenceId: result.rows[0].id }, 'Created nurture sequence');
    return result.rows[0];
  } catch (error) {
    logger.error({ error, data }, 'Failed to create nurture sequence');
    throw error;
  }
}

/**
 * Update nurture sequence
 */
export async function updateNurtureSequence(id: string, data: UpdateNurtureSequenceData): Promise<NurtureSequence | null> {
  const pool = getPool();
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    updates.push(`name = $${paramIndex++}`);
    values.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push(`description = $${paramIndex++}`);
    values.push(data.description);
  }
  if (data.status !== undefined) {
    updates.push(`status = $${paramIndex++}`);
    values.push(data.status);
  }

  if (updates.length === 0) {
    return getNurtureSequenceById(id).then(seq => seq ? { ...seq, emails: undefined } as any : null);
  }

  updates.push(`updated_at = NOW()`);
  values.push(id);

  const query = `
    UPDATE lm_nurture_sequences
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, name, description, status, created_at, updated_at
  `;

  try {
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    logger.info({ sequenceId: id }, 'Updated nurture sequence');
    return result.rows[0];
  } catch (error) {
    logger.error({ error, id, data }, 'Failed to update nurture sequence');
    throw error;
  }
}

/**
 * Delete nurture sequence (CASCADE deletes emails)
 */
export async function deleteNurtureSequence(id: string): Promise<boolean> {
  const pool = getPool();
  const query = `DELETE FROM lm_nurture_sequences WHERE id = $1`;

  try {
    const result = await pool.query(query, [id]);
    const deleted = result.rowCount !== null && result.rowCount > 0;
    
    if (deleted) {
      logger.info({ sequenceId: id }, 'Deleted nurture sequence');
    }
    
    return deleted;
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete nurture sequence');
    throw error;
  }
}

/**
 * Create nurture email in sequence
 */
export async function createNurtureEmail(data: CreateNurtureEmailData): Promise<NurtureEmail> {
  const pool = getPool();
  const query = `
    INSERT INTO lm_nurture_emails (sequence_id, template_id, order_index, subject, delay_days, notes)
    VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING id, sequence_id, template_id, order_index, subject, delay_days, notes, created_at
  `;

  try {
    const result = await pool.query(query, [
      data.sequence_id,
      data.template_id || null,
      data.order_index,
      data.subject,
      data.delay_days,
      data.notes || null
    ]);

    logger.info({ emailId: result.rows[0].id, sequenceId: data.sequence_id }, 'Created nurture email');
    return result.rows[0];
  } catch (error) {
    logger.error({ error, data }, 'Failed to create nurture email');
    throw error;
  }
}

/**
 * Update nurture email
 */
export async function updateNurtureEmail(id: string, data: UpdateNurtureEmailData): Promise<NurtureEmail | null> {
  const pool = getPool();
  
  const updates: string[] = [];
  const values: any[] = [];
  let paramIndex = 1;

  if (data.template_id !== undefined) {
    updates.push(`template_id = $${paramIndex++}`);
    values.push(data.template_id);
  }
  if (data.order_index !== undefined) {
    updates.push(`order_index = $${paramIndex++}`);
    values.push(data.order_index);
  }
  if (data.subject !== undefined) {
    updates.push(`subject = $${paramIndex++}`);
    values.push(data.subject);
  }
  if (data.delay_days !== undefined) {
    updates.push(`delay_days = $${paramIndex++}`);
    values.push(data.delay_days);
  }
  if (data.notes !== undefined) {
    updates.push(`notes = $${paramIndex++}`);
    values.push(data.notes);
  }

  if (updates.length === 0) {
    const result = await pool.query('SELECT * FROM lm_nurture_emails WHERE id = $1', [id]);
    return result.rows[0] || null;
  }

  values.push(id);

  const query = `
    UPDATE lm_nurture_emails
    SET ${updates.join(', ')}
    WHERE id = $${paramIndex}
    RETURNING id, sequence_id, template_id, order_index, subject, delay_days, notes, created_at
  `;

  try {
    const result = await pool.query(query, values);
    
    if (result.rows.length === 0) {
      return null;
    }

    logger.info({ emailId: id }, 'Updated nurture email');
    return result.rows[0];
  } catch (error) {
    logger.error({ error, id, data }, 'Failed to update nurture email');
    throw error;
  }
}

/**
 * Delete nurture email
 */
export async function deleteNurtureEmail(id: string): Promise<boolean> {
  const pool = getPool();
  const query = `DELETE FROM lm_nurture_emails WHERE id = $1`;

  try {
    const result = await pool.query(query, [id]);
    const deleted = result.rowCount !== null && result.rowCount > 0;
    
    if (deleted) {
      logger.info({ emailId: id }, 'Deleted nurture email');
    }
    
    return deleted;
  } catch (error) {
    logger.error({ error, id }, 'Failed to delete nurture email');
    throw error;
  }
}
