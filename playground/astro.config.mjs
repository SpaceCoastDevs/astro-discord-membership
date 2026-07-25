// @ts-check
import node from '@astrojs/node';
import { defineConfig } from 'astro/config';
import membership from '@space-coast-devs/astro-discord-membership';

export default defineConfig({
  output: 'server',
  devToolbar: { enabled: false },
  adapter: node({ mode: 'standalone' }),
  integrations: [
    membership({
      databaseAdapter: './src/membership-database.ts',
      communityName: 'Astro Discord Membership Playground',
      siteUrl: 'http://localhost:4321',
    }),
  ],
  vite: {
    build: {
      rollupOptions: {
        // The injected server routes live one directory above this app. Keep
        // their runtime dependencies external so Node resolves them from
        // playground/node_modules.
        external: [/^firebase-admin(?:\/.*)?$/, /^drizzle-orm(?:\/.*)?$/, 'jose', 'marked', 'nodemailer'],
      },
    },
  },
});
