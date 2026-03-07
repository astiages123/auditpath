import { logger } from './logger';

const getNow = (): (() => number) | null => {
  const performanceApi = globalThis.performance;
  return typeof performanceApi?.now === 'function'
    ? () => performanceApi.now()
    : null;
};

/**
 * Performance measurement utilities for Sapiera.
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
    const now = getNow();
    const start = now?.();
    try {
      const result = await promiseFactory();
      if (now && start !== undefined) {
        logger.metrics(module, funcName, now() - start, 'ok', extraInfo);
      }
      return result;
    } catch (error) {
      if (now && start !== undefined) {
        logger.metrics(module, funcName, now() - start, 'error', extraInfo);
      }
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
    const now = getNow();
    const start = now?.();
    try {
      const result = fn();
      if (now && start !== undefined) {
        logger.metrics(module, funcName, now() - start, 'ok', extraInfo);
      }
      return result;
    } catch (error) {
      if (now && start !== undefined) {
        logger.metrics(module, funcName, now() - start, 'error', extraInfo);
      }
      throw error;
    }
  },
};
