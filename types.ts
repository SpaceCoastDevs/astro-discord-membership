export interface LabelCategory {
  id: string;
  name: string;
  slug: string;
  description?: string;
  selectionLimit?: number;
  sortOrder: number;
  status: 'active' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}

export interface Label {
  id: string;
  categoryId: string;
  name: string;
  slug: string;
  group?: string;
  status: 'active' | 'pending' | 'archived';
  submittedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type NewLabelCategory = Omit<LabelCategory, 'createdAt' | 'updatedAt'>;
export type NewLabel = Omit<Label, 'createdAt' | 'updatedAt'>;

export interface MemberProfile {
  discordId: string;
  discordUsername: string;
  displayName: string;
  avatarUrl: string;
  bio: string;
  location: string;
  website: string;
  github: string;
  linkedin: string;
  bluesky: string;
  isPublic: boolean;
  email: string;
  emailVerified: boolean;
  announced: boolean;
  joinedAt: Date;
  updatedAt: Date;
}

export type NewMemberProfile = Omit<MemberProfile, 'joinedAt' | 'updatedAt'>;
export type MemberProfileUpdate = Partial<Omit<MemberProfile, 'discordId' | 'joinedAt' | 'updatedAt'>>;

export interface EmailVerification {
  email: string;
  code: string;
  expiresAt: Date;
  attempts: number;
  createdAt: Date;
}

/**
 * Persistence contract for astro-discord-membership. Implement this in the host
 * application and pass the module path to the integration's `databaseAdapter`
 * option. No Firebase, SQL, or ORM types cross this boundary.
 */
export interface MembershipDatabaseAdapter {
  getMemberProfile(discordId: string): Promise<MemberProfile | null>;
  getMemberProfileByDiscordUsername(discordUsername: string): Promise<MemberProfile | null>;
  createMemberProfile(profile: NewMemberProfile): Promise<void>;
  updateMemberProfile(discordId: string, update: MemberProfileUpdate): Promise<void>;
  listPublicMemberProfiles(): Promise<MemberProfile[]>;
  listLatestMemberProfiles(limit: number): Promise<MemberProfile[]>;

  getLabelCategories(includeArchived?: boolean): Promise<LabelCategory[]>;
  upsertLabelCategory(category: NewLabelCategory): Promise<void>;
  deleteLabelCategory(id: string): Promise<void>;
  getLabels(categoryId?: string, includeInactive?: boolean): Promise<Label[]>;
  upsertLabel(label: NewLabel): Promise<void>;
  deleteLabel(id: string): Promise<void>;
  createLabelSuggestion(categoryId: string, name: string, submittedBy: string): Promise<void>;
  getMemberLabelIds(discordId: string): Promise<string[]>;
  setMemberLabelIds(discordId: string, labelIds: string[]): Promise<void>;

  getEmailVerification(discordId: string): Promise<EmailVerification | null>;
  setEmailVerification(discordId: string, verification: EmailVerification): Promise<void>;
  incrementEmailVerificationAttempts(discordId: string): Promise<void>;
  deleteEmailVerification(discordId: string): Promise<void>;
}
