export class DebugLogger {
  private static readonly STYLES = {
    header: 'background: #2b2b2b; color: #fff; padding: 2px 5px; border-radius: 2px; font-weight: bold;',
    input: 'color: #3b82f6; font-weight: bold;',
    process: 'color: #eab308; font-weight: bold;',
    output: 'color: #22c55e; font-weight: bold;',
    db: 'background: #f43f5e; color: #fff; padding: 2px 5px; border-radius: 2px; font-weight: bold;',
    error: 'background: #ef4444; color: #fff; padding: 2px 5px; border-radius: 2px; font-weight: bold;',
  };

  /**
   * Start a new log group
   */
  static group(name: string, data?: Record<string, unknown>) {
    console.group(`%c ⬛ [${name}]`, DebugLogger.STYLES.header);
    if (data) {
      console.log('Context:', data);
    }
  }

  /**
   * End the current log group
   */
  static groupEnd() {
    console.groupEnd();
  }

  /**
   * Log an input step (Arguments, Initial State)
   */
  static input(message: string, data: unknown) {
    console.log(`%c 📥 [INPUT] ${message}`, DebugLogger.STYLES.input, data);
  }

  /**
   * Log a processing step (Calculations, Logic)
   */
  static process(message: string, data?: unknown) {
    console.log(`%c ⚙️ [PROCESS] ${message}`, DebugLogger.STYLES.process, data || '');
  }

  /**
   * Log an output step (Return values, Final State)
   */
  static output(message: string, data: unknown) {
    console.log(`%c 📤 [OUTPUT] ${message}`, DebugLogger.STYLES.output, data);
  }

  /**
   * Log a database operation request
   */
  static db(operation: string, table: string, data: unknown) {
    console.log(
      `%c 💾 [DB: ${operation.toUpperCase()} -> ${table}]`,
      DebugLogger.STYLES.db,
      data
    );
  }

  /**
   * Log an error
   */
  static error(message: string, error: unknown) {
    console.log(`%c ❌ [ERROR] ${message}`, DebugLogger.STYLES.error, error);
  }

  /**
   * Quick table view
   */
  static table(data: unknown) {
    console.table(data);
  }
}
