/**
 * Audit Logger
 * ISO/IEC 27001 compliant security event logging
 *
 * Provides structured audit trail for:
 * - Tool executions
 * - Security events (validation failures, access attempts)
 * - System events (startup, shutdown, errors)
 */

import { DEBUG_CONFIG } from './config.js';

/**
 * Audit event severity levels
 */
export enum AuditSeverity {
  INFO = 'INFO',
  WARN = 'WARN',
  ERROR = 'ERROR',
  CRITICAL = 'CRITICAL',
}

/**
 * Audit event categories
 */
export enum AuditCategory {
  TOOL_EXECUTION = 'TOOL_EXECUTION',
  SECURITY = 'SECURITY',
  VALIDATION = 'VALIDATION',
  SYSTEM = 'SYSTEM',
  PROCESS = 'PROCESS',
}

/**
 * Structured audit event
 */
export interface AuditEvent {
  timestamp: string;
  eventId: string;
  category: AuditCategory;
  severity: AuditSeverity;
  action: string;
  details: Record<string, unknown>;
  outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED';
  duration?: number;
}

/**
 * Audit logger interface for pluggable backends
 */
export interface AuditBackend {
  log(event: AuditEvent): void;
  flush?(): Promise<void>;
}

/**
 * Console audit backend (default)
 */
class ConsoleAuditBackend implements AuditBackend {
  log(event: AuditEvent): void {
    const prefix = `[AUDIT:${event.severity}]`;
    const message = `${prefix} ${event.timestamp} [${event.category}] ${event.action} - ${event.outcome}`;

    switch (event.severity) {
      case AuditSeverity.ERROR:
      case AuditSeverity.CRITICAL:
        console.error(message, event.details);
        break;
      case AuditSeverity.WARN:
        console.warn(message, event.details);
        break;
      default:
        console.log(message, event.details);
    }
  }
}

/**
 * In-memory audit backend for testing/debugging
 */
export class MemoryAuditBackend implements AuditBackend {
  private events: AuditEvent[] = [];
  private maxEvents: number;

  constructor(maxEvents = 10000) {
    this.maxEvents = maxEvents;
  }

  log(event: AuditEvent): void {
    this.events.push(event);
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents / 2);
    }
  }

  getEvents(): AuditEvent[] {
    return [...this.events];
  }

  getEventsByCategory(category: AuditCategory): AuditEvent[] {
    return this.events.filter((e) => e.category === category);
  }

  getEventsBySeverity(severity: AuditSeverity): AuditEvent[] {
    return this.events.filter((e) => e.severity === severity);
  }

  clear(): void {
    this.events = [];
  }
}

/**
 * Audit Logger Singleton
 */
class AuditLogger {
  private backend: AuditBackend;
  private enabled: boolean;
  private eventCounter: number = 0;

  constructor() {
    this.backend = new ConsoleAuditBackend();
    this.enabled = DEBUG_CONFIG.AUDIT_LOGGING_ENABLED;
  }

  /**
   * Set custom audit backend
   */
  setBackend(backend: AuditBackend): void {
    this.backend = backend;
  }

  /**
   * Enable or disable audit logging
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if audit logging is enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Generate unique event ID
   */
  private generateEventId(): string {
    return `EVT-${Date.now()}-${(++this.eventCounter).toString(36).padStart(4, '0')}`;
  }

  /**
   * Log an audit event (internal)
   */
  private logInternal(event: Omit<AuditEvent, 'timestamp' | 'eventId'>): void {
    if (!this.enabled) return;

    const fullEvent: AuditEvent = {
      ...event,
      timestamp: new Date().toISOString(),
      eventId: this.generateEventId(),
    };

    this.backend.log(fullEvent);
  }

  /**
   * Log a custom audit event (public API for extensibility)
   * Use this for custom events not covered by specific methods
   */
  logEvent(
    category: AuditCategory,
    severity: AuditSeverity,
    action: string,
    details: Record<string, unknown>,
    outcome: 'SUCCESS' | 'FAILURE' | 'BLOCKED',
    duration?: number
  ): void {
    this.logInternal({ category, severity, action, details, outcome, duration });
  }

  // ===== Tool Execution Events =====

  /**
   * Log tool execution start
   */
  toolStart(toolName: string, params: Record<string, unknown>): string {
    const eventId = this.generateEventId();
    this.logInternal({
      category: AuditCategory.TOOL_EXECUTION,
      severity: AuditSeverity.INFO,
      action: `TOOL_START:${toolName}`,
      details: { toolName, params: this.sanitizeParams(params) },
      outcome: 'SUCCESS',
    });
    return eventId;
  }

  /**
   * Log tool execution success
   */
  toolSuccess(toolName: string, duration: number): void {
    this.logInternal({
      category: AuditCategory.TOOL_EXECUTION,
      severity: AuditSeverity.INFO,
      action: `TOOL_SUCCESS:${toolName}`,
      details: { toolName },
      outcome: 'SUCCESS',
      duration,
    });
  }

  /**
   * Log tool execution failure
   */
  toolFailure(toolName: string, error: string, duration: number): void {
    this.logInternal({
      category: AuditCategory.TOOL_EXECUTION,
      severity: AuditSeverity.ERROR,
      action: `TOOL_FAILURE:${toolName}`,
      details: { toolName, error },
      outcome: 'FAILURE',
      duration,
    });
  }

  // ===== Security Events =====

  /**
   * Log validation failure (potential attack)
   */
  validationFailure(context: string, input: string, reason: string): void {
    this.logInternal({
      category: AuditCategory.SECURITY,
      severity: AuditSeverity.WARN,
      action: 'VALIDATION_FAILURE',
      details: {
        context,
        input: this.truncate(input, 100),
        reason,
      },
      outcome: 'BLOCKED',
    });
  }

  /**
   * Log path traversal attempt
   */
  pathTraversalAttempt(path: string, context: string): void {
    this.logInternal({
      category: AuditCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
      action: 'PATH_TRAVERSAL_ATTEMPT',
      details: {
        path: this.truncate(path, 200),
        context,
      },
      outcome: 'BLOCKED',
    });
  }

  /**
   * Log command injection attempt
   */
  commandInjectionAttempt(command: string, args: string[]): void {
    this.logInternal({
      category: AuditCategory.SECURITY,
      severity: AuditSeverity.CRITICAL,
      action: 'COMMAND_INJECTION_ATTEMPT',
      details: {
        command,
        args: args.map((a) => this.truncate(a, 50)),
      },
      outcome: 'BLOCKED',
    });
  }

  // ===== Process Events =====

  /**
   * Log process spawn
   */
  processSpawn(command: string, pid: number | undefined): void {
    this.logInternal({
      category: AuditCategory.PROCESS,
      severity: AuditSeverity.INFO,
      action: 'PROCESS_SPAWN',
      details: { command, pid },
      outcome: 'SUCCESS',
    });
  }

  /**
   * Log process timeout
   */
  processTimeout(command: string, timeout: number): void {
    this.logInternal({
      category: AuditCategory.PROCESS,
      severity: AuditSeverity.WARN,
      action: 'PROCESS_TIMEOUT',
      details: { command, timeout },
      outcome: 'FAILURE',
    });
  }

  /**
   * Log process kill
   */
  processKill(command: string, reason: string): void {
    this.logInternal({
      category: AuditCategory.PROCESS,
      severity: AuditSeverity.WARN,
      action: 'PROCESS_KILL',
      details: { command, reason },
      outcome: 'SUCCESS',
    });
  }

  // ===== System Events =====

  /**
   * Log system startup
   */
  systemStartup(version: string): void {
    this.logInternal({
      category: AuditCategory.SYSTEM,
      severity: AuditSeverity.INFO,
      action: 'SYSTEM_STARTUP',
      details: { version },
      outcome: 'SUCCESS',
    });
  }

  /**
   * Log system shutdown
   */
  systemShutdown(reason: string): void {
    this.logInternal({
      category: AuditCategory.SYSTEM,
      severity: AuditSeverity.INFO,
      action: 'SYSTEM_SHUTDOWN',
      details: { reason },
      outcome: 'SUCCESS',
    });
  }

  // ===== Utility Methods =====

  /**
   * Sanitize parameters for logging (remove sensitive data)
   */
  private sanitizeParams(params: Record<string, unknown>): Record<string, unknown> {
    const sanitized: Record<string, unknown> = {};
    const sensitiveKeys = ['password', 'token', 'secret', 'key', 'auth'];

    for (const [key, value] of Object.entries(params)) {
      if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
        sanitized[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 500) {
        sanitized[key] = this.truncate(value, 500);
      } else {
        sanitized[key] = value;
      }
    }

    return sanitized;
  }

  /**
   * Truncate string for logging
   */
  private truncate(str: string, maxLen: number): string {
    if (str.length <= maxLen) return str;
    return str.slice(0, maxLen) + '...[truncated]';
  }

  /**
   * Flush pending logs (for async backends)
   */
  async flush(): Promise<void> {
    if (this.backend.flush) {
      await this.backend.flush();
    }
  }
}

// Singleton instance
export const auditLogger = new AuditLogger();
