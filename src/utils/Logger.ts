/**
 * Logging utilities
 * Re-exports StructuredLogger functions for backward compatibility
 *
 * ISO/IEC 25010 compliant - maintainable, reliable
 */

import {
  logDebug as structuredLogDebug,
  logInfo as structuredLogInfo,
  logWarn as structuredLogWarn,
  logError as structuredLogError,
  logger,
  createLogger,
  LogLevel,
  StructuredLogger,
} from './StructuredLogger.js';

import type { LogContext, LogEntry, LoggerConfig } from './StructuredLogger.js';

// Re-export all from StructuredLogger
export {
  logger,
  createLogger,
  LogLevel,
  StructuredLogger,
};

export type { LogContext, LogEntry, LoggerConfig };

// Backward-compatible function exports
export const logDebug = structuredLogDebug;
export const logInfo = structuredLogInfo;
export const logWarn = structuredLogWarn;
export const logError = structuredLogError;

export type SimplifiedLogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Generic logger function for backward compatibility
 */
export const log = (level: SimplifiedLogLevel, message: string): void => {
  switch (level) {
    case 'debug':
      structuredLogDebug(message);
      break;
    case 'info':
      structuredLogInfo(message);
      break;
    case 'warn':
      structuredLogWarn(message);
      break;
    case 'error':
      structuredLogError(message);
      break;
  }
};
