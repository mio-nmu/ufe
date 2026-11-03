import type { ErrorRequestHandler } from 'express';

import { ZodError } from 'zod';

import { env } from '../config/env.js';
import { ApiError } from '../lib/ApiError.js';
import { logger } from '../lib/logger.js';

interface PrismaKnownRequestError {
  code: string;
}

/**
 * Central error mapper — the single place that produces the error envelope:
 * { success: false, error: { code, message, details? } }.
 * Stack traces and internals are never leaked in production.
 */
export const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ApiError) {
    res.status(error.statusCode).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.details ? { details: error.details } : {}),
      },
      success: false,
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        details: zodDetails(error),
        message: 'Invalid request data',
      },
      success: false,
    });
    return;
  }

  if (isPrismaKnownError(error)) {
    if (error.code === 'P2002') {
      res.status(409).json({
        error: { code: 'CONFLICT', message: 'A record with this value already exists' },
        success: false,
      });
      return;
    }
    if (error.code === 'P2025') {
      res.status(404).json({
        error: { code: 'NOT_FOUND', message: 'Record not found' },
        success: false,
      });
      return;
    }
  }

  logger.error({ err: error }, 'Unhandled error');
  res.status(500).json({
    error: {
      code: 'INTERNAL_ERROR',
      message: env.isProd
        ? 'Internal server error'
        : error instanceof Error
          ? error.message
          : 'Internal server error',
      // TEMPORARY production diagnostic — names the real cause of 500s so
      // deployment issues are debuggable from the network tab. Remove once
      // the auth write failure is resolved.
      ...(env.isProd
        ? { detail: (error instanceof Error ? error.message : String(error)).slice(0, 300) }
        : {}),
    },
    success: false,
  });
};

function zodDetails(error: ZodError) {
  return error.issues.map((issue) => ({
    message: issue.message,
    path: issue.path.join('.'),
  }));
}

function isPrismaKnownError(error: unknown): error is PrismaKnownRequestError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string' &&
    (error as { code: string }).code.startsWith('P2')
  );
}
