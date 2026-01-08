/**
 * AuditLogger Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for ISO/IEC 27001 compliant audit logging
 */

import {
  auditLogger,
  AuditSeverity,
  AuditCategory,
  MemoryAuditBackend,
  AuditEvent,
} from './AuditLogger.js';

describe('AuditLogger', () => {
  let memoryBackend: MemoryAuditBackend;

  beforeEach(() => {
    memoryBackend = new MemoryAuditBackend();
    auditLogger.setBackend(memoryBackend);
    auditLogger.setEnabled(true);
    memoryBackend.clear();
  });

  afterEach(() => {
    auditLogger.setEnabled(false);
  });

  describe('isEnabled', () => {
    it('should return true when enabled', () => {
      auditLogger.setEnabled(true);
      expect(auditLogger.isEnabled()).toBe(true);
    });

    it('should return false when disabled', () => {
      auditLogger.setEnabled(false);
      expect(auditLogger.isEnabled()).toBe(false);
    });
  });

  describe('logging when disabled', () => {
    it('should not log events when disabled', () => {
      auditLogger.setEnabled(false);
      auditLogger.toolStart('test-tool', {});
      expect(memoryBackend.getEvents()).toHaveLength(0);
    });
  });

  describe('tool execution events', () => {
    it('should log tool start', () => {
      const eventId = auditLogger.toolStart('create_scene', { path: '/test' });
      expect(eventId).toBeDefined();
      expect(eventId).toMatch(/^EVT-/);

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('TOOL_START:create_scene');
      expect(events[0].category).toBe(AuditCategory.TOOL_EXECUTION);
      expect(events[0].severity).toBe(AuditSeverity.INFO);
      expect(events[0].outcome).toBe('SUCCESS');
    });

    it('should log tool success', () => {
      auditLogger.toolSuccess('create_scene', 150);

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('TOOL_SUCCESS:create_scene');
      expect(events[0].duration).toBe(150);
      expect(events[0].outcome).toBe('SUCCESS');
    });

    it('should log tool failure', () => {
      auditLogger.toolFailure('create_scene', 'File not found', 50);

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('TOOL_FAILURE:create_scene');
      expect(events[0].severity).toBe(AuditSeverity.ERROR);
      expect(events[0].outcome).toBe('FAILURE');
      expect(events[0].details.error).toBe('File not found');
    });
  });

  describe('security events', () => {
    it('should log validation failure', () => {
      auditLogger.validationFailure('path', '../../../etc/passwd', 'path traversal');

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('VALIDATION_FAILURE');
      expect(events[0].category).toBe(AuditCategory.SECURITY);
      expect(events[0].severity).toBe(AuditSeverity.WARN);
      expect(events[0].outcome).toBe('BLOCKED');
    });

    it('should log path traversal attempt', () => {
      auditLogger.pathTraversalAttempt('../../../etc/passwd', 'scene_read');

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('PATH_TRAVERSAL_ATTEMPT');
      expect(events[0].severity).toBe(AuditSeverity.CRITICAL);
      expect(events[0].outcome).toBe('BLOCKED');
    });

    it('should log command injection attempt', () => {
      auditLogger.commandInjectionAttempt('godot; rm -rf /', ['--version']);

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('COMMAND_INJECTION_ATTEMPT');
      expect(events[0].severity).toBe(AuditSeverity.CRITICAL);
      expect(events[0].outcome).toBe('BLOCKED');
    });
  });

  describe('process events', () => {
    it('should log process spawn', () => {
      auditLogger.processSpawn('godot', 12345);

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('PROCESS_SPAWN');
      expect(events[0].category).toBe(AuditCategory.PROCESS);
      expect(events[0].details.pid).toBe(12345);
    });

    it('should log process timeout', () => {
      auditLogger.processTimeout('godot', 30000);

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('PROCESS_TIMEOUT');
      expect(events[0].severity).toBe(AuditSeverity.WARN);
      expect(events[0].outcome).toBe('FAILURE');
    });

    it('should log process kill', () => {
      auditLogger.processKill('godot', 'shutdown_timeout');

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('PROCESS_KILL');
      expect(events[0].details.reason).toBe('shutdown_timeout');
    });
  });

  describe('system events', () => {
    it('should log system startup', () => {
      auditLogger.systemStartup('1.0.0');

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('SYSTEM_STARTUP');
      expect(events[0].category).toBe(AuditCategory.SYSTEM);
      expect(events[0].details.version).toBe('1.0.0');
    });

    it('should log system shutdown', () => {
      auditLogger.systemShutdown('user_request');

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('SYSTEM_SHUTDOWN');
      expect(events[0].details.reason).toBe('user_request');
    });
  });

  describe('custom events via logEvent', () => {
    it('should log custom event', () => {
      auditLogger.logEvent(
        AuditCategory.SYSTEM,
        AuditSeverity.INFO,
        'CUSTOM_ACTION',
        { key: 'value' },
        'SUCCESS'
      );

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].action).toBe('CUSTOM_ACTION');
      expect(events[0].category).toBe(AuditCategory.SYSTEM);
      expect(events[0].details.key).toBe('value');
    });

    it('should log custom event with duration', () => {
      auditLogger.logEvent(
        AuditCategory.TOOL_EXECUTION,
        AuditSeverity.ERROR,
        'CUSTOM_FAILURE',
        { error: 'test' },
        'FAILURE',
        500
      );

      const events = memoryBackend.getEvents();
      expect(events).toHaveLength(1);
      expect(events[0].duration).toBe(500);
      expect(events[0].outcome).toBe('FAILURE');
    });
  });

  describe('event structure', () => {
    it('should have timestamp in ISO format', () => {
      auditLogger.toolStart('test', {});

      const events = memoryBackend.getEvents();
      expect(events[0].timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });

    it('should have unique event IDs', () => {
      auditLogger.toolStart('test1', {});
      auditLogger.toolStart('test2', {});
      auditLogger.toolStart('test3', {});

      const events = memoryBackend.getEvents();
      const eventIds = events.map((e) => e.eventId);
      const uniqueIds = new Set(eventIds);
      expect(uniqueIds.size).toBe(3);
    });

    it('should have event ID format EVT-{timestamp}-{counter}', () => {
      auditLogger.toolStart('test', {});

      const events = memoryBackend.getEvents();
      expect(events[0].eventId).toMatch(/^EVT-\d+-[a-z0-9]+$/);
    });
  });

  describe('parameter sanitization', () => {
    it('should redact sensitive keys', () => {
      auditLogger.toolStart('auth', {
        username: 'user',
        password: 'secret123',
        apiToken: 'token123',
        secretKey: 'key123',
      });

      const events = memoryBackend.getEvents();
      const params = events[0].details.params as Record<string, unknown>;
      expect(params.username).toBe('user');
      expect(params.password).toBe('[REDACTED]');
      expect(params.apiToken).toBe('[REDACTED]');
      expect(params.secretKey).toBe('[REDACTED]');
    });

    it('should truncate long strings', () => {
      const longString = 'a'.repeat(1000);
      auditLogger.toolStart('test', { data: longString });

      const events = memoryBackend.getEvents();
      const params = events[0].details.params as Record<string, unknown>;
      expect((params.data as string).length).toBeLessThan(600);
      expect((params.data as string)).toContain('...[truncated]');
    });

    it('should truncate validation input', () => {
      const longInput = 'x'.repeat(200);
      auditLogger.validationFailure('test', longInput, 'too long');

      const events = memoryBackend.getEvents();
      expect((events[0].details.input as string).length).toBeLessThanOrEqual(115);
    });
  });

  describe('MemoryAuditBackend', () => {
    it('should store events', () => {
      auditLogger.toolStart('test1', {});
      auditLogger.toolStart('test2', {});

      expect(memoryBackend.getEvents()).toHaveLength(2);
    });

    it('should filter by category', () => {
      auditLogger.toolStart('test', {});
      auditLogger.pathTraversalAttempt('/test', 'ctx');

      const securityEvents = memoryBackend.getEventsByCategory(AuditCategory.SECURITY);
      expect(securityEvents).toHaveLength(1);
      expect(securityEvents[0].action).toBe('PATH_TRAVERSAL_ATTEMPT');
    });

    it('should filter by severity', () => {
      auditLogger.toolStart('test', {});
      auditLogger.toolFailure('test', 'error', 100);
      auditLogger.pathTraversalAttempt('/test', 'ctx');

      const criticalEvents = memoryBackend.getEventsBySeverity(AuditSeverity.CRITICAL);
      expect(criticalEvents).toHaveLength(1);

      const errorEvents = memoryBackend.getEventsBySeverity(AuditSeverity.ERROR);
      expect(errorEvents).toHaveLength(1);
    });

    it('should clear events', () => {
      auditLogger.toolStart('test', {});
      expect(memoryBackend.getEvents()).toHaveLength(1);

      memoryBackend.clear();
      expect(memoryBackend.getEvents()).toHaveLength(0);
    });

    it('should limit max events', () => {
      const smallBackend = new MemoryAuditBackend(10);
      auditLogger.setBackend(smallBackend);

      for (let i = 0; i < 15; i++) {
        auditLogger.toolStart(`test${i}`, {});
      }

      // Should trim to half when exceeded
      expect(smallBackend.getEvents().length).toBeLessThanOrEqual(10);
    });

    it('should return copy of events array', () => {
      auditLogger.toolStart('test', {});
      const events1 = memoryBackend.getEvents();
      const events2 = memoryBackend.getEvents();

      expect(events1).not.toBe(events2);
      expect(events1).toEqual(events2);
    });
  });

  describe('flush', () => {
    it('should call backend flush if available', async () => {
      let flushed = false;
      const customBackend = {
        log: () => {},
        flush: async () => {
          flushed = true;
        },
      };
      auditLogger.setBackend(customBackend);

      await auditLogger.flush();
      expect(flushed).toBe(true);
    });

    it('should not throw if backend has no flush', async () => {
      const customBackend = {
        log: () => {},
      };
      auditLogger.setBackend(customBackend);

      await expect(auditLogger.flush()).resolves.not.toThrow();
    });
  });
});
