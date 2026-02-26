/* eslint-disable no-console */
import { env } from '@/utils/env';
import { LogMessage } from '@/types/common';

/**
 * Professional Logger Utility
 *
 * Only logs in development environment to prevent sensitive data leakage in production.
 * All logs are prefixed with [AuditPath] for easy identification in console.
 */

/**
 * Core logger object with environment-aware logging
 */
export const logger = {
  /**
   * Log informational messages (visible in dev only)
   */
  info(message: string, details?: Record<string, unknown>): void {
    if (!env.app.isDev) return;
    console.log(`[AuditPath] ${message}`, details || '');
  },

  /**
   * Log warning messages (visible in dev only)
   */
  warn(message: string, details?: Record<string, unknown>): void {
    if (!env.app.isDev) return;
    console.warn(`[AuditPath] ⚠️ ${message}`, details || '');
  },

  /**
   * Log error messages (visible in dev only)
   * Note: Critical errors should still be sent to error tracking services in production
   */
  error(message: string, details?: Record<string, unknown> | Error): void {
    if (!env.app.isDev) return;

    if (details instanceof Error) {
      console.error(`[AuditPath] ❌ ${message}`, {
        message: details.message,
        stack: details.stack,
      });
    } else {
      console.error(`[AuditPath] ❌ ${message}`, details || '');
    }
  },

  /**
   * Log debug messages with detailed information (visible in dev only)
   * Use this for API responses, data inspection, etc.
   */
  debug(message: string, details?: Record<string, unknown>): void {
    if (!env.app.isDev) return;
    console.debug(`[AuditPath] 🔍 ${message}`, details || '');
  },

  /**
   * Internal method to create a log entry and handle reporting
   */
  _log(_logMessage: LogMessage): void {
    // TODO: Integrate with error tracking service (e.g., Sentry, LogRocket)
    // Example implementation:
    // if (log.level === 'error') {
    //   Sentry.captureException(log.details, { extra: { message: log.message } });
    // }
  },

  /**
   * Create a namespaced logger for specific modules/components
   */
  withPrefix(prefix: string) {
    const wrap =
      (level: 'info' | 'warn' | 'error' | 'debug') =>
      (message: string, details?: Record<string, unknown> | Error) => {
        const fullMessage = `${prefix} ${message}`;

        if (level === 'error') {
          logger.error(fullMessage, details);
        } else {
          logger[level](fullMessage, details as Record<string, unknown>);
        }

        logger._log({
          level,
          message: fullMessage,
          details:
            details instanceof Error
              ? { message: details.message, stack: details.stack }
              : details,
          timestamp: new Date().toISOString(),
        });
      };

    return {
      info: wrap('info'),
      warn: wrap('warn'),
      error: wrap('error'),
      debug: wrap('debug'),
    };
  },
};

/**
 * Legacy compatibility export for systems expecting console-like interface
 */
export const createLogger = (moduleName: string) =>
  logger.withPrefix(`[${moduleName}]`);
