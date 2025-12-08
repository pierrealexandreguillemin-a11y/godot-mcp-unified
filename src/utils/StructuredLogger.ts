/**
 * Structured Logger
 * Production-grade logging with JSON output, log levels, and context
 *
 * ISO/IEC 25010 compliant - maintainable, reliable, efficient
 * Compatible with Winston interface for future migration
 */

export enum LogLevel {
  ERROR = 0,
  WARN = 1,
  INFO = 2,
  DEBUG = 3,
  TRACE = 4,
}

export interface LogContext {
  [key: string]: unknown;
}

export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  requestId?: string;
}

export interface LoggerConfig {
  level: LogLevel;
  json: boolean;
  colorize: boolean;
  includeTimestamp: boolean;
  prefix: string;
}

const LEVEL_NAMES: Record<LogLevel, string> = {
  [LogLevel.ERROR]: 'ERROR',
  [LogLevel.WARN]: 'WARN',
  [LogLevel.INFO]: 'INFO',
  [LogLevel.DEBUG]: 'DEBUG',
  [LogLevel.TRACE]: 'TRACE',
};

const LEVEL_COLORS: Record<LogLevel, string> = {
  [LogLevel.ERROR]: '\x1b[31m', // Red
  [LogLevel.WARN]: '\x1b[33m',  // Yellow
  [LogLevel.INFO]: '\x1b[32m',  // Green
  [LogLevel.DEBUG]: '\x1b[36m', // Cyan
  [LogLevel.TRACE]: '\x1b[90m', // Gray
};

const RESET_COLOR = '\x1b[0m';

/**
 * Structured Logger class
 */
export class StructuredLogger {
  private readonly config: LoggerConfig;
  private readonly childContext: LogContext;

  constructor(config: Partial<LoggerConfig> = {}, childContext: LogContext = {}) {
    this.config = {
      level: config.level ?? (process.env.DEBUG ? LogLevel.DEBUG : LogLevel.INFO),
      json: config.json ?? (process.env.LOG_FORMAT === 'json'),
      colorize: config.colorize ?? (process.stdout.isTTY ?? false),
      includeTimestamp: config.includeTimestamp ?? true,
      prefix: config.prefix ?? '[MCP]',
    };
    this.childContext = childContext;
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): StructuredLogger {
    return new StructuredLogger(this.config, { ...this.childContext, ...context });
  }

  /**
   * Log an error message
   */
  error(message: string, context?: LogContext | Error): void {
    this.log(LogLevel.ERROR, message, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, context?: LogContext): void {
    this.log(LogLevel.WARN, message, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log(LogLevel.INFO, message, context);
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log(LogLevel.DEBUG, message, context);
  }

  /**
   * Log a trace message
   */
  trace(message: string, context?: LogContext): void {
    this.log(LogLevel.TRACE, message, context);
  }

  /**
   * Start a timer for measuring operation duration
   */
  startTimer(operationName: string): TimerHandle {
    const startTime = Date.now();
    return {
      end: (context?: LogContext) => {
        const duration = Date.now() - startTime;
        this.info(`${operationName} completed`, { ...context, duration });
        return duration;
      },
      endWithError: (error: Error, context?: LogContext) => {
        const duration = Date.now() - startTime;
        this.error(`${operationName} failed`, { ...context, duration, error });
        return duration;
      },
    };
  }

  /**
   * Log with a specific level
   */
  private log(level: LogLevel, message: string, contextOrError?: LogContext | Error): void {
    if (level > this.config.level) {
      return;
    }

    let context: LogContext | undefined;
    let error: Error | undefined;

    if (contextOrError instanceof Error) {
      error = contextOrError;
    } else {
      context = contextOrError;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LEVEL_NAMES[level],
      message,
    };

    // Merge contexts
    const mergedContext = { ...this.childContext, ...context };
    if (Object.keys(mergedContext).length > 0) {
      entry.context = mergedContext;
    }

    // Add error details
    if (error) {
      entry.error = {
        name: error.name,
        message: error.message,
        stack: error.stack,
      };
    }

    this.output(level, entry);
  }

  /**
   * Output the log entry
   */
  private output(level: LogLevel, entry: LogEntry): void {
    if (this.config.json) {
      this.outputJson(level, entry);
    } else {
      this.outputText(level, entry);
    }
  }

  /**
   * Output JSON format
   */
  private outputJson(level: LogLevel, entry: LogEntry): void {
    const output = level <= LogLevel.WARN ? console.error : console.log;
    output(JSON.stringify(entry));
  }

  /**
   * Output text format
   */
  private outputText(level: LogLevel, entry: LogEntry): void {
    const output = level <= LogLevel.WARN ? console.error : console.log;
    const parts: string[] = [];

    // Timestamp
    if (this.config.includeTimestamp) {
      parts.push(`[${entry.timestamp}]`);
    }

    // Prefix
    if (this.config.prefix) {
      parts.push(this.config.prefix);
    }

    // Level with optional color
    if (this.config.colorize) {
      parts.push(`${LEVEL_COLORS[level]}${entry.level}${RESET_COLOR}`);
    } else {
      parts.push(entry.level);
    }

    // Message
    parts.push(entry.message);

    // Context
    if (entry.context && Object.keys(entry.context).length > 0) {
      const contextStr = Object.entries(entry.context)
        .map(([k, v]) => `${k}=${formatValue(v)}`)
        .join(' ');
      parts.push(`(${contextStr})`);
    }

    // Duration
    if (entry.context?.duration !== undefined) {
      parts.push(`[${entry.context.duration}ms]`);
    }

    output(parts.join(' '));

    // Error stack
    if (entry.error?.stack) {
      output(this.config.colorize
        ? `${LEVEL_COLORS[LogLevel.ERROR]}${entry.error.stack}${RESET_COLOR}`
        : entry.error.stack
      );
    }
  }

  /**
   * Set the log level
   */
  setLevel(level: LogLevel): void {
    this.config.level = level;
  }

  /**
   * Get the current log level
   */
  getLevel(): LogLevel {
    return this.config.level;
  }

  /**
   * Check if a level would be logged
   */
  isLevelEnabled(level: LogLevel): boolean {
    return level <= this.config.level;
  }
}

export interface TimerHandle {
  end: (context?: LogContext) => number;
  endWithError: (error: Error, context?: LogContext) => number;
}

/**
 * Format a value for text output
 */
function formatValue(value: unknown): string {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'string') return `"${value}"`;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  if (Array.isArray(value)) return `[${value.length} items]`;
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value);
}

/**
 * Default logger instance
 */
export const logger = new StructuredLogger();

/**
 * Create a logger for a specific module
 */
export function createLogger(moduleName: string): StructuredLogger {
  return logger.child({ module: moduleName });
}

/**
 * Convenience exports for backward compatibility with existing Logger.ts
 */
export const logDebug = (message: string, context?: LogContext): void => logger.debug(message, context);
export const logInfo = (message: string, context?: LogContext): void => logger.info(message, context);
export const logWarn = (message: string, context?: LogContext): void => logger.warn(message, context);
export const logError = (message: string, contextOrError?: LogContext | Error): void => logger.error(message, contextOrError);
