import bcrypt from 'bcrypt';

import { env } from '../src/config/env.js';
import { PrismaClient } from '../src/generated/prisma/client.js';

// Seed runs as a standalone process with its own client instance.
// MongoDB needs no driver adapter — Prisma's built-in driver is used.
const prisma = new PrismaClient();

/**
 * Named staff logins — manager / editor / edumanager. These are ACCOUNT
 * NAMES, not roles: every one of them gets the full admin side. The shared
 * password comes from STAFF_PASSWORD (dev default "9876").
 */
const STAFF_ACCOUNTS = [
  { display: 'Менежер', username: 'manager' },
  { display: 'Редактор', username: 'editor' },
  { display: 'Боловсролын менежер', username: 'edumanager' },
] as const;

async function main(): Promise<void> {
  await ensureUsernameIndex();
  await seedStaffAccounts();

  const staff = await prisma.user.count();
  console.log('✅ Seed complete (bootstrap only — no demo content) —');
  console.log(`   users: ${staff}`);
  console.log('   staff logins: manager / editor / edumanager — all ADMIN, same admin side');
  console.log(`   password: ${env.STAFF_PASSWORD} (STAFF_PASSWORD — rotate before production)`);
}

/**
 * Usernames must be unique ONLY when present — plain (registered) accounts
 * have none. MongoDB's regular unique indexes count null/missing as a
 * value, so this partial index enforces exactly the right constraint.
 * createIndexes is idempotent when the index name matches.
 */
async function ensureUsernameIndex(): Promise<void> {
  await prisma.$runCommandRaw({
    createIndexes: 'User',
    indexes: [
      {
        key: { username: 1 },
        name: 'username_unique_partial',
        partialFilterExpression: { username: { $type: 'string' } },
        unique: true,
      },
    ],
  });
}

async function seedStaffAccounts(): Promise<void> {
  const staffHash = await bcrypt.hash(env.STAFF_PASSWORD, env.BCRYPT_COST);
  for (const account of STAFF_ACCOUNTS) {
    const email = `${account.username}@ufeedu.local`; // internal placeholder — login is by username
    await prisma.user.upsert({
      create: {
        email,
        name: account.display,
        passwordHash: staffHash,
        role: 'ADMIN',
        username: account.username,
      },
      update: {}, // idempotent: never clobber an existing account on re-run
      where: { email }, // email stays the schema-level unique key
    });
  }
}

main()
  .catch((error) => {
    console.error('❌ Seed failed:', error);
    process.exitCode = 1;
  })
  .finally(() => void prisma.$disconnect());
