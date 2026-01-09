export interface UserSession {
  cognitoSub: string;
  organisationId: string;
  role: string;
  email: string;
  cognitoGroups: string[];
  lastActivity: number; // Unix timestamp (milliseconds)
  createdAt: number; // Unix timestamp (milliseconds)
  ipAddress?: string; // Optional: for audit trail
  userAgent?: string; // Optional: for device tracking
}

export interface CreateSessionPayload {
  cognitoSub: string;
  organisationId: string;
  role: string;
  email: string;
  cognitoGroups: string[];
  ipAddress?: string;
  userAgent?: string;
}
