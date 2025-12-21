import { logger } from '../utils/logger.js';
import { IngestEntity } from '../entities/ingest.entity.js';
import { PharowItem } from '../schemas/ingest.schema.js';
import { v4 as uuidv4 } from 'uuid';
import { getPool } from '../config/database.js';

/**
 * Repository pour gérer la persistance des données d'ingestion dans PostgreSQL
 */
class IngestRepository {
  /**
   * Crée une nouvelle entrée d'ingestion et insère les données Pharrow
   */
  async create(data: PharowItem[]): Promise<IngestEntity> {
    const pool = getPool();
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const ingestId = uuidv4();
      const createdAt = new Date();

      // Pour chaque item Pharrow, insérer dans les tables
      for (const item of data) {
        // Filtrer les emails invalides
        if (!item.position.positionEmail || item.position.positionEmail.trim() === '') {
          logger.warn(
            { person: `${item.person.personFirstName} ${item.person.personLastName}` },
            'Skipping entry: invalid or empty email',
          );
          continue;
        }

        // 1. Insérer/récupérer la company
        const companyResult = await client.query(
          `
          INSERT INTO companies (
            pharow_company_id, siren, hq_siret, name, brand_name, linkedin_name,
            naf_sector, activity, founding_year, founding_date, growing,
            employee_range, annual_revenue_eur, annual_revenue_year,
            main_phone, generic_email, website_url, linkedin_url, hq_address
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
          ON CONFLICT (pharow_company_id) DO UPDATE SET
            name = EXCLUDED.name,
            updated_at = now()
          RETURNING id
          `,
          [
            item.company.pharowCompanyId,
            item.company.companySiren || null,
            item.company.companyHqSiret || null,
            item.company.companyName,
            item.company.companyBrandName || null,
            item.company.companyLinkedinName || null,
            item.company.companyNafSector || null,
            item.company.companyActivity || null,
            item.company.companyFoundingYear ? parseInt(item.company.companyFoundingYear) : null,
            item.company.companyFoundingDate || null,
            item.company.companyGrowing || null,
            item.company.companyEmployeeRangeCorrected || null,
            item.company.companyAnnualRevenueEuros
              ? parseInt(item.company.companyAnnualRevenueEuros)
              : null,
            item.company.companyAnnualRevenueYear
              ? parseInt(item.company.companyAnnualRevenueYear)
              : null,
            item.company.companyMainPhone || null,
            item.company.companyGenericEmail || null,
            item.company.companyUrl || null,
            item.company.companyLinkedinUrl || null,
            item.company.companyHqFullAddress || null,
          ],
        );
        const companyId = companyResult.rows[0].id;

        // 2. Insérer/récupérer la person
        const personResult = await client.query(
          `
          INSERT INTO people (
            first_name, last_name, salutation, linkedin_url,
            mobile_phone, phone_kaspr_1, phone_kaspr_3,
            phone_bettercontact, phone_fullenrich_1, phone_fullenrich_3
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
          ON CONFLICT (first_name, last_name, linkedin_url) DO UPDATE SET
            updated_at = now()
          RETURNING id
          `,
          [
            item.person.personFirstName,
            item.person.personLastName,
            item.person.personSalutation || null,
            item.person.personLinkedinUrl || null,
            item.person.personMobilePhone || null,
            item.person.personPhoneKaspr1 || null,
            item.person.personPhoneKaspr3 || null,
            item.person.personMobilePhoneBettercontact || null,
            item.person.personPhoneFullenrich1 || null,
            item.person.personPhoneFullenrich3 || null,
          ],
        );
        const personId = personResult.rows[0].id;

        // 3. Insérer/récupérer la position
        const emailReliability = item.position.positionEmailReliability
          ? parseFloat(item.position.positionEmailReliability.replace('%', ''))
          : null;

        await client.query(
          `
          INSERT INTO positions (
            person_id, company_id, job_title, pharow_list_name,
            email, email_status, email_reliability
          ) VALUES ($1, $2, $3, $4, $5, $6, $7)
          ON CONFLICT (company_id, person_id, email) DO UPDATE SET
            job_title = EXCLUDED.job_title,
            pharow_list_name = EXCLUDED.pharow_list_name,
            email_status = EXCLUDED.email_status,
            email_reliability = EXCLUDED.email_reliability,
            updated_at = now()
          `,
          [
            personId,
            companyId,
            item.position.positionJobTitle,
            item.position.pharowListName,
            item.position.positionEmail,
            item.position.positionEmailStatus || null,
            emailReliability,
          ],
        );
      }

      await client.query('COMMIT');

      logger.info({ id: ingestId, itemCount: data.length }, 'Ingest data created in PostgreSQL');

      return {
        id: ingestId,
        data,
        itemCount: data.length,
        createdAt,
        status: 'completed',
      };
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ error }, 'Error creating ingest data in PostgreSQL');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Récupère une entrée d'ingestion par son ID
   */
  async findById(id: string): Promise<IngestEntity | null> {
    // Pour l'instant, on ne stocke pas les ingestions elles-mêmes
    // On pourrait créer une table ingests si nécessaire
    return null;
  }

  /**
   * Met à jour le statut d'une ingestion
   */
  async updateStatus(id: string, status: IngestEntity['status']): Promise<IngestEntity | null> {
    // Pour l'instant, on ne stocke pas les ingestions elles-mêmes
    return null;
  }

  /**
   * Récupère toutes les entrées d'ingestion
   */
  async findAll(): Promise<IngestEntity[]> {
    // Pour l'instant, on ne stocke pas les ingestions elles-mêmes
    return [];
  }
}

export const ingestRepository = new IngestRepository();
