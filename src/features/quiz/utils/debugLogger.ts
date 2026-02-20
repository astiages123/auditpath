/* eslint-disable no-console */
import { logger } from '@/utils/logger';

export class DebugLogger {
  private static hasGroupSupport(): boolean {
    return typeof console !== 'undefined' && 'groupCollapsed' in console;
  }

  private static hasTableSupport(): boolean {
    return typeof console !== 'undefined' && 'table' in console;
  }

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

  static groupEnd() {
    if (!this.hasGroupSupport()) return;
    console.groupEnd();
  }

  static input(message: string, data?: Record<string, unknown>) {
    logger.debug(`⬇️ INPUT: ${message}`, data);
  }

  static process(message: string, data?: Record<string, unknown>) {
    logger.debug(`⚡ PROCESS: ${message}`, data);
  }

  static output(message: string, data?: Record<string, unknown>) {
    logger.debug(`✅ OUTPUT: ${message}`, data);
  }

  static db(operation: string, table: string, data?: Record<string, unknown>) {
    logger.debug(`🗄️ DB: ${operation} on [${table}]`, data);
  }

  static error(message: string, error?: unknown) {
    logger.error(`❌ ERROR: ${message}`, { error });
  }

  static table(data: Record<string, unknown> | unknown[]) {
    if (!this.hasTableSupport()) {
      logger.debug('Table:', { data });
      return;
    }
    console.table(data);
  }
}
