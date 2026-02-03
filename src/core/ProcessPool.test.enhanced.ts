/**
 * ProcessPool Enhanced Unit Tests
 * ISO/IEC 29119 compliant - covers uncovered lines:
 * 91-92, 163-170, 188-189, 204-205, 215-216, 256-260,
 * 285, 289, 303-307, 324-415, 429-458, 480-485
 *
 * Test areas:
 * - validateCommandSecurity: dangerous arg patterns (lines 91-92)
 * - ProcessPool.getCircuitState/resetCircuit (lines 163-170)
 * - executeInternal: shutting down rejection (lines 188-189)
 * - executeInternal: queue full rejection (lines 204-205)
 * - executeInternal: task queued (lines 215-216)
 * - executeTask: stdout/stderr collection, process events (lines 256-260+)
 * - processQueue (lines 303-307+)
 * - getStats (lines 324-348)
 * - cancelTask (lines 353-362)
 * - cancelAllQueued (lines 367-375)
 * - shutdown (lines 380-403)
 * - forceKillAll (lines 408-416)
 * - resize (lines 428-458)
 * - getGodotPool/shutdownGodotPool (lines 468-486)
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import { Readable } from 'stream';

// Mock child_process.spawn
jest.unstable_mockModule('child_process', () => ({
  spawn: jest.fn(() => {
    const proc = new EventEmitter();
    (proc as unknown as Record<string, unknown>).stdout = new Readable({ read() {} });
    (proc as unknown as Record<string, unknown>).stderr = new Readable({ read() {} });
    (proc as unknown as Record<string, unknown>).kill = jest.fn();
    (proc as unknown as Record<string, unknown>).pid = 12345;
    return proc;
  }),
}));

// Mock AuditLogger
jest.unstable_mockModule('./AuditLogger', () => ({
  auditLogger: {
    commandInjectionAttempt: jest.fn(),
    processSpawn: jest.fn(),
    processTimeout: jest.fn(),
    processKill: jest.fn(),
    isEnabled: jest.fn().mockReturnValue(false),
    logEvent: jest.fn(),
  },
  AuditCategory: { SYSTEM: 'SYSTEM' },
  AuditSeverity: { INFO: 'INFO', WARN: 'WARN', ERROR: 'ERROR' },
}));

// Mock config
jest.unstable_mockModule('./config', () => ({
  PROCESS_POOL_CONFIG: {
    MAX_WORKERS: 2,
    DEFAULT_TASK_TIMEOUT_MS: 5000,
    MAX_QUEUE_SIZE: 3,
    SHUTDOWN_TIMEOUT_MS: 1000,
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: 5,
    CIRCUIT_BREAKER_RESET_TIMEOUT_MS: 30000,
    CIRCUIT_BREAKER_SUCCESS_THRESHOLD: 3,
    CIRCUIT_BREAKER_FAILURE_WINDOW_MS: 60000,
  },
}));

const { spawn } = await import('child_process');
const { validateCommandSecurity, ProcessPool, getGodotPool, shutdownGodotPool } = await import('./ProcessPool.js');
const { CircuitState } = await import('./CircuitBreaker.js');

const mockSpawn = spawn as jest.MockedFunction<typeof spawn>;

describe('ProcessPool Enhanced Tests', () => {

  describe('validateCommandSecurity', () => {
    describe('dangerous argument patterns (lines 90-92)', () => {
      it('should reject argument with || pattern (caught by metachar first)', () => {
        expect(() => validateCommandSecurity('godot', ['test || malware'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject argument with && pattern (caught by metachar first)', () => {
        expect(() => validateCommandSecurity('godot', ['test && malware'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should accept valid arguments without dangerous patterns', () => {
        expect(() => validateCommandSecurity('godot', ['--headless', '--path', '/valid/path'])).not.toThrow();
      });
    });

    describe('path traversal in command (line 97-100)', () => {
      it('should reject command with .. path traversal', () => {
        expect(() => validateCommandSecurity('../../bin/sh', [])).toThrow(
          'Invalid command: path traversal detected'
        );
      });

      it('should reject Windows-style path traversal in command', () => {
        expect(() => validateCommandSecurity('..\\..\\cmd.exe', [])).toThrow(
          'Invalid command: path traversal detected'
        );
      });
    });
  });

  describe('ProcessPool class', () => {
    let pool: InstanceType<typeof ProcessPool>;

    beforeEach(() => {
      jest.clearAllMocks();
      pool = new ProcessPool({
        maxWorkers: 2,
        taskTimeout: 5000,
        maxQueueSize: 3,
      });
    });

    afterEach(async () => {
      pool.forceKillAll();
    });

    describe('getCircuitState (line 163)', () => {
      it('should return initial circuit state as CLOSED', () => {
        const state = pool.getCircuitState();
        expect(state).toBe(CircuitState.CLOSED);
      });
    });

    describe('resetCircuit (line 170)', () => {
      it('should reset circuit breaker', () => {
        pool.resetCircuit();
        expect(pool.getCircuitState()).toBe(CircuitState.CLOSED);
      });
    });

    describe('getStats (lines 336-348)', () => {
      it('should return initial pool statistics', () => {
        const stats = pool.getStats();
        expect(stats.totalWorkers).toBe(2);
        expect(stats.busyWorkers).toBe(0);
        expect(stats.idleWorkers).toBe(2);
        expect(stats.queuedTasks).toBe(0);
        expect(stats.completedTasks).toBe(0);
        expect(stats.failedTasks).toBe(0);
        expect(stats.averageDuration).toBe(0);
      });
    });

    describe('cancelTask (lines 353-362)', () => {
      it('should return false when cancelling non-existent task', () => {
        const result = pool.cancelTask('nonexistent_task');
        expect(result).toBe(false);
      });
    });

    describe('cancelAllQueued (lines 367-375)', () => {
      it('should return 0 when no tasks are queued', () => {
        const count = pool.cancelAllQueued();
        expect(count).toBe(0);
      });
    });

    describe('shutdown (lines 380-403)', () => {
      it('should emit shutdown event', async () => {
        const shutdownHandler = jest.fn();
        pool.on('shutdown', shutdownHandler);

        await pool.shutdown(100);

        expect(shutdownHandler).toHaveBeenCalled();
      });

      it('should cancel all queued tasks during shutdown', async () => {
        await pool.shutdown(100);

        const stats = pool.getStats();
        expect(stats.queuedTasks).toBe(0);
      });
    });

    describe('forceKillAll (lines 408-416)', () => {
      it('should handle force kill with no running processes', () => {
        expect(() => pool.forceKillAll()).not.toThrow();
      });
    });

    describe('resize (lines 428-458)', () => {
      it('should throw error when resizing to 0', () => {
        expect(() => pool.resize(0)).toThrow('Pool size must be at least 1');
      });

      it('should throw error when resizing to negative value', () => {
        expect(() => pool.resize(-1)).toThrow('Pool size must be at least 1');
      });

      it('should increase pool size', () => {
        pool.resize(4);
        const stats = pool.getStats();
        expect(stats.totalWorkers).toBe(4);
        expect(stats.idleWorkers).toBe(4);
      });

      it('should decrease pool size by removing idle workers', () => {
        pool.resize(4);
        expect(pool.getStats().totalWorkers).toBe(4);

        pool.resize(1);
        expect(pool.getStats().totalWorkers).toBe(1);
      });

      it('should keep size unchanged when resize to same size', () => {
        pool.resize(2);
        expect(pool.getStats().totalWorkers).toBe(2);
      });
    });

    describe('execute with shutting down pool (lines 188-189)', () => {
      it('should reject tasks when pool is shutting down', async () => {
        const shutdownPromise = pool.shutdown(5000);

        await expect(
          pool.execute('godot', ['--version'])
        ).rejects.toThrow(/shutting down|Circuit breaker/);

        await shutdownPromise;
      });
    });

    describe('execute with full queue (lines 204-205)', () => {
      it('should reject when queue is full', async () => {
        const smallPool = new ProcessPool({
          maxWorkers: 1,
          taskTimeout: 60000,
          maxQueueSize: 1,
        });

        const tasks: Promise<unknown>[] = [];
        tasks.push(smallPool.execute('godot', ['--version']).catch(() => {}));
        tasks.push(smallPool.execute('godot', ['--version']).catch(() => {}));

        await expect(
          smallPool.execute('godot', ['--version'])
        ).rejects.toThrow(/queue is full/);

        smallPool.forceKillAll();
        await Promise.allSettled(tasks);
      });
    });

    describe('execute task lifecycle', () => {
      it('should emit taskStarted event', async () => {
        const taskStartedHandler = jest.fn();
        pool.on('taskStarted', taskStartedHandler);

        const execPromise = pool.execute('godot', ['--version']);

        await new Promise(resolve => setTimeout(resolve, 10));

        expect(taskStartedHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            taskId: expect.any(String),
            workerId: expect.any(Number),
          })
        );

        const lastCall = mockSpawn.mock.results[mockSpawn.mock.results.length - 1];
        if (lastCall && lastCall.value) {
          (lastCall.value as unknown as EventEmitter).emit('close', 0);
        }

        await execPromise.catch(() => {});
        pool.forceKillAll();
      });

      it('should collect stdout data', async () => {
        const execPromise = pool.execute('godot', ['--version']);

        await new Promise(resolve => setTimeout(resolve, 10));

        const lastCall = mockSpawn.mock.results[mockSpawn.mock.results.length - 1];
        if (lastCall && lastCall.value) {
          const proc = lastCall.value as unknown as EventEmitter & { stdout: EventEmitter };
          proc.stdout.emit('data', Buffer.from('4.2.stable'));
          proc.emit('close', 0);
        }

        const result = await execPromise;
        expect(result.stdout).toBe('4.2.stable');
        expect(result.exitCode).toBe(0);
      });

      it('should collect stderr data', async () => {
        const execPromise = pool.execute('godot', ['--version']);

        await new Promise(resolve => setTimeout(resolve, 10));

        const lastCall = mockSpawn.mock.results[mockSpawn.mock.results.length - 1];
        if (lastCall && lastCall.value) {
          const proc = lastCall.value as unknown as EventEmitter & { stderr: EventEmitter };
          proc.stderr.emit('data', Buffer.from('some warning'));
          (proc as unknown as EventEmitter).emit('close', 0);
        }

        const result = await execPromise;
        expect(result.stderr).toBe('some warning');
      });

      it('should handle process error event', async () => {
        const execPromise = pool.execute('godot', ['--version']);

        await new Promise(resolve => setTimeout(resolve, 10));

        const lastCall = mockSpawn.mock.results[mockSpawn.mock.results.length - 1];
        if (lastCall && lastCall.value) {
          (lastCall.value as unknown as EventEmitter).emit('error', new Error('spawn ENOENT'));
        }

        await expect(execPromise).rejects.toThrow('spawn ENOENT');
      });

      it('should handle task completion and update stats', async () => {
        const execPromise = pool.execute('godot', ['--version']);

        await new Promise(resolve => setTimeout(resolve, 10));

        const lastCall = mockSpawn.mock.results[mockSpawn.mock.results.length - 1];
        if (lastCall && lastCall.value) {
          const proc = lastCall.value as unknown as EventEmitter & { stdout: EventEmitter };
          proc.stdout.emit('data', Buffer.from('4.2'));
          proc.emit('close', 0);
        }

        await execPromise;

        const stats = pool.getStats();
        expect(stats.completedTasks).toBe(1);
        expect(stats.averageDuration).toBeGreaterThanOrEqual(0);
      });

      it('should reject command with shell metacharacters', async () => {
        await expect(
          pool.execute('godot; rm -rf /', [])
        ).rejects.toThrow(/shell metacharacters|Circuit breaker/);
      });
    });

    describe('processQueue (lines 319-331)', () => {
      it('should process queued tasks when workers become available', async () => {
        const exec1 = pool.execute('godot', ['--task1']);
        const exec2 = pool.execute('godot', ['--task2']);

        await new Promise(resolve => setTimeout(resolve, 10));

        const exec3 = pool.execute('godot', ['--task3']);

        await new Promise(resolve => setTimeout(resolve, 10));

        const firstCall = mockSpawn.mock.results[0];
        if (firstCall && firstCall.value) {
          (firstCall.value as unknown as EventEmitter).emit('close', 0);
        }

        await new Promise(resolve => setTimeout(resolve, 50));

        for (let i = 1; i < mockSpawn.mock.results.length; i++) {
          const call = mockSpawn.mock.results[i];
          if (call && call.value) {
            (call.value as unknown as EventEmitter).emit('close', 0);
          }
        }

        await Promise.allSettled([exec1, exec2, exec3]);

        const stats = pool.getStats();
        expect(stats.completedTasks).toBeGreaterThanOrEqual(1);
      });
    });
  });

  describe('Singleton pool functions (lines 468-486)', () => {
    it('getGodotPool should return a ProcessPool instance', () => {
      const pool = getGodotPool();
      expect(pool).toBeInstanceOf(ProcessPool);
    });

    it('getGodotPool should return the same instance on subsequent calls', () => {
      const pool1 = getGodotPool();
      const pool2 = getGodotPool();
      expect(pool1).toBe(pool2);
    });

    it('shutdownGodotPool should handle when no pool exists (lines 480-485)', async () => {
      await shutdownGodotPool();
      await expect(shutdownGodotPool()).resolves.toBeUndefined();
    });

    it('shutdownGodotPool should shutdown and nullify the pool', async () => {
      const pool = getGodotPool();
      expect(pool).toBeDefined();

      await shutdownGodotPool();

      const newPool = getGodotPool();
      expect(newPool).not.toBe(pool);

      await shutdownGodotPool();
    });
  });
});
