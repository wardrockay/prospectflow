import { PharowItem } from '../schemas/ingest.schema.js';

/**
 * Entité représentant une ingestion Pharrow
 */
export interface IngestEntity {
  id: string;
  data: PharowItem[];
  itemCount: number;
  createdAt: Date;
  processedAt?: Date;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  errorMessage?: string;
}
