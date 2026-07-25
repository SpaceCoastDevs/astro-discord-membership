import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

import type {
  EmailVerification,
  MemberProfile,
  MemberProfileUpdate,
  MembershipDatabaseAdapter,
  NewMemberProfile,
  Label,
  LabelCategory,
} from '../types';

function toDate(value: unknown): Date {
  if (value instanceof Date) return value;
  if (value && typeof value === 'object' && 'toDate' in value && typeof value.toDate === 'function') {
    return value.toDate();
  }
  return new Date(0);
}

function profileFromDocument(id: string, data: Record<string, unknown>): MemberProfile {
  return {
    ...(data as Omit<MemberProfile, 'discordId' | 'joinedAt' | 'updatedAt'>),
    discordId: typeof data.discordId === 'string' ? data.discordId : id,
    joinedAt: toDate(data.joinedAt),
    updatedAt: toDate(data.updatedAt),
  };
}

/** Creates an adapter using the Firebase Admin credentials in the host environment. */
export function createFirestoreAdapter(): MembershipDatabaseAdapter {
  const app =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: import.meta.env.FIREBASE_PROJECT_ID,
        clientEmail: import.meta.env.FIREBASE_CLIENT_EMAIL,
        privateKey: import.meta.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
      }),
    });
  const db = getFirestore(app, import.meta.env.FIREBASE_DATABASE_ID || undefined);

  return {
    async getMemberProfile(discordId) {
      const doc = await db.collection('members').doc(discordId).get();
      return doc.exists ? profileFromDocument(doc.id, doc.data() ?? {}) : null;
    },
    async getMemberProfileByDiscordUsername(discordUsername) {
      const snapshot = await db.collection('members').where('discordUsername', '==', discordUsername).limit(1).get();
      const doc = snapshot.docs[0];
      return doc ? profileFromDocument(doc.id, doc.data()) : null;
    },
    async createMemberProfile(profile: NewMemberProfile) {
      await db.collection('members').doc(profile.discordId).set({
        ...profile,
        joinedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
    },
    async updateMemberProfile(discordId: string, update: MemberProfileUpdate) {
      await db.collection('members').doc(discordId).update({ ...update, updatedAt: FieldValue.serverTimestamp() });
    },
    async listPublicMemberProfiles() {
      const snapshot = await db.collection('members').where('emailVerified', '==', true).get();
      return snapshot.docs.map((doc) => profileFromDocument(doc.id, doc.data())).filter((member) => member.isPublic);
    },
    async listLatestMemberProfiles(limit) {
      const snapshot = await db.collection('members').orderBy('joinedAt', 'desc').limit(limit).get();
      return snapshot.docs
        .map((doc) => profileFromDocument(doc.id, doc.data()))
        .filter((member) => member.emailVerified && member.isPublic);
    },
    async getLabelCategories(includeArchived = false) {
      const snapshot = await db.collection('labelCategories').get();
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<LabelCategory, 'id'>) }))
        .filter((set) => includeArchived || set.status === 'active')
        .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name)) as LabelCategory[];
    },
    async upsertLabelCategory(category) {
      await db.collection('labelCategories').doc(category.id).set({ ...category, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
    },
    async deleteLabelCategory(id) {
      await db.collection('labelCategories').doc(id).update({ status: 'archived', updatedAt: FieldValue.serverTimestamp() });
    },
    async getLabels(categoryId, includeInactive = false) {
      const snapshot = await db.collection('labels').get();
      return snapshot.docs
        .map((doc) => ({ id: doc.id, ...(doc.data() as Omit<Label, 'id'>) }))
        .filter((label) => (!categoryId || label.categoryId === categoryId) && (includeInactive || label.status === 'active')) as Label[];
    },
    async upsertLabel(label) {
      await db.collection('labels').doc(label.id).set({ ...label, updatedAt: FieldValue.serverTimestamp(), createdAt: FieldValue.serverTimestamp() }, { merge: true });
    },
    async deleteLabel(id) {
      await db.collection('labels').doc(id).update({ status: 'archived', updatedAt: FieldValue.serverTimestamp() });
    },
    async createLabelSuggestion(categoryId, name, submittedBy) {
      await db.collection('labels').add({ categoryId, name, slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''), status: 'pending', submittedBy, createdAt: FieldValue.serverTimestamp(), updatedAt: FieldValue.serverTimestamp() });
    },
    async getMemberLabelIds(discordId) {
      const snapshot = await db.collection('labelAssignments').where('discordId', '==', discordId).get();
      return snapshot.docs.map((doc) => doc.data().labelId as string);
    },
    async setMemberLabelIds(discordId, labelIds) {
      const existing = await db.collection('labelAssignments').where('discordId', '==', discordId).get();
      const batch = db.batch();
      existing.docs.forEach((doc) => batch.delete(doc.ref));
      labelIds.forEach((labelId) => batch.set(db.collection('labelAssignments').doc(`${discordId}_${labelId}`), { discordId, labelId, createdAt: FieldValue.serverTimestamp() }));
      await batch.commit();
    },
    async getEmailVerification(discordId) {
      const doc = await db.collection('verifications').doc(discordId).get();
      if (!doc.exists) return null;
      const data = doc.data()!;
      return {
        email: data.email as string,
        code: data.code as string,
        expiresAt: toDate(data.expiresAt),
        attempts: data.attempts as number,
        createdAt: toDate(data.createdAt),
      };
    },
    async setEmailVerification(discordId: string, verification: EmailVerification) {
      await db.collection('verifications').doc(discordId).set({ ...verification, createdAt: FieldValue.serverTimestamp() });
    },
    async incrementEmailVerificationAttempts(discordId) {
      await db.collection('verifications').doc(discordId).update({ attempts: FieldValue.increment(1) });
    },
    async deleteEmailVerification(discordId) {
      await db.collection('verifications').doc(discordId).delete();
    },
  };
}
