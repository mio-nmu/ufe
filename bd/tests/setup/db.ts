import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/**
 * The e2e suite runs against a throwaway in-memory MongoDB (no Docker, no
 * shared server). It is a single-node replica set because Prisma's
 * multi-document transactions require one. The port is fixed so the URL is
 * known before any worker imports the Prisma singleton.
 */
export const TEST_DB_PORT = 27099;
export const TEST_DATABASE_URL = `mongodb://127.0.0.1:${TEST_DB_PORT}/ufeedu_test?directConnection=true`;

let replSet: MongoMemoryReplSet | null = null;

/** Starts a fresh, empty test database and applies the Prisma schema. */
export async function startTestDatabase(): Promise<void> {
  replSet = await MongoMemoryReplSet.create({
    instanceOpts: [{ port: TEST_DB_PORT }],
    replSet: { count: 1, storageEngine: 'wiredTiger' },
  });
  await replSet.waitUntilRunning();

  // The database is brand new every run, so a plain push (no reset) suffices.
  // Async on purpose: this process drains the in-memory mongod's output, and
  // a blocking spawnSync would let that pipe fill and stall the server.
  const status = await new Promise<null | number>((resolve) => {
    spawn(
      process.platform === 'win32' ? 'npx.cmd' : 'npx',
      ['prisma', 'db', 'push', '--skip-generate'],
      {
        cwd: path.resolve(__dirname, '../..'),
        env: { ...process.env, CHECKPOINT_DISABLE: '1', DATABASE_URL: TEST_DATABASE_URL },
        stdio: 'inherit',
        timeout: 120_000,
      },
    ).on('close', resolve);
  });
  if (status !== 0) {
    await stopTestDatabase();
    throw new Error('prisma db push failed for the in-memory test database');
  }
}

/** Stops the in-memory server and deletes its data. */
export async function stopTestDatabase(): Promise<void> {
  await replSet?.stop();
  replSet = null;
}
