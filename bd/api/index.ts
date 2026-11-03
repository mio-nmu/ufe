import { buildApp } from '../src/app.js';

/**
 * Vercel serverless entry: exporting the Express app lets @vercel/node
 * forward every request to it. (src/index.ts keeps the long-lived
 * `app.listen` form for local dev and long-running hosts — never import it here.)
 */
export default buildApp();
