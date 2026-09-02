export type EmailStatus =
  | 'SCHEDULED'
  | 'QUEUED'
  | 'PROCESSING'
  | 'SENT'
  | 'FAILED'
  | 'RATE_LIMITED'
  | 'CANCELLED';

export interface Sender {
  id: string;
  email: string;
  displayName: string;
  maxEmailsPerHour: number;
  minDelayMsBetweenSend: number;
  isActive: boolean;
}

export interface SlackIntegrationInfo {
  slackTeamName: string;
  channelName?: string;
  createdAt: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  senders?: Sender[];
  slackConnected: boolean;
  slackIntegration?: SlackIntegrationInfo;
}

export interface Email {
  id: string;
  userId: string;
  senderId: string;
  recipient: string;
  subject: string;
  body: string;
  scheduledAt: string;
  sentAt?: string | null;
  status: EmailStatus;
  failureReason?: string | null;
  providerMessageId?: string | null;
  createdAt: string;
  sender?: {
    email: string;
    displayName: string;
  };
}

export interface ScheduleEmailPayload {
  recipients: string[];
  subject: string;
  body: string;
  scheduledAt: string;
  senderId?: string;
  maxEmailsPerHour?: number;
  minDelayMsBetweenSend?: number;
}

export interface ScheduleResponse {
  success: boolean;
  count: number;
  sender: Sender;
  firstScheduledAt: string;
  estimatedCompletionAt: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  source?: 'elasticsearch' | 'postgresql';
}
