#!/usr/bin/env node
/**
 * Proves the emulator hook (`apps/web/src/firebase/services.ts`) never reaches a
 * bundle that is deployed.
 *
 * Builds the app three ways, the three a deployment can be (plain, stage,
 * production), each with its own dummy Firebase values that are not `.env.e2e`'s,
 * and fails if any output file holds an address the hook would connect to, the
 * demo project, or the hook's own log line. Then builds `--mode e2e` and requires
 * the same search to find them there, so the check is known to see what it looks
 * for. Every build is plain: no `SENTRY_UPLOAD`, no token.
 *
 * `--deployed-mode=e2e` builds the e2e bundle as if it were the deployed one, and
 * must therefore fail: it is how the check is shown to fail.
 *
 * A bare `http://localhost`, which the Auth SDK and React Router already carry, is
 * allowed; only the strings below are searched for.
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const HOOK_LOG_LINE = 'Firebase: Auth and Firestore are on the local emulators (e2e build).';
const FORBIDDEN = [
  '127.0.0.1',
  'localhost:8080',
  'localhost:9099',
  'demo-across-the-street',
  HOOK_LOG_LINE,
];
/** What an e2e build is known to carry, so the search is shown to see something. */
const EXPECTED_IN_E2E = ['127.0.0.1', 'demo-across-the-street', HOOK_LOG_LINE];

const DUMMY_FIREBASE = {
  VITE_FIREBASE_API_KEY: 'dummy-key',
  VITE_FIREBASE_AUTH_DOMAIN: 'dummy-project.firebaseapp.com',
  VITE_FIREBASE_PROJECT_ID: 'dummy-project',
  VITE_FIREBASE_STORAGE_BUCKET: 'dummy-project.appspot.com',
  VITE_FIREBASE_MESSAGING_SENDER_ID: '111111111111',
  VITE_FIREBASE_APP_ID: '1:111111111111:web:1111111111111111111111',
};

const deployedMode = process.argv.find((arg) => arg.startsWith('--deployed-mode='))?.split('=')[1];

/** The builds that stand for a deployment, as the environment each is made in. */
const DEPLOYED_BUILDS = [
  { name: 'plain', mode: deployedMode ?? 'production', env: {} },
  { name: 'stage', mode: deployedMode ?? 'production', env: { VITE_SENTRY_ENVIRONMENT: 'stage' } },
  {
    name: 'production',
    mode: deployedMode ?? 'production',
    env: { VITE_SENTRY_ENVIRONMENT: 'production' },
  },
];

/** Builds the app into a fresh directory and returns where it is. */
const build = ({ name, mode, env }) => {
  const outDir = mkdtempSync(join(tmpdir(), `leak-${name}-`));
  const childEnv = { ...process.env, ...env };

  // Never an upload, never a token: a plain build.
  delete childEnv.SENTRY_UPLOAD;
  delete childEnv.SENTRY_AUTH_TOKEN;

  // `.env.e2e` supplies its own values in e2e mode; the other builds get dummy ones.
  if (mode !== 'e2e') {
    Object.assign(childEnv, DUMMY_FIREBASE);
    delete childEnv.VITE_USE_EMULATORS;
  } else {
    for (const key of Object.keys(DUMMY_FIREBASE)) {
      delete childEnv[key];
    }
  }

  const result = spawnSync(
    'pnpm',
    [
      '--filter',
      'web',
      'exec',
      'vite',
      'build',
      '--mode',
      mode,
      '--outDir',
      outDir,
      '--emptyOutDir',
    ],
    { cwd: root, env: childEnv, encoding: 'utf8' },
  );

  if (result.status !== 0) {
    console.error(result.stdout, result.stderr);
    throw new Error(`The ${name} build failed.`);
  }

  return outDir;
};

/** Every file under a directory. */
const filesUnder = (dir) =>
  readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);

    return statSync(path).isDirectory() ? filesUnder(path) : [path];
  });

/** Which of the searched strings a build's files hold, and in which file. */
const search = (dir, needles) => {
  const found = new Map();

  for (const file of filesUnder(dir)) {
    const text = readFileSync(file, 'latin1');

    for (const needle of needles) {
      if (text.includes(needle) && !found.has(needle)) {
        found.set(needle, file.slice(dir.length + 1));
      }
    }
  }

  return found;
};

const directories = [];
let failed = false;

try {
  for (const spec of DEPLOYED_BUILDS) {
    const dir = build(spec);

    directories.push(dir);

    const found = search(dir, FORBIDDEN);

    if (found.size === 0) {
      console.log(`ok     ${spec.name} (mode ${spec.mode}): none of ${FORBIDDEN.length} strings`);
    } else {
      failed = true;

      for (const [needle, file] of found) {
        console.error(`LEAK   ${spec.name} (mode ${spec.mode}): "${needle}" is in ${file}`);
      }
    }
  }

  if (deployedMode === undefined) {
    const dir = build({ name: 'e2e', mode: 'e2e', env: {} });

    directories.push(dir);

    const found = search(dir, EXPECTED_IN_E2E);
    const missing = EXPECTED_IN_E2E.filter((needle) => !found.has(needle));

    if (missing.length === 0) {
      console.log(
        `ok     e2e: the search finds all ${EXPECTED_IN_E2E.length} strings it looks for`,
      );
    } else {
      failed = true;
      console.error(`BLIND  e2e build does not hold: ${missing.join(', ')}`);
    }
  }
} finally {
  for (const dir of directories) {
    rmSync(dir, { recursive: true, force: true });
  }
}

process.exit(failed ? 1 : 0);
