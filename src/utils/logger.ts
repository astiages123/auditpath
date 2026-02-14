import { env } from '@/utils/env';

/**
 * Professional Logger Utility
 *
 * Only logs in development environment to prevent sensitive data leakage in production.
 * All logs are prefixed with [AuditPath] for easy identification in console.
 */

export type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export interface LogMessage {
  level: LogLevel;
  message: string;
  details?: Record<string, unknown>;
  timestamp: string;
}

/**
 * Core logger object with environment-aware logging
 */
export const logger = {
  /**
   * Log informational messages (visible in dev only)
   */
  info(message: string, details?: Record<string, unknown>): void {
    if (!env.app.isDev) return;
    // eslint-disable-next-line no-console
    console.log(`[AuditPath] ${message}`, details || '');
  },

  /**
   * Log warning messages (visible in dev only)
   */
  warn(message: string, details?: Record<string, unknown>): void {
    if (!env.app.isDev) return;
    // eslint-disable-next-line no-console
    console.warn(`[AuditPath] ⚠️ ${message}`, details || '');
  },

  /**
   * Log error messages (visible in dev only)
   * Note: Critical errors should still be sent to error tracking services in production
   */
  error(message: string, details?: Record<string, unknown> | Error): void {
    if (!env.app.isDev) return;

    if (details instanceof Error) {
      // eslint-disable-next-line no-console
      console.error(`[AuditPath] ❌ ${message}`, {
        message: details.message,
        stack: details.stack,
      });
    } else {
      // eslint-disable-next-line no-console
      console.error(`[AuditPath] ❌ ${message}`, details || '');
    }
  },

  /**
   * Log debug messages with detailed information (visible in dev only)
   * Use this for API responses, data inspection, etc.
   */
  debug(message: string, details?: Record<string, unknown>): void {
    if (!env.app.isDev) return;
    // eslint-disable-next-line no-console
    console.debug(`[AuditPath] 🔍 ${message}`, details || '');
  },

  /**
   * Create a namespaced logger for specific modules/components
   * Usage: const log = logger.withPrefix('[QuizAPI]');
   */
  withPrefix(prefix: string) {
    return {
      info: (message: string, details?: Record<string, unknown>) => {
        logger.info(`${prefix} ${message}`, details);
      },
      warn: (message: string, details?: Record<string, unknown>) => {
        logger.warn(`${prefix} ${message}`, details);
      },
      error: (message: string, details?: Record<string, unknown> | Error) => {
        logger.error(`${prefix} ${message}`, details);
      },
      debug: (message: string, details?: Record<string, unknown>) => {
        logger.debug(`${prefix} ${message}`, details);
      },
    };
  },
};

/**
 * Legacy compatibility export for systems expecting console-like interface
 */
export const createLogger = (moduleName: string) =>
  logger.withPrefix(`[${moduleName}]`);
