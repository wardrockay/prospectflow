import { z } from 'zod';

/**
 * Schema de validation pour les données Pharrow - Position
 */
const positionSchema = z.object({
  pharowListName: z.string(),
  positionJobTitle: z.string(),
  positionEmail: z.string().nullable(),
  positionEmailStatus: z.string().nullable().optional(),
  positionEmailReliability: z.string().nullable().optional(),
});

/**
 * Schema de validation pour les données Pharrow - Person
 */
const personSchema = z.object({
  personLastName: z.string(),
  personFirstName: z.string(),
  personSalutation: z.string().nullable().optional(),
  personLinkedinUrl: z.string().nullable().optional(),
  personMobilePhone: z.string().nullable().optional(),
  personPhoneKaspr1: z.string().nullable().optional(),
  personPhoneKaspr3: z.string().nullable().optional(),
  personMobilePhoneBettercontact: z.string().nullable().optional(),
  personPhoneFullenrich1: z.string().nullable().optional(),
  personPhoneFullenrich3: z.string().nullable().optional(),
});

/**
 * Schema de validation pour les données Pharrow - Company
 */
const companySchema = z.object({
  pharowCompanyId: z.string(),
  companySiren: z.string().nullable().optional(),
  companyHqSiret: z.string().nullable().optional(),
  companyBrandName: z.string().nullable().optional(),
  companyName: z.string(),
  companyLinkedinName: z.string().nullable().optional(),
  companyMainPhone: z.string().nullable().optional(),
  companyMainPhoneOrigin: z.string().nullable().optional(),
  companyGenericEmail: z.string().nullable().optional(),
  companyNafSector: z.string().nullable().optional(),
  companyActivity: z.string().nullable().optional(),
  companyFoundingYear: z.string().nullable().optional(),
  companyFoundingDate: z.string().nullable().optional(),
  companyGrowing: z.boolean().nullable().optional(),
  companyNbEmployees: z.string().nullable().optional(),
  companyEmployeeRangeCorrected: z.string().nullable().optional(),
  companyUrl: z.string().nullable().optional(),
  companyLinkedinUrl: z.string().nullable().optional(),
  companyHqFullAddress: z.string().nullable().optional(),
  companyAnnualRevenueEuros: z.string().nullable().optional(),
  companyAnnualRevenueYear: z.string().nullable().optional(),
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
