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

export type CampaignStatus = 'Draft' | 'Active' | 'Paused' | 'Completed' | 'Archived';

export interface CreateCampaignInput {
  name: string;
  valueProp: string;
  templateId?: string;
}

export interface CreateCampaignResult {
  campaign: Campaign;
}
