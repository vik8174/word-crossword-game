import { fileURLToPath } from 'node:url';

import type { StorybookConfig } from '@storybook/react-vite';
import type { Plugin } from 'vite';

/** Where each Firebase boundary file's Storybook substitute lives. */
const FIREBASE_CONFIG_MOCK = fileURLToPath(new URL('./mocks/firebase-config.ts', import.meta.url));
const FIREBASE_SERVICES_MOCK = fileURLToPath(
  new URL('./mocks/firebase-services.ts', import.meta.url),
);

/**
 * Substitutes `src/firebase/config.ts` and `src/firebase/services.ts` with
 * their Storybook mocks, at the boundary the project's own testing rule
 * already names rather than inside a component.
 *
 * A plain `resolve.alias` entry cannot do this: `@rollup/plugin-alias`
 * (which Vite's `resolve.alias` is built on) resolves a `RegExp` `find`
 * against a string `replacement` with `importee.replace(find, replacement)`
 * — a partial substring replacement, not "swap the whole specifier". Every
 * importer here uses a *relative* specifier (`../firebase/config` from
 * `telemetry/analytics.ts`, `../firebase/services` from
 * `rooms/room-service.ts`), so that replace left the leading `../` in place
 * ahead of the mock's absolute path, and Vite tried to resolve the result as
 * a path relative to the importer — one directory above this project
 * entirely. A `resolveId` hook returns the id outright, with nothing for a
 * leftover specifier fragment to corrupt.
 *
 * @returns A Vite plugin that resolves either boundary file to its mock,
 * regardless of the importer's own depth under `src/`
 */
const firebaseBoundaryPlugin = (): Plugin => ({
  name: 'storybook:firebase-boundary',
  enforce: 'pre',

  resolveId(source) {
    if (/firebase\/config$/.test(source)) {
      return FIREBASE_CONFIG_MOCK;
    }

    if (/firebase\/services$/.test(source)) {
      return FIREBASE_SERVICES_MOCK;
    }

    return null;
  },
});

/**
 * Storybook, configured so a component or a page renders the way it does in
 * the app: the app's MUI theme, its self-hosted faces, a scene picture
 * behind it, and no Firebase (issue #182).
 *
 * `build-storybook` runs inside the existing **Build** job of `ci.yml` rather
 * than a check of its own — see `package.json`'s `build` script.
 */
const config: StorybookConfig = {
  stories: ['../src/**/*.stories.@(ts|tsx)'],

  // No addon is installed. Controls, actions and docs ship inside `storybook`
  // itself since v8, and the one thing an addon here would otherwise be for —
  // a background swatch — is already the garden's own picture (`preview.tsx`).
  addons: [],

  framework: {
    name: '@storybook/react-vite',
    options: {},
  },

  core: {
    builder: {
      name: '@storybook/builder-vite',
      options: {
        // Not `apps/web/vite.config.ts` — see `.storybook/vite.config.ts` for
        // why merging it verbatim would fail `build-storybook`.
        viteConfigPath: '.storybook/vite.config.ts',
      },
    },
  },

  // The four faces `index.html` preloads and declares are not read by
  // Storybook's own HTML, which is why `preview-head.html` carries a copy.
  staticDirs: ['../public'],

  viteFinal: async (viteConfig) => {
    const { mergeConfig } = await import('vite');

    return mergeConfig(viteConfig, {
      plugins: [firebaseBoundaryPlugin()],
    });
  },
};

export default config;
