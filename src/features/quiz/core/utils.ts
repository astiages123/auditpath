export class DebugLogger {
    private static isEnabled = true; // Use true since import.meta.env.DEV might not be available in all envs, or use a safe check.

    private static styles = {
        group: "color: #3b82f6; font-weight: bold;", // blue-500
        input: "color: #a855f7;", // purple-500
        process: "color: #eab308;", // yellow-500
        output: "color: #22c55e;", // green-500
        db: "color: #f97316;", // orange-500
        error: "color: #ef4444; font-weight: bold;", // red-500
    };

    /**
     * Start a new log group
     */
    static group(name: string, data?: Record<string, unknown>) {
        if (!this.isEnabled) return;

        if (typeof console.groupCollapsed === "function") {
            console.groupCollapsed(`%c🔧 ${name}`, this.styles.group);
            if (data) {
                console.log("Details:", data);
            }
        } else {
            console.log(`--- ${name} ---`, data || "");
        }
    }

    /**
     * End the current log group
     */
    static groupEnd() {
        if (!this.isEnabled) return;
        if (typeof console.groupEnd === "function") {
            console.groupEnd();
        }
    }

    /**
     * Log an input step
     */
    static input(message: string, data?: unknown) {
        if (!this.isEnabled) return;
        this.logWithStyle("⬇️ INPUT", message, this.styles.input, data);
    }

    /**
     * Log a processing step
     */
    static process(message: string, data?: unknown) {
        if (!this.isEnabled) return;
        this.logWithStyle("⚡ PROCESS", message, this.styles.process, data);
    }

    /**
     * Log an output step
     */
    static output(message: string, data?: unknown) {
        if (!this.isEnabled) return;
        this.logWithStyle("✅ OUTPUT", message, this.styles.output, data);
    }

    /**
     * Log a database operation request
     */
    static db(operation: string, table: string, data?: unknown) {
        if (!this.isEnabled) return;
        const msg = `${operation} on [${table}]`;
        this.logWithStyle("🗄️ DB", msg, this.styles.db, data);
    }

    /**
     * Log an error
     */
    static error(message: string, error?: unknown) {
        console.error(`%c❌ ERROR: ${message}`, this.styles.error, error);
    }

    /**
     * Quick table view
     */
    static table(data: unknown) {
        if (!this.isEnabled) return;
        console.table(data);
    }

    private static logWithStyle(
        prefix: string,
        message: string,
        style: string,
        data?: unknown,
    ) {
        if (data !== undefined) {
            console.log(`%c${prefix}: ${message}`, style, data);
        } else {
            console.log(`%c${prefix}: ${message}`, style);
        }
    }
}

/**
 * Timer Logic Utility
 */
export function createTimer() {
    let startTime: number | null = null;
    let accumulatedTime = 0;

    return {
        start: () => {
            if (startTime === null) startTime = Date.now();
        },
        stop: () => {
            if (startTime !== null) {
                accumulatedTime += Date.now() - startTime;
                startTime = null;
            }
            return accumulatedTime;
        },
        reset: () => {
            startTime = Date.now();
            accumulatedTime = 0;
        },
        clear: () => {
            startTime = null;
            accumulatedTime = 0;
        },
        getTime: () => {
            if (startTime !== null) {
                return accumulatedTime + (Date.now() - startTime);
            }
            return accumulatedTime;
        },
    };
}
