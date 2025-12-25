export enum ParticipantType {
  PUBLIC = 'PUBLIC',
  PRIVATE = 'PRIVATE' // Requires pre-registration/allowlist
}

export interface Prize {
  id: string;
  name: string;
  level: string; // e.g., "First Prize", "Gold Tier"
  probability: number; // 0-100 percentage
  description: string;
  totalCount: number;
  remainingCount: number;
}

export interface User {
  phone: string;
  name: string;
  totalChances: number;
  usedChances: number;
}

export interface DrawResult {
  id: string;
  timestamp: number;
  prizeId: string | null; // null if no prize won
  prizeName: string;
  userPhone: string;
}

export interface LotteryConfig {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  participantType: ParticipantType;
  prizes: Prize[];
  allowedUsers: User[]; // Used if type is PRIVATE
  drawRecords: DrawResult[];
  themeColor: string;
}

// Helper type for the form
export type NewLotteryForm = Omit<LotteryConfig, 'id' | 'allowedUsers' | 'drawRecords'>;
