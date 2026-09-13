import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

/**
 * The base Vite config Storybook builds `storybook-static` from
 * (`main.ts`'s `core.builder.options.viteConfigPath`).
 *
 * Deliberately not `apps/web/vite.config.ts`. `@storybook/builder-vite`
 * merges whatever a `viteConfigPath` points at into its own config,
 * `plugins` included, and the app's own config carries plugins that assume
 * the app's build graph rather than Storybook's: `capFirstVisit` weighs a
 * first visit to `/`, `preloadRoomRoute` insists `CreateRoomPage.tsx` and
 * `RoomPage.tsx` are lazy chunks of the SPA's own routing, and
 * `preloadGateScene`/`capSceneImages` read the app's own bundle output. None
 * of that holds for a build whose entries are stories, and every one of them
 * would fail `build-storybook` rather than skip quietly. Left unset, the
 * builder would still find `apps/web/vite.config.ts` on its own — Vite
 * searches the project root for one — so this file has to be named and
 * pointed at explicitly rather than merely left out.
 *
 * What a story does need — React's fast refresh — is the one plugin kept.
 */
export default defineConfig({
  plugins: [react()],
});
