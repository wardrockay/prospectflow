export interface Campaign {
  id: string;
  organisationId: string;
  name: string;
  valueProp: string;
  templateId: string | null;
  status: CampaignStatus;
  createdAt: Date;
  updatedAt: Date;
}

// Must match DB CHECK constraint: ('draft','running','paused','archived')
export type CampaignStatus = 'draft' | 'running' | 'paused' | 'archived';

export interface CreateCampaignInput {
  name: string;
  valueProp: string;
  templateId?: string;
}

export interface CampaignListItem extends Campaign {
  totalProspects: number;
  emailsSent: number;
  responseCount: number;
  responseRate: number;
}

export interface CampaignListQueryParams {
  page?: number;
  limit?: number;
  sortBy?: 'updatedAt' | 'createdAt' | 'name';
  order?: 'asc' | 'desc';
}

export interface PaginationMetadata {
  page: number;
  limit: number;
  totalItems: number;
  totalPages: number;
}

export interface CampaignListResult {
  campaigns: CampaignListItem[];
  pagination: PaginationMetadata;
}
