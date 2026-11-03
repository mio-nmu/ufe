import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  ADMIN_PIN_CODE: z.string().default(''),
  AUTH_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(20),
  BCRYPT_COST: z.coerce.number().int().min(4).max(15).default(12),
  CLOUDINARY_API_KEY: z.string().default(''),
  CLOUDINARY_API_SECRET: z.string().default(''),
  CLOUDINARY_CLOUD_NAME: z.string().default(''),
  CLOUDINARY_FOLDER: z.string().default(''),
  COOKIE_DOMAIN: z.string().optional(),
  CORS_ORIGIN: z.string().default('http://localhost:3000'),
  // mongodb://user:pass@host:port/database — photo/video binaries live in
  // Cloudinary, not here; MongoDB holds structured data only.
  DATABASE_URL: z.string().min(1, 'is required — copy .env.example to .env (see README)'),
  JWT_ACCESS_SECRET: z.string().min(32, 'must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'must be at least 32 characters'),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  MAX_UPLOAD_MB: z.coerce.number().int().min(1).max(50).default(20),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PIN_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(5),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  // Generous: the live scorer fires 2-3 requests per click (action + event
  // refresh + SSE-triggered refetch) and a busy game burns hundreds fast;
  // credential and upload routes keep their own stricter limiters.
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(2000),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(900_000),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().min(1).max(90).default(7),
  // Shared password of the three named staff accounts (manager / editor /
  // edumanager). Short by request for now — rotate before production.
  STAFF_PASSWORD: z.string().min(1).default('9876'),
  STORAGE_PROVIDER: z.string().default(''), // '' (disabled) | 'cloudinary'
});

export const env = loadEnv();

function loadEnv() {
  const raw: NodeJS.ProcessEnv = { ...process.env };
  for (const key of Object.keys(raw)) {
    const value = raw[key];
    if (typeof value === 'string') {
      raw[key] = normalizeEnvValue(value);
    }
  }

  const parsed = envSchema.safeParse(raw);

  if (!parsed.success) {
    abortEnv(
      parsed.error.issues.map((issue) => `${issue.path.join('.') || '(root)'}: ${issue.message}`),
    );
  }

  const data = parsed.data;
  const storageProblems = checkStorage(data);
  if (storageProblems.length > 0) {
    abortEnv(storageProblems);
  }
  const pinProblems = checkPin(data);
  if (pinProblems.length > 0) {
    abortEnv(pinProblems);
  }

  return {
    ...data,
    COOKIE_DOMAIN: normalizeCookieDomain(data.COOKIE_DOMAIN),
    // Origins are compared verbatim against the browser's Origin header,
    // which never carries a trailing slash — normalize pasted values.
    CORS_ORIGINS: data.CORS_ORIGIN.split(',')
      .map((origin) => origin.trim().replace(/\/+$/u, ''))
      .filter(Boolean),
    isDev: data.NODE_ENV === 'development',
    isProd: data.NODE_ENV === 'production',
    isTest: data.NODE_ENV === 'test',
    storageConfigured: data.STORAGE_PROVIDER !== '',
  };
}

/**
 * Dashboard env fields (Vercel/Heroku) keep pasted quotes literally —
 * `DATABASE_URL="mongodb+srv://…"` then fails provider validation and
 * `CORS_ORIGIN="https://…"` never matches an Origin. Strip one layer of
 * matching surrounding quotes and outer whitespace from every value.
 */
function normalizeEnvValue(value: string): string {
  const trimmed = value.trim();
  const quoted = /^(["'])(.*)\1$/u.exec(trimmed);
  return quoted?.[2] ?? trimmed;
}

/** Prints collected problems and kills the process — env errors are never recoverable. */
function abortEnv(problems: string[]): never {
  console.error('❌ Invalid or missing environment variables:');
  for (const problem of problems) {
    console.error(`   • ${problem}`);
  }
  console.error('   Fix bd/.env (see bd/.env.example) and restart.');
  process.exit(1);
}

/**
 * Media storage is configured all-or-nothing: selecting a provider with
 * half-set credentials must fail at boot, not at the first upload. An empty
 * STORAGE_PROVIDER disables the media endpoints (503) — useful for content-only
 * development without a storage account.
 */
function checkStorage(data: z.infer<typeof envSchema>): string[] {
  const cloudinaryKeys = [
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_FOLDER',
  ] as const;
  const provided = cloudinaryKeys.filter((key) => data[key].trim() !== '');
  const problems: string[] = [];

  if (data.STORAGE_PROVIDER !== '' && data.STORAGE_PROVIDER !== 'cloudinary') {
    problems.push("STORAGE_PROVIDER: must be 'cloudinary' or empty (disabled)");
  }
  if (data.STORAGE_PROVIDER === 'cloudinary' && provided.length < cloudinaryKeys.length) {
    problems.push(
      `STORAGE_PROVIDER=cloudinary requires all four CLOUDINARY_* variables — got ${provided.length} of 4`,
    );
  }
  if (data.STORAGE_PROVIDER === '' && provided.length > 0) {
    problems.push(
      `CLOUDINARY_* variables are set but STORAGE_PROVIDER is empty — set it to 'cloudinary' or clear them`,
    );
  }

  return problems;
}

/**
 * The admin PIN is a dev convenience: 4–8 digits, or empty (disabled). The
 * obvious default "1234" is legal in development only.
 */
function checkPin(data: z.infer<typeof envSchema>): string[] {
  const problems: string[] = [];

  if (data.ADMIN_PIN_CODE !== '' && !/^\d{4,8}$/.test(data.ADMIN_PIN_CODE)) {
    problems.push('ADMIN_PIN_CODE: must be 4–8 digits, or empty to disable PIN login');
  }
  if (data.NODE_ENV === 'production' && data.ADMIN_PIN_CODE === '1234') {
    problems.push(
      'ADMIN_PIN_CODE: change the default before production, or empty it to disable PIN login',
    );
  }

  return problems;
}

/**
 * The cookie `domain` option must be a bare hostname — a pasted URL
 * (`https://site.vercel.app`) makes res.cookie() throw "option domain is
 * invalid" on every successful login. Extract the hostname when a URL was
 * pasted and disable (empty) anything still malformed.
 */
function normalizeCookieDomain(value: string | undefined): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';
  let host = raw;
  if (host.includes('://') || host.includes('/')) {
    try {
      host = new URL(raw).hostname;
    } catch {
      return '';
    }
  }
  host = host.replace(/^\.+/u, '').toLowerCase();
  return /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/u.test(host)
    ? host
    : '';
}
