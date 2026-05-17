/**
 * Structured logger for SYNKRO.
 *
 * In production (Vercel), logs are forwarded to the platform's log drain.
 * Locally, all levels print to stderr/stdout with colour and timestamps.
 *
 * Usage:
 *   import { log } from '@/lib/logger';
 *   log.info('Scan started', { repoUrl });
 *   log.error('Clone failed', error);
 */

const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };

const CURRENT_LEVEL =
  LOG_LEVELS[process.env.LOG_LEVEL?.toLowerCase()] ??
  (process.env.NODE_ENV === 'production' ? LOG_LEVELS.info : LOG_LEVELS.debug);

function formatMeta(meta) {
  if (!meta) return '';
  if (meta instanceof Error) {
    return ` | ${meta.message}${meta.stack ? `\n${meta.stack}` : ''}`;
  }
  try {
    return ` | ${JSON.stringify(meta)}`;
  } catch {
    return ` | [unserializable]`;
  }
}

function emit(level, tag, message, meta) {
  if (LOG_LEVELS[level] < CURRENT_LEVEL) return;

  const ts = new Date().toISOString();
  const prefix = `[${ts}] [${level.toUpperCase()}] [${tag}]`;
  const line = `${prefix} ${message}${formatMeta(meta)}`;

  switch (level) {
    case 'error':
      console.error(line);  // eslint-disable-line no-console
      break;
    case 'warn':
      console.warn(line);   // eslint-disable-line no-console
      break;
    default:
      console.log(line);    // eslint-disable-line no-console
  }
}

/**
 * Create a scoped logger with a fixed tag.
 * @param {string} tag – e.g. 'scan', 'clone', 'gemini'
 */
export function createLogger(tag) {
  return {
    debug: (msg, meta) => emit('debug', tag, msg, meta),
    info:  (msg, meta) => emit('info',  tag, msg, meta),
    warn:  (msg, meta) => emit('warn',  tag, msg, meta),
    error: (msg, meta) => emit('error', tag, msg, meta),
  };
}

/** Default logger (tag = 'app') */
export const log = createLogger('app');
