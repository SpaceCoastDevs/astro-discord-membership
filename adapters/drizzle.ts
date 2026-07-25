import { and, asc, desc, eq } from 'drizzle-orm';

import type {
  EmailVerification,
  MemberProfile,
  MemberProfileUpdate,
  MembershipDatabaseAdapter,
  NewMemberProfile,
  Label,
  LabelCategory,
} from '../types';

/**
 * Tables whose column names match the membership domain types. This deliberately
 * uses structural types so it works with Drizzle's PostgreSQL, MySQL, and SQLite
 * database clients.
 */
export interface DrizzleMembershipSchema {
  members: Record<string, any>;
  labelCategories: Record<string, any>;
  labels: Record<string, any>;
  labelAssignments: Record<string, any>;
  verifications: Record<string, any>;
}

export function createDrizzleAdapter(
  db: any,
  schema: DrizzleMembershipSchema,
): MembershipDatabaseAdapter {
  const { members, labelCategories, labels, labelAssignments, verifications } = schema;
  const getEmailVerification = async (discordId: string) => {
    const [verification] = await db.select().from(verifications).where(eq(verifications.discordId, discordId)).limit(1);
    return (verification as EmailVerification | undefined) ?? null;
  };

  return {
    async getMemberProfile(discordId) {
      const [profile] = await db.select().from(members).where(eq(members.discordId, discordId)).limit(1);
      return (profile as MemberProfile | undefined) ?? null;
    },
    async getMemberProfileByDiscordUsername(discordUsername) {
      const [profile] = await db.select().from(members).where(eq(members.discordUsername, discordUsername)).limit(1);
      return (profile as MemberProfile | undefined) ?? null;
    },
    async createMemberProfile(profile: NewMemberProfile) {
      await db.insert(members).values({ ...profile, joinedAt: new Date(), updatedAt: new Date() });
    },
    async updateMemberProfile(discordId: string, update: MemberProfileUpdate) {
      await db.update(members).set({ ...update, updatedAt: new Date() }).where(eq(members.discordId, discordId));
    },
    async listPublicMemberProfiles() {
      return (await db
        .select()
        .from(members)
        .where(and(eq(members.emailVerified, true), eq(members.isPublic, true)))) as MemberProfile[];
    },
    async listLatestMemberProfiles(limit) {
      return (await db
        .select()
        .from(members)
        .where(and(eq(members.emailVerified, true), eq(members.isPublic, true)))
        .orderBy(desc(members.joinedAt))
        .limit(limit)) as MemberProfile[];
    },
    async getLabelCategories(includeArchived = false) {
      const query = db.select().from(labelCategories);
      return (await (includeArchived ? query.orderBy(asc(labelCategories.sortOrder), asc(labelCategories.name)) : query.where(eq(labelCategories.status, 'active')).orderBy(asc(labelCategories.sortOrder), asc(labelCategories.name)))) as LabelCategory[];
    },
    async upsertLabelCategory(category) {
      const [existing] = await db.select().from(labelCategories).where(eq(labelCategories.id, category.id)).limit(1);
      const value = { ...category, updatedAt: new Date() };
      if (existing) await db.update(labelCategories).set(value).where(eq(labelCategories.id, category.id));
      else await db.insert(labelCategories).values({ ...value, createdAt: new Date() });
    },
    async deleteLabelCategory(id) {
      await db.update(labelCategories).set({ status: 'archived', updatedAt: new Date() }).where(eq(labelCategories.id, id));
    },
    async getLabels(categoryId, includeInactive = false) {
      const conditions = [categoryId ? eq(labels.categoryId, categoryId) : undefined, includeInactive ? undefined : eq(labels.status, 'active')].filter(Boolean);
      return (await db.select().from(labels).where(conditions.length === 2 ? and(conditions[0], conditions[1]) : conditions[0])) as Label[];
    },
    async upsertLabel(label) {
      const [existing] = await db.select().from(labels).where(eq(labels.id, label.id)).limit(1);
      const value = { ...label, updatedAt: new Date() };
      if (existing) await db.update(labels).set(value).where(eq(labels.id, label.id));
      else await db.insert(labels).values({ ...value, createdAt: new Date() });
    },
    async deleteLabel(id) {
      await db.update(labels).set({ status: 'archived', updatedAt: new Date() }).where(eq(labels.id, id));
    },
    async createLabelSuggestion(categoryId, name, submittedBy) {
      await db.insert(labels).values({ id: crypto.randomUUID(), categoryId, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), status: 'pending', submittedBy, createdAt: new Date(), updatedAt: new Date() });
    },
    async getMemberLabelIds(discordId) {
      const rows = await db.select().from(labelAssignments).where(eq(labelAssignments.discordId, discordId));
      return rows.map((row: { labelId: string }) => row.labelId);
    },
    async setMemberLabelIds(discordId, labelIds) {
      await db.delete(labelAssignments).where(eq(labelAssignments.discordId, discordId));
      if (labelIds.length) await db.insert(labelAssignments).values(labelIds.map((labelId) => ({ discordId, labelId, createdAt: new Date() })));
    },
    async getEmailVerification(discordId) {
      return getEmailVerification(discordId);
    },
    async setEmailVerification(discordId, verification) {
      const [existing] = await db.select().from(verifications).where(eq(verifications.discordId, discordId)).limit(1);
      const value = { discordId, ...verification };
      if (existing) await db.update(verifications).set(value).where(eq(verifications.discordId, discordId));
      else await db.insert(verifications).values(value);
    },
    async incrementEmailVerificationAttempts(discordId) {
      const verification = await getEmailVerification(discordId);
      if (verification) await db.update(verifications).set({ attempts: verification.attempts + 1 }).where(eq(verifications.discordId, discordId));
    },
    async deleteEmailVerification(discordId) {
      await db.delete(verifications).where(eq(verifications.discordId, discordId));
    },
  };
}
