import { z } from 'zod';

/**
 * Schema de validation pour les données Pharrow - Position
 */
const positionSchema = z.object({
  pharowListName: z.string(),
  positionJobTitle: z.string(),
  positionEmail: z.string().email(),
  positionEmailStatus: z.string().optional(),
  positionEmailReliability: z.string().optional(),
});

/**
 * Schema de validation pour les données Pharrow - Person
 */
const personSchema = z.object({
  personLastName: z.string(),
  personFirstName: z.string(),
  personSalutation: z.string().optional(),
  personLinkedinUrl: z.string().url().optional().or(z.literal('')),
  personMobilePhone: z.string().optional(),
  personPhoneKaspr1: z.string().optional(),
  personPhoneKaspr3: z.string().optional(),
  personMobilePhoneBettercontact: z.string().optional(),
  personPhoneFullenrich1: z.string().optional(),
  personPhoneFullenrich3: z.string().optional(),
});

/**
 * Schema de validation pour les données Pharrow - Company
 */
const companySchema = z.object({
  pharowCompanyId: z.string(),
  companySiren: z.string().optional(),
  companyHqSiret: z.string().optional(),
  companyBrandName: z.string().optional(),
  companyName: z.string(),
  companyLinkedinName: z.string().optional(),
  companyMainPhone: z.string().optional(),
  companyMainPhoneOrigin: z.string().optional(),
  companyGenericEmail: z.string().email().optional().or(z.literal('')),
  companyNafSector: z.string().optional(),
  companyActivity: z.string().optional(),
  companyFoundingYear: z.string().optional(),
  companyFoundingDate: z.string().optional(),
  companyGrowing: z.boolean().optional(),
  companyNbEmployees: z.string().optional(),
  companyEmployeeRangeCorrected: z.string().optional(),
  companyUrl: z.string().url().optional().or(z.literal('')),
  companyLinkedinUrl: z.string().url().optional().or(z.literal('')),
  companyHqFullAddress: z.string().optional(),
  companyAnnualRevenueEuros: z.string().optional(),
  companyAnnualRevenueYear: z.string().optional(),
});

/**
 * Schema de validation pour un item Pharrow
 */
const pharowItemSchema = z.object({
  position: positionSchema,
  person: personSchema,
  company: companySchema,
});

/**
 * Schema de validation pour les données d'ingestion Pharrow
 */
export const ingestSchema = z.object({
  data: z.array(pharowItemSchema).min(1, 'At least one data item is required'),
});

export type IngestDto = z.infer<typeof ingestSchema>;
export type PharowPosition = z.infer<typeof positionSchema>;
export type PharowPerson = z.infer<typeof personSchema>;
export type PharowCompany = z.infer<typeof companySchema>;
export type PharowItem = z.infer<typeof pharowItemSchema>;
