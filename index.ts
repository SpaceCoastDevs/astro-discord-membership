import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

import type { AstroIntegration } from 'astro';

export interface MembershipOptions {
  /** Module path, relative to the host project root or a package specifier, that
   * default-exports a MembershipDatabaseAdapter. */
  databaseAdapter: string;
  /** Display name of your community, e.g. "Space Coast Devs". Used in page
   *  titles, email subjects, and Discord webhook notifications. */
  communityName?: string;
  /** Public root URL of the site, e.g. "https://space-coast.dev". Used when
   *  building absolute URLs inside Discord webhook embeds. */
  siteUrl?: string;
  /** Load package-owned baseline and component CSS. Defaults to true. */
  styles?: boolean;
}

export default function membership(options: MembershipOptions): AstroIntegration {
  if (!options.databaseAdapter) {
    throw new Error('astro-discord-membership requires a databaseAdapter module path.');
  }
  const communityName = options.communityName ?? 'My Community';
  const siteUrl = (options.siteUrl ?? '').replace(/\/$/, '');
  const enableStyles = options.styles ?? true;

  return {
    name: 'astro-discord-membership',

    hooks: {
      'astro:config:setup': ({ config, injectRoute, logger, updateConfig }) => {
        const log = logger.fork('astro-discord-membership');

        const databaseAdapter = options.databaseAdapter.startsWith('.')
          ? resolve(config.root.pathname, options.databaseAdapter)
          : options.databaseAdapter;

        const virtualModuleId = 'astro-discord-membership:config';
        const resolvedVirtualModuleId = '\0' + virtualModuleId;

        updateConfig({
          vite: {
            // Expose package files under the `#membership` alias so that
            // host-app components can import shared lib/component modules
            // without hard-coding the node_modules path.
            resolve: {
              alias: [
                {
                  find: '#membership',
                  replacement: fileURLToPath(new URL('./', import.meta.url)),
                },
              ],
            },
            plugins: [
              {
                name: 'vite-plugin-astro-discord-membership-config',
                resolveId(id) {
                  if (id === virtualModuleId) return resolvedVirtualModuleId;
                },
                load(id) {
                  if (id === resolvedVirtualModuleId) {
                    return `
                      import database from ${JSON.stringify(databaseAdapter)};

                      export { database };
                      export const communityName = ${JSON.stringify(communityName)};
                      export const siteUrl = ${JSON.stringify(siteUrl)};
                      export const enableStyles = ${JSON.stringify(enableStyles)};
                    `;
                  }
                },
              },
            ],
          },
        });

        const base = new URL('./routes/', import.meta.url);

        const routes: Array<{ pattern: string; file: string }> = [
          { pattern: '/api/auth/login', file: 'api/auth/login.ts' },
          { pattern: '/api/auth/callback', file: 'api/auth/callback.ts' },
          { pattern: '/api/auth/logout', file: 'api/auth/logout.ts' },
          { pattern: '/api/auth/send-verification', file: 'api/auth/send-verification.ts' },
          { pattern: '/api/auth/verify-code', file: 'api/auth/verify-code.ts' },
          { pattern: '/api/profile', file: 'api/profile.ts' },
          { pattern: '/api/admin/labels', file: 'api/admin/labels.ts' },
          { pattern: '/api/admin/labels/import', file: 'api/admin/labels/import.ts' },
          { pattern: '/api/admin/labels/template', file: 'api/admin/labels/template.ts' },
          { pattern: '/api/admin/labels/sample', file: 'api/admin/labels/sample.ts' },
          { pattern: '/admin/labels', file: 'admin/labels.astro' },
          { pattern: '/members', file: 'members/index.astro' },
          { pattern: '/members/[username]', file: 'members/[username].astro' },
          { pattern: '/profile', file: 'profile/index.astro' },
          { pattern: '/verify-email', file: 'verify-email/index.astro' },
          { pattern: '/verify-email/check', file: 'verify-email/check.astro' },
        ];

        for (const route of routes) {
          injectRoute({
            pattern: route.pattern,
            entrypoint: fileURLToPath(new URL(route.file, base)),
            prerender: false,
          });
        }

        log.info('Routes registered.');
      },
    },
  };
}
