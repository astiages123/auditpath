import { logger } from './logger';

/**
 * Performance measurement utilities for AuditPath.
 * Helps track execution time of sync and async operations.
 */
export const performanceMonitor = {
  /**
   * Measures the execution time of an asynchronous function.
   *
   * @param module - The module name for logging
   * @param funcName - The function name for logging
   * @param promiseFactory - A function that returns the promise to measure
   * @param extraInfo - Optional extra string for the log
   */
  async measurePromise<T>(
    module: string,
    funcName: string,
    promiseFactory: () => Promise<T>,
    extraInfo?: string
  ): Promise<T> {
    const start = window.performance.now();
    try {
      const result = await promiseFactory();
      const end = window.performance.now();
      logger.metrics(module, funcName, end - start, 'ok', extraInfo);
      return result;
    } catch (error) {
      const end = window.performance.now();
      logger.metrics(module, funcName, end - start, 'error', extraInfo);
      throw error;
    }
  },

  /**
   * Measures the execution time of a synchronous function.
   */
  measureSync<T>(
    module: string,
    funcName: string,
    fn: () => T,
    extraInfo?: string
  ): T {
    const start = window.performance.now();
    try {
      const result = fn();
      const end = window.performance.now();
      logger.metrics(module, funcName, end - start, 'ok', extraInfo);
      return result;
    } catch (error) {
      const end = window.performance.now();
      logger.metrics(module, funcName, end - start, 'error', extraInfo);
      throw error;
    }
  },
};
