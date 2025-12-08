/**
 * Logging utilities
 * Provides debug and general logging functionality
 */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
/**
 * Log debug messages if debug mode is enabled
 */
export declare const logDebug: (message: string) => void;
/**
 * Log info messages
 */
export declare const logInfo: (message: string) => void;
/**
 * Log warning messages
 */
export declare const logWarn: (message: string) => void;
/**
 * Log error messages
 */
export declare const logError: (message: string) => void;
/**
 * Generic logger function
 */
export declare const log: (level: LogLevel, message: string) => void;
//# sourceMappingURL=Logger.d.ts.map