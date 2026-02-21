/**
 * Global application constants.
 * Feature-specific constants have been moved to their respective feature directories.
 */

// Session validity duration in milliseconds (12 hours)
export const SESSION_VALIDITY_DURATION_MS = 12 * 60 * 60 * 1000;

// Default storage TTL (24 hours)
export const DEFAULT_STORAGE_TTL_MS = 24 * 60 * 60 * 1000;

// Offline queue TTL (7 days)
export const OFFLINE_QUEUE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// Virtual day start hour (04:00 AM)
export const VIRTUAL_DAY_START_HOUR = 4;

// LLM request timeout (90 seconds)
export const LLM_TIMEOUT_MS = 90000;
