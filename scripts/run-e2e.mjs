#!/usr/bin/env node
/**
 * Runs the end-to-end tests: the Firestore and Auth emulators, the `e2e` build
 * of the app, a preview server for it, and Playwright, in one command.
 *
 * Every port comes from the environment (defaults are what CI uses), so two runs
 * can share a machine. The hub and the logging emulator always start and cannot
 * be switched off, and the Firestore websocket is a port of its own, so they are
 * all set. The Firebase config that carries them is generated at the repository
 * root (the rules path is read relative to it), is git-ignored, and is removed
 * when the run ends. `firebase.json` is not touched.
 */
import { spawnSync } from 'node:child_process';
import { rmSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const port = (name, fallback) => String(Number(process.env[name] ?? fallback));

export const PROJECT_ID = 'demo-across-the-street';

const ports = {
  E2E_FIRESTORE_PORT: port('E2E_FIRESTORE_PORT', 8080),
  E2E_AUTH_PORT: port('E2E_AUTH_PORT', 9099),
  E2E_HUB_PORT: port('E2E_HUB_PORT', 4400),
  E2E_LOGGING_PORT: port('E2E_LOGGING_PORT', 4500),
  E2E_FIRESTORE_WS_PORT: port('E2E_FIRESTORE_WS_PORT', 9150),
  E2E_PREVIEW_PORT: port('E2E_PREVIEW_PORT', 4173),
};

const configPath = resolve(root, `firebase.e2e.${process.pid}.generated.json`);

writeFileSync(
  configPath,
  JSON.stringify(
    {
      firestore: { rules: 'firestore.rules' },
      emulators: {
        firestore: {
          host: '127.0.0.1',
          port: Number(ports.E2E_FIRESTORE_PORT),
          websocketPort: Number(ports.E2E_FIRESTORE_WS_PORT),
        },
        auth: { host: '127.0.0.1', port: Number(ports.E2E_AUTH_PORT) },
        hub: { host: '127.0.0.1', port: Number(ports.E2E_HUB_PORT) },
        logging: { host: '127.0.0.1', port: Number(ports.E2E_LOGGING_PORT) },
        ui: { enabled: false },
        singleProjectMode: true,
      },
    },
    null,
    2,
  ),
);

// `--lighthouse` runs the Lighthouse CI job (apps/web/lighthouserc.cjs, #290)
// inside the same emulators instead of the Playwright tests.
const [first, ...rest] = process.argv.slice(2);
const lighthouse = first === '--lighthouse';
const args = (lighthouse ? rest : process.argv.slice(2)).map(
  (arg) => `'${arg.replaceAll("'", "'\\''")}'`,
);
const inner = lighthouse
  ? `pnpm --filter web run lighthouse ${args.join(' ')}`
  : `pnpm --filter web run test:e2e ${args.join(' ')}`;

let status = 1;

try {
  const result = spawnSync(
    'pnpm',
    [
      'exec',
      'firebase',
      'emulators:exec',
      '--config',
      configPath,
      '--project',
      PROJECT_ID,
      '--only',
      'firestore,auth',
      inner,
    ],
    {
      cwd: root,
      stdio: 'inherit',
      env: {
        ...process.env,
        ...ports,
        // Read by the build (see `.env.e2e`); the process environment wins over the file.
        VITE_EMULATOR_FIRESTORE_PORT: ports.E2E_FIRESTORE_PORT,
        VITE_EMULATOR_AUTH_PORT: ports.E2E_AUTH_PORT,
      },
    },
  );

  status = result.status ?? 1;
} finally {
  rmSync(configPath, { force: true });
}

process.exit(status);
