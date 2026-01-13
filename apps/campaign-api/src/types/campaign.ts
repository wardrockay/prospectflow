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
