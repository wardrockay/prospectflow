/**
 * Import types for prospect import operations
 */

export interface ProspectData {
  company_name: string;
  contact_email: string;
  contact_name?: string;
  website_url?: string;
}

export interface InsertedProspect {
  id: string;
  contactEmail: string;
}

export interface ImportSummary {
  imported: number;
  failed: number;
  prospectIds: string[];
}
