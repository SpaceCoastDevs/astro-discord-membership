import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const members = sqliteTable('members', {
  discordId: text('discord_id').primaryKey(),
  discordUsername: text('discord_username').notNull().unique(),
  displayName: text('display_name').notNull(),
  avatarUrl: text('avatar_url').notNull(),
  bio: text('bio').notNull().default(''),
  location: text('location').notNull().default(''),
  website: text('website').notNull().default(''),
  github: text('github').notNull().default(''),
  linkedin: text('linkedin').notNull().default(''),
  bluesky: text('bluesky').notNull().default(''),
  isPublic: integer('is_public', { mode: 'boolean' }).notNull().default(true),
  email: text('email').notNull().default(''),
  emailVerified: integer('email_verified', { mode: 'boolean' }).notNull().default(false),
  announced: integer('announced', { mode: 'boolean' }).notNull().default(false),
  joinedAt: integer('joined_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const labelCategories = sqliteTable('label_categories', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description'),
  selectionLimit: integer('selection_limit'),
  sortOrder: integer('sort_order').notNull().default(0),
  status: text('status', { enum: ['active', 'archived'] }).notNull().default('active'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const labels = sqliteTable('labels', {
  id: text('id').primaryKey(),
  categoryId: text('category_id').notNull().references(() => labelCategories.id),
  name: text('name').notNull(),
  slug: text('slug').notNull(),
  group: text('group_name'),
  status: text('status', { enum: ['active', 'pending', 'archived'] }).notNull().default('active'),
  submittedBy: text('submitted_by'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }).notNull(),
});

export const labelAssignments = sqliteTable('label_assignments', {
  discordId: text('discord_id').notNull().references(() => members.discordId),
  labelId: text('label_id').notNull().references(() => labels.id),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});

export const verifications = sqliteTable('verifications', {
  discordId: text('discord_id').primaryKey(),
  email: text('email').notNull(),
  code: text('code').notNull(),
  expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).notNull(),
});
