import type { Server } from 'node:http';

import { buildApp } from './app.js';
import { env } from './config/env.js';
import { logger } from './lib/logger.js';
import { prisma } from './lib/prisma.js';

const app = buildApp();

const server: Server = app.listen(env.PORT, () => {
  logger.info(`ufeedu API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
});

let shuttingDown = false;

async function shutdown(reason: string, exitCode: number): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  logger.info(`${reason} received — shutting down gracefully`);

  // Stop accepting new connections (open live-game streams included), then
  // close the DB pool.
  server.close(() => logger.info('HTTP server closed'));
  server.closeAllConnections();

  try {
    await prisma.$disconnect();
    logger.info('Prisma disconnected');
  } catch (error) {
    logger.error({ err: error }, 'Error during Prisma disconnect');
  }
  process.exit(exitCode);
}

process.on('SIGTERM', () => void shutdown('SIGTERM', 0));
process.on('SIGINT', () => void shutdown('SIGINT', 0));
// SIGHUP is ignored: detached/dev processes commonly receive it when the
// spawning terminal goes away — that must not stop the API. Explicit
// shutdown remains available via SIGTERM/SIGINT.
process.on('SIGHUP', () => logger.warn('SIGHUP received — ignored'));

// Last-resort safety nets: log, then shut down — never keep running in a
// corrupted state, never let a rejection bubble to the default crash handler.
process.on('uncaughtException', (error) => {
  logger.fatal({ err: error }, 'uncaughtException');
  void shutdown('uncaughtException', 1);
});
process.on('unhandledRejection', (reason) => {
  logger.fatal({ err: reason }, 'unhandledRejection');
  void shutdown('unhandledRejection', 1);
});
