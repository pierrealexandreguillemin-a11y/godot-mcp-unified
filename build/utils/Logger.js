/**
 * Logging utilities
 * Provides debug and general logging functionality
 */
import { DEBUG_MODE } from '../config/config.js';
/**
 * Log debug messages if debug mode is enabled
 */
export const logDebug = (message) => {
    if (DEBUG_MODE) {
        console.debug(`[DEBUG] ${message}`);
    }
};
/**
 * Log info messages
 */
export const logInfo = (message) => {
    console.log(`[INFO] ${message}`);
};
/**
 * Log warning messages
 */
export const logWarn = (message) => {
    console.warn(`[WARN] ${message}`);
};
/**
 * Log error messages
 */
export const logError = (message) => {
    console.error(`[ERROR] ${message}`);
};
/**
 * Generic logger function
 */
export const log = (level, message) => {
    switch (level) {
        case 'debug':
            logDebug(message);
            break;
        case 'info':
            logInfo(message);
            break;
        case 'warn':
            logWarn(message);
            break;
        case 'error':
            logError(message);
            break;
    }
};
//# sourceMappingURL=Logger.js.map