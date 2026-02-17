/* eslint-disable no-console */
import { logger } from '@/utils/logger';

export class DebugLogger {
  private static hasGroupSupport(): boolean {
    return typeof console !== 'undefined' && 'groupCollapsed' in console;
  }

  private static hasTableSupport(): boolean {
    return typeof console !== 'undefined' && 'table' in console;
  }

  /**
   * Start a new log group
   */
  static group(name: string, data?: Record<string, unknown>) {
    if (!this.hasGroupSupport()) {
      logger.debug(`--- ${name} ---`, data);
      return;
    }
    console.groupCollapsed(`🔧 ${name}`);
    if (data) {
      logger.debug('Details:', data);
    }
  }

  /**
   * End the current log group
   */
  static groupEnd() {
    if (!this.hasGroupSupport()) return;
    console.groupEnd();
  }

  /**
   * Log an input step
   */
  static input(message: string, data?: Record<string, unknown>) {
    logger.debug(`⬇️ INPUT: ${message}`, data);
  }

  /**
   * Log a processing step
   */
  static process(message: string, data?: Record<string, unknown>) {
    logger.debug(`⚡ PROCESS: ${message}`, data);
  }

  /**
   * Log an output step
   */
  static output(message: string, data?: Record<string, unknown>) {
    logger.debug(`✅ OUTPUT: ${message}`, data);
  }

  /**
   * Log a database operation request
   */
  static db(operation: string, table: string, data?: Record<string, unknown>) {
    logger.debug(`🗄️ DB: ${operation} on [${table}]`, data);
  }

  /**
   * Log an error using central logger
   */
  static error(message: string, error?: unknown) {
    logger.error(`❌ ERROR: ${message}`, { error });
  }

  /**
   * Quick table view
   */
  static table(data: Record<string, unknown> | unknown[]) {
    if (!this.hasTableSupport()) {
      logger.debug('Table:', { data });
      return;
    }
    console.table(data);
  }
}
