import { startTestDatabase, stopTestDatabase } from './db.js';

/** Vitest global setup for the e2e suite: a fresh in-memory test DB per run. */
export async function setup(): Promise<void> {
  await startTestDatabase();
}

export async function teardown(): Promise<void> {
  await stopTestDatabase();
}
