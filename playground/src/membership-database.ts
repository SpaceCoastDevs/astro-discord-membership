import { createDrizzleAdapter } from '@space-coast-devs/astro-discord-membership/adapters/drizzle';
import { db } from './db';
import { labelAssignments, labelCategories, labels, members, verifications } from './db/schema';

export default createDrizzleAdapter(db, { members, labelCategories, labels, labelAssignments, verifications });
