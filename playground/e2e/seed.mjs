import Database from 'better-sqlite3';

function mockAvatar(background, skin, hair) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96">
    <rect width="96" height="96" rx="20" fill="${background}"/>
    <circle cx="48" cy="50" r="27" fill="${skin}"/>
    <path d="M21 46c1-22 53-31 56 1V34c-15-14-42-13-56 1z" fill="${hair}"/>
    <circle cx="38" cy="52" r="3" fill="#172033"/>
    <circle cx="58" cy="52" r="3" fill="#172033"/>
    <path d="M39 66c6 5 12 5 18 0" fill="none" stroke="#172033" stroke-width="3" stroke-linecap="round"/>
  </svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function seedE2eData(databaseFile) {
  const sqlite = new Database(databaseFile);
  const now = Date.now();

  sqlite.exec(`
    DELETE FROM label_assignments;
    DELETE FROM labels;
    DELETE FROM label_categories;
    DELETE FROM members;
  `);

  const insertMember = sqlite.prepare(`
    INSERT INTO members (
      discord_id, discord_username, display_name, avatar_url, bio, location,
      website, github, linkedin, bluesky, is_public,
      email, email_verified, announced, joined_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, '', '', '', '', 1, '', 1, 0, ?, ?)
  `);
  const members = [
    ['e2e-ada', 'ada', 'Ada Lovelace', 'Building tools for creative communities.', 'Melbourne, FL', '#6366f1', '#f3c9a8', '#312e81'],
    ['e2e-grace', 'grace', 'Grace Hopper', 'Making software easier to understand.', 'Cocoa Beach, FL', '#0ea5e9', '#dca47b', '#334155'],
    ['e2e-alan', 'alan', 'Alan Turing', 'Exploring the art and science of computation.', 'Orlando, FL', '#14b8a6', '#e9bd96', '#064e3b'],
    ['e2e-katherine', 'katherine', 'Katherine Johnson', 'Using math to chart a path to the stars.', 'Titusville, FL', '#f97316', '#9a5a37', '#3f1d0d'],
    ['e2e-margaret', 'margaret', 'Margaret Hamilton', 'Building dependable systems for bold missions.', 'Palm Bay, FL', '#ec4899', '#f2c09e', '#7f1d1d'],
    ['e2e-linus', 'linus', 'Linus Torvalds', 'Creating practical tools for curious builders.', 'Rockledge, FL', '#84cc16', '#e6b88d', '#365314'],
    ['e2e-radia', 'radia', 'Radia Perlman', 'Connecting people through better networks.', 'Satellite Beach, FL', '#8b5cf6', '#b86f46', '#4c1d95'],
    ['e2e-donald', 'donald', 'Donald Knuth', 'Finding joy in algorithms and typography.', 'Melbourne Beach, FL', '#eab308', '#f0c399', '#713f12'],
    ['e2e-hedy', 'hedy', 'Hedy Lamarr', 'Blending creative ideas with inventive engineering.', 'Indian Harbour Beach, FL', '#ef4444', '#d49770', '#450a0a'],
  ];
  for (const [discordId, username, displayName, bio, location, background, skin, hair] of members) {
    insertMember.run(discordId, username, displayName, mockAvatar(background, skin, hair), bio, location, now, now);
  }

  const insertCategory = sqlite.prepare(`
    INSERT INTO label_categories (id, name, slug, description, selection_limit, sort_order, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, ?, 'active', ?, ?)
  `);
  insertCategory.run('e2e-tech', 'Technologies', 'technologies', 'Tools members use.', 0, now, now);
  insertCategory.run('e2e-interests', 'Personal Interests', 'personal-interests', 'Things members enjoy.', 1, now, now);

  const insertLabel = sqlite.prepare(`
    INSERT INTO labels (id, category_id, name, slug, group_name, status, submitted_by, created_at, updated_at)
    VALUES (?, ?, ?, ?, NULL, 'active', NULL, ?, ?)
  `);
  insertLabel.run('e2e-typescript', 'e2e-tech', 'TypeScript', 'typescript', now, now);
  insertLabel.run('e2e-astro', 'e2e-tech', 'Astro', 'astro', now, now);
  insertLabel.run('e2e-python', 'e2e-tech', 'Python', 'python', now, now);
  insertLabel.run('e2e-rust', 'e2e-tech', 'Rust', 'rust', now, now);
  insertLabel.run('e2e-hiking', 'e2e-interests', 'Hiking', 'hiking', now, now);
  insertLabel.run('e2e-photography', 'e2e-interests', 'Photography', 'photography', now, now);

  const assignLabel = sqlite.prepare(
    'INSERT INTO label_assignments (discord_id, label_id, created_at) VALUES (?, ?, ?)',
  );
  assignLabel.run('e2e-ada', 'e2e-typescript', now);
  assignLabel.run('e2e-ada', 'e2e-astro', now);
  assignLabel.run('e2e-ada', 'e2e-python', now);
  assignLabel.run('e2e-ada', 'e2e-rust', now);
  assignLabel.run('e2e-ada', 'e2e-hiking', now);
  assignLabel.run('e2e-ada', 'e2e-photography', now);
  assignLabel.run('e2e-grace', 'e2e-astro', now);
  assignLabel.run('e2e-alan', 'e2e-python', now);
  assignLabel.run('e2e-alan', 'e2e-hiking', now);
  assignLabel.run('e2e-katherine', 'e2e-typescript', now);
  assignLabel.run('e2e-katherine', 'e2e-photography', now);
  assignLabel.run('e2e-margaret', 'e2e-astro', now);
  assignLabel.run('e2e-margaret', 'e2e-rust', now);
  assignLabel.run('e2e-linus', 'e2e-rust', now);
  assignLabel.run('e2e-radia', 'e2e-python', now);
  assignLabel.run('e2e-radia', 'e2e-photography', now);
  assignLabel.run('e2e-donald', 'e2e-typescript', now);
  assignLabel.run('e2e-hedy', 'e2e-astro', now);
  assignLabel.run('e2e-hedy', 'e2e-photography', now);

  sqlite.close();
}
