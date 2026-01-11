import { CognitoJwtPayload } from '../types/cognito.js';
import { logger } from '../utils/logger.js';
import { pool } from '../config/database.js';

export interface User {
  id: string;
  cognito_sub: string;
  email: string;
  organisation_id: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export class UserSyncService {
  /**
   * Synchronize Cognito user to database on first login
   * @param cognitoPayload - JWT payload from Cognito
   * @returns Promise<User> - User record from database
   */
  async syncUser(cognitoPayload: CognitoJwtPayload): Promise<User> {
    try {
      const cognitoSub = cognitoPayload.sub;
      const email = cognitoPayload.email;
      const organisationId = cognitoPayload['custom:organisation_id'];
      const role = cognitoPayload['custom:role'] || 'user';

      // Validate required fields
      if (!organisationId) {
        throw new Error('Missing organisation_id in Cognito JWT');
      }

      // Check if user already exists
      const existingUser = await this.findUserByCognitoSub(cognitoSub);

      if (existingUser) {
        logger.debug(`User already exists in database: ${cognitoSub}`);
        return existingUser;
      }

      // User doesn't exist - create new record
      logger.info(`Creating new user record for ${cognitoSub}`);

      const newUser = await this.createUser({
        cognitoSub,
        email,
        organisationId,
        role,
      });

      return newUser;
    } catch (error) {
      // Handle race condition - another request may have created the user
      if (error instanceof Error && error.message.includes('unique constraint')) {
        logger.warn(
          `Race condition detected for user sync: ${cognitoPayload.sub}, fetching existing record`,
        );
        const existingUser = await this.findUserByCognitoSub(cognitoPayload.sub);
        if (existingUser) {
          return existingUser;
        }
      }

      logger.error({ err: error }, 'Failed to sync user');
      throw new Error('User synchronization failed');
    }
  }

  /**
   * Find user by Cognito sub (subject identifier)
   * @param cognitoSub - Cognito user UUID
   * @returns Promise<User | null>
   */
  private async findUserByCognitoSub(cognitoSub: string): Promise<User | null> {
    try {
      const query = `
        SELECT 
          id, 
          cognito_sub, 
          email, 
          organisation_id, 
          role, 
          created_at, 
          updated_at
        FROM iam.users
        WHERE cognito_sub = $1
      `;

      const result = await pool!.query(query, [cognitoSub]);

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0] as User;
    } catch (error) {
      logger.error({ err: error }, 'Failed to find user by cognito_sub');
      throw error;
    }
  }

  /**
   * Create new user record in database
   * @param userData - User data to insert
   * @returns Promise<User>
   */
  private async createUser(userData: {
    cognitoSub: string;
    email: string;
    organisationId: string;
    role: string;
  }): Promise<User> {
    try {
      const query = `
        INSERT INTO iam.users (
          cognito_sub, 
          email, 
          organisation_id, 
          role,
          created_at,
          updated_at
        )
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING 
          id, 
          cognito_sub, 
          email, 
          organisation_id, 
          role, 
          created_at, 
          updated_at
      `;

      const values = [userData.cognitoSub, userData.email, userData.organisationId, userData.role];

      const result = await pool!.query(query, values);

      logger.info(
        { organisationId: userData.organisationId, email: userData.email },
        `User created successfully: ${userData.cognitoSub}`,
      );

      return result.rows[0] as User;
    } catch (error) {
      logger.error({ err: error }, 'Failed to create user');
      throw error;
    }
  }

  /**
   * Update user information (for future use)
   * @param cognitoSub - Cognito user UUID
   * @param updates - Fields to update
   * @returns Promise<User>
   */
  async updateUser(
    cognitoSub: string,
    updates: Partial<Pick<User, 'email' | 'role'>>,
  ): Promise<User> {
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.email !== undefined) {
        setClauses.push(`email = $${paramIndex++}`);
        values.push(updates.email);
      }

      if (updates.role !== undefined) {
        setClauses.push(`role = $${paramIndex++}`);
        values.push(updates.role);
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(cognitoSub);

      const query = `
        UPDATE iam.users
        SET ${setClauses.join(', ')}
        WHERE cognito_sub = $${paramIndex}
        RETURNING 
          id, 
          cognito_sub, 
          email, 
          organisation_id, 
          role, 
          created_at, 
          updated_at
      `;

      const result = await pool!.query(query, values);

      if (result.rows.length === 0) {
        throw new Error(`User not found: ${cognitoSub}`);
      }

      logger.info({ updates }, `User updated: ${cognitoSub}`);

      return result.rows[0] as User;
    } catch (error) {
      logger.error({ err: error }, 'Failed to update user');
      throw error;
    }
  }

  /**
   * Delete user (soft delete by marking as inactive - for future use)
   * @param cognitoSub - Cognito user UUID
   * @returns Promise<boolean>
   */
  async deleteUser(cognitoSub: string): Promise<boolean> {
    try {
      const query = `
        UPDATE iam.users
        SET 
          updated_at = NOW(),
          is_active = false
        WHERE cognito_sub = $1
      `;

      const result = await pool!.query(query, [cognitoSub]);

      if (result.rowCount === 0) {
        logger.warn(`User not found for deletion: ${cognitoSub}`);
        return false;
      }

      logger.info(`User deleted (soft): ${cognitoSub}`);
      return true;
    } catch (error) {
      logger.error({ err: error }, 'Failed to delete user');
      throw error;
    }
  }
}

// Export singleton instance
export const userSyncService = new UserSyncService();
