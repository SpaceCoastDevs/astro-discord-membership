// TypeScript resolves `#membership/*` imports via the path mappings in
// the host project's tsconfig.json: `"#membership/*": ["node_modules/astro-discord-membership/*"]`.
// No ambient module declarations are needed for that alias.

// Ambient declaration for the virtual config module injected by the integration.
declare module 'astro-discord-membership:config' {
  import type { MembershipDatabaseAdapter } from './types';

  /** Database implementation supplied by the host app. */
  export const database: MembershipDatabaseAdapter;
  /** Display name of the community, configured via the `communityName` option. */
  export const communityName: string;
  /** Public root URL of the site (no trailing slash), configured via the `siteUrl` option. */
  export const siteUrl: string;
  /** Whether package-owned CSS should be injected. */
  export const enableStyles: boolean;
}
