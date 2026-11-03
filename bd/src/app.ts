import type { RequestHandler } from 'express';

import cookieParser from 'cookie-parser';
import cors from 'cors';
import express, { type Express } from 'express';
import * as helmetModule from 'helmet';

// Ambient Express augmentation (Request.user) — imported for its type
// side effects so it loads even when only entry files are compiled
// (e.g. Vercel's Node builder builds with `files` only).
import type {} from './types/express.js';

import { API_PREFIX } from './config/constants.js';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { notFound } from './middleware/notFound.js';
import { apiLimiter } from './middleware/rateLimiter.js';
import { requestLogger } from './middleware/requestLogger.js';
import { healthRouter } from './routes/health.routes.js';
import { apiRouter } from './routes/index.js';

// helmet ships ESM-style declarations with no `export =`; under Vercel's
// Node builder both the default import and `.default` end up typed as the
// module namespace (not callable). Sidestep its declarations entirely and
// type the binding ourselves. At runtime `default` exists in both the CJS
// build (its shim re-exports itself as `.default`) and the ESM build.
type HelmetMiddleware = () => RequestHandler;
const helmet = (helmetModule.default ?? helmetModule) as unknown as HelmetMiddleware;

export function buildApp(): Express {
  const app = express();

  app.disable('x-powered-by');
  // Vercel terminates TLS and forwards the client address to Express.
  // Trust the platform proxy so rate-limiters can safely resolve req.ip.
  app.set('trust proxy', 1);
  if (!env.isTest) {
    app.use(requestLogger);
  }
  app.use(helmet());

  // Liveness/readiness for hosting platforms & load balancers (outside the versioned
  // API). Mounted BEFORE the CORS allowlist on purpose — health checks must
  // answer any origin with a plain success/failure message.
  app.use('/health', healthRouter);

  // Plain success response for the bare domain — service-is-up check.
  app.get('/', (_req, res) => {
    res.json({
      service: 'ufeedu-api',
      success: true,
      timestamp: new Date().toISOString(),
    });
  });

  app.use(cors(corsOptions));
  app.use(express.json({ limit: '1mb' }));
  app.use(cookieParser());

  // Versioned API surface, rate limited as a whole.
  app.use(API_PREFIX, apiLimiter, apiRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
