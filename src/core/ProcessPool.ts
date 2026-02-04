/**
 * Process Pool for Concurrent Godot Operations
 * Manages multiple Godot processes for parallel execution
 *
 * ISO/IEC 25010 compliant - efficient, reliable, maintainable
 * ISO/IEC 27001 compliant - secure process execution without shell
 *
 * Security: Uses spawn without shell to prevent command injection (OWASP A01:2021)
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';
import { PROCESS_POOL_CONFIG } from './config.js';
import { auditLogger } from './AuditLogger.js';
import { CircuitBreaker, CircuitOpenError, CircuitState } from './CircuitBreaker.js';

export interface ProcessTask {
  id: string;
  command: string;
  args: string[];
  cwd?: string;
  timeout?: number;
  resolve: (result: ProcessResult) => void;
  reject: (error: Error) => void;
}

export interface ProcessResult {
  stdout: string;
  stderr: string;
  exitCode: number | null;
  duration: number;
}

export interface PoolWorker {
  id: number;
  process: ChildProcess | null;
  busy: boolean;
  currentTask: ProcessTask | null;
  startTime: number;
}

export interface PoolConfig {
  maxWorkers: number;
  taskTimeout: number;
  maxQueueSize: number;
}

export interface PoolStats {
  totalWorkers: number;
  busyWorkers: number;
  idleWorkers: number;
  queuedTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageDuration: number;
}

/**
 * Dangerous shell metacharacters that indicate command injection attempt
 * ISO/IEC 27001: Security control for command injection prevention
 *
 * NOTE: Backslash (\) is NOT blocked - required for Windows paths
 * NOTE: Forward slash (/) is NOT blocked - required for Unix paths and arguments
 */
const SHELL_METACHARACTERS = /[;&|`$(){}[\]<>!*?#~\n\r]/;

/**
 * Additional dangerous patterns for arguments
 * Blocks command chaining and redirection attempts
 */
const DANGEROUS_ARG_PATTERNS = /(\|\||&&|>>|<<|>[>&]?|<[<&]?)/;

/**
 * Validate command and arguments for injection attacks
 * @throws Error if injection attempt detected
 */
export function validateCommandSecurity(command: string, args: string[]): void {
  // Check command for shell metacharacters
  if (SHELL_METACHARACTERS.test(command)) {
    auditLogger.commandInjectionAttempt(command, args);
    throw new Error('Invalid command: contains shell metacharacters');
  }

  // Check each argument for shell metacharacters and dangerous patterns
  for (const arg of args) {
    if (SHELL_METACHARACTERS.test(arg)) {
      auditLogger.commandInjectionAttempt(command, args);
      throw new Error('Invalid argument: contains shell metacharacters');
    }
    if (DANGEROUS_ARG_PATTERNS.test(arg)) {
      auditLogger.commandInjectionAttempt(command, args);
      throw new Error('Invalid argument: contains command chaining pattern');
    }
  }

  // Ensure command doesn't contain path traversal (but allow in args for relative paths)
  if (command.includes('..')) {
    auditLogger.commandInjectionAttempt(command, args);
    throw new Error('Invalid command: path traversal detected');
  }
}

/**
 * Process pool for managing concurrent Godot operations
 * Includes circuit breaker for fault tolerance (ISO/IEC 25010)
 */
export class ProcessPool extends EventEmitter {
  private readonly config: PoolConfig;
  private readonly workers: PoolWorker[];
  private readonly taskQueue: ProcessTask[];
  private completedTasks: number;
  private failedTasks: number;
  private totalDuration: number;
  private isShuttingDown: boolean;
  private readonly circuitBreaker: CircuitBreaker;

  constructor(config: Partial<PoolConfig> = {}) {
    super();

    this.config = {
      maxWorkers: config.maxWorkers ?? PROCESS_POOL_CONFIG.MAX_WORKERS,
      taskTimeout: config.taskTimeout ?? PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS,
      maxQueueSize: config.maxQueueSize ?? PROCESS_POOL_CONFIG.MAX_QUEUE_SIZE,
    };

    this.workers = [];
    this.taskQueue = [];
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.totalDuration = 0;
    this.isShuttingDown = false;

    // Initialize circuit breaker for fault tolerance
    this.circuitBreaker = new CircuitBreaker({
      name: 'process-pool',
      failureThreshold: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_THRESHOLD,
      resetTimeout: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_RESET_TIMEOUT_MS,
      successThreshold: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_SUCCESS_THRESHOLD,
      failureWindow: PROCESS_POOL_CONFIG.CIRCUIT_BREAKER_FAILURE_WINDOW_MS,
    });

    // Forward circuit breaker events
    this.circuitBreaker.on('open', (stats) => this.emit('circuitOpen', stats));
    this.circuitBreaker.on('close', (stats) => this.emit('circuitClose', stats));
    this.circuitBreaker.on('halfOpen', (stats) => this.emit('circuitHalfOpen', stats));

    // Initialize workers
    for (let i = 0; i < this.config.maxWorkers; i++) {
      this.workers.push({
        id: i,
        process: null,
        busy: false,
        currentTask: null,
        startTime: 0,
      });
    }
  }

  /**
   * Get circuit breaker state
   */
  getCircuitState(): CircuitState {
    return this.circuitBreaker.getState();
  }

  /**
   * Reset circuit breaker manually
   */
  resetCircuit(): void {
    this.circuitBreaker.reset();
  }

  /**
   * Execute a command in the process pool
   * Protected by circuit breaker for fault tolerance
   * @throws {CircuitOpenError} When circuit breaker is open (too many failures)
   */
  execute(command: string, args: string[], options: { cwd?: string; timeout?: number } = {}): Promise<ProcessResult> {
    // Wrap execution with circuit breaker
    return this.circuitBreaker.execute(() => this.executeInternal(command, args, options));
  }

  /**
   * Check if the circuit breaker is allowing requests
   * Use this before execute() to provide graceful degradation
   */
  isCircuitOpen(): boolean {
    return this.circuitBreaker.getState() === CircuitState.OPEN;
  }

  /**
   * Execute with explicit circuit error handling
   * Returns null if circuit is open instead of throwing
   */
  async tryExecute(
    command: string,
    args: string[],
    options: { cwd?: string; timeout?: number } = {}
  ): Promise<ProcessResult | { circuitOpen: true; error: CircuitOpenError }> {
    try {
      return await this.execute(command, args, options);
    } catch (error) {
      if (error instanceof CircuitOpenError) {
        return { circuitOpen: true, error };
      }
      throw error;
    }
  }

  /**
   * Internal execution logic (called through circuit breaker)
   */
  private executeInternal(command: string, args: string[], options: { cwd?: string; timeout?: number }): Promise<ProcessResult> {
    return new Promise((resolve, reject) => {
      if (this.isShuttingDown) {
        reject(new Error('Process pool is shutting down'));
        return;
      }

      const task: ProcessTask = {
        id: this.generateTaskId(),
        command,
        args,
        cwd: options.cwd,
        timeout: options.timeout ?? this.config.taskTimeout,
        resolve,
        reject,
      };

      // Check queue size
      if (this.taskQueue.length >= this.config.maxQueueSize) {
        reject(new Error(`Task queue is full (max: ${this.config.maxQueueSize})`));
        return;
      }

      // Try to find an idle worker
      const idleWorker = this.workers.find(w => !w.busy);

      if (idleWorker) {
        this.executeTask(idleWorker, task);
      } else {
        // Add to queue
        this.taskQueue.push(task);
        this.emit('taskQueued', { taskId: task.id, queueSize: this.taskQueue.length });
      }
    });
  }

  /**
   * Execute a task on a worker
   */
  private executeTask(worker: PoolWorker, task: ProcessTask): void {
    worker.busy = true;
    worker.currentTask = task;
    worker.startTime = Date.now();

    this.emit('taskStarted', { taskId: task.id, workerId: worker.id });

    let stdout = '';
    let stderr = '';
    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    let isCompleted = false;

    const complete = (exitCode: number | null, error?: Error) => {
      if (isCompleted) return;
      isCompleted = true;

      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      const duration = Date.now() - worker.startTime;

      // Clean up worker
      worker.busy = false;
      worker.currentTask = null;
      worker.process = null;

      if (error) {
        this.failedTasks++;
        task.reject(error);
        this.emit('taskFailed', { taskId: task.id, workerId: worker.id, error, duration });
      } else {
        this.completedTasks++;
        this.totalDuration += duration;
        const result: ProcessResult = { stdout, stderr, exitCode, duration };
        task.resolve(result);
        this.emit('taskCompleted', { taskId: task.id, workerId: worker.id, result });
      }

      // Process next task in queue
      this.processQueue();
    };

    try {
      // Security: Validate command and args before execution (OWASP A01:2021)
      validateCommandSecurity(task.command, task.args);

      // Security: spawn WITHOUT shell to prevent command injection
      // ISO/IEC 27001: Secure process execution
      const proc = spawn(task.command, task.args, {
        cwd: task.cwd,
        shell: false, // CRITICAL: Never use shell:true
        windowsHide: true,
      });

      worker.process = proc;

      // Audit: Log process spawn
      auditLogger.processSpawn(task.command, proc.pid);

      proc.stdout?.on('data', (data: Buffer) => {
        stdout += data.toString();
      });

      proc.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      proc.on('error', (error: Error) => {
        complete(null, error);
      });

      proc.on('close', (code: number | null) => {
        complete(code);
      });

      // Set timeout
      if (task.timeout && task.timeout > 0) {
        timeoutHandle = setTimeout(() => {
          if (!isCompleted) {
            // Audit: Log process timeout
            auditLogger.processTimeout(task.command, task.timeout!);
            proc.kill('SIGKILL');
            complete(null, new Error(`Task timed out after ${task.timeout}ms`));
          }
        }, task.timeout);
      }
    } catch (error) {
      complete(null, error instanceof Error ? error : new Error(String(error)));
    }
  }

  /**
   * Process the next task in the queue
   */
  private processQueue(): void {
    if (this.isShuttingDown || this.taskQueue.length === 0) {
      return;
    }

    const idleWorker = this.workers.find(w => !w.busy);
    if (idleWorker) {
      const task = this.taskQueue.shift();
      if (task) {
        this.executeTask(idleWorker, task);
      }
    }
  }

  /**
   * Get pool statistics
   */
  getStats(): PoolStats {
    const busyWorkers = this.workers.filter(w => w.busy).length;

    return {
      totalWorkers: this.workers.length,
      busyWorkers,
      idleWorkers: this.workers.length - busyWorkers,
      queuedTasks: this.taskQueue.length,
      completedTasks: this.completedTasks,
      failedTasks: this.failedTasks,
      averageDuration: this.completedTasks > 0 ? this.totalDuration / this.completedTasks : 0,
    };
  }

  /**
   * Cancel a queued task by ID
   */
  cancelTask(taskId: string): boolean {
    const index = this.taskQueue.findIndex(t => t.id === taskId);
    if (index !== -1) {
      const task = this.taskQueue.splice(index, 1)[0];
      task.reject(new Error('Task cancelled'));
      this.emit('taskCancelled', { taskId });
      return true;
    }
    return false;
  }

  /**
   * Cancel all queued tasks
   */
  cancelAllQueued(): number {
    const count = this.taskQueue.length;
    for (const task of this.taskQueue) {
      task.reject(new Error('Task cancelled'));
      this.emit('taskCancelled', { taskId: task.id });
    }
    this.taskQueue.length = 0;
    return count;
  }

  /**
   * Gracefully shutdown the pool
   */
  async shutdown(timeout: number = PROCESS_POOL_CONFIG.SHUTDOWN_TIMEOUT_MS): Promise<void> {
    this.isShuttingDown = true;

    // Cancel all queued tasks
    this.cancelAllQueued();

    // Wait for running tasks to complete
    const startTime = Date.now();
    while (this.workers.some(w => w.busy)) {
      if (Date.now() - startTime > timeout) {
        // Force kill remaining processes
        for (const worker of this.workers) {
          if (worker.process && worker.currentTask) {
            auditLogger.processKill(worker.currentTask.command, 'shutdown_timeout');
            worker.process.kill('SIGKILL');
          }
        }
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    this.emit('shutdown');
  }

  /**
   * Force kill all running processes
   */
  forceKillAll(): void {
    for (const worker of this.workers) {
      if (worker.process && worker.currentTask) {
        auditLogger.processKill(worker.currentTask.command, 'force_kill');
        worker.process.kill('SIGKILL');
      }
    }
    this.cancelAllQueued();
  }

  /**
   * Generate a unique task ID
   */
  private generateTaskId(): string {
    return `task_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }

  /**
   * Resize the pool
   */
  resize(newSize: number): void {
    if (newSize < 1) {
      throw new Error('Pool size must be at least 1');
    }

    if (newSize > this.workers.length) {
      // Add workers
      for (let i = this.workers.length; i < newSize; i++) {
        this.workers.push({
          id: i,
          process: null,
          busy: false,
          currentTask: null,
          startTime: 0,
        });
      }
    } else if (newSize < this.workers.length) {
      // Remove idle workers first
      const toRemove = this.workers.length - newSize;
      let removed = 0;

      for (let i = this.workers.length - 1; i >= 0 && removed < toRemove; i--) {
        if (!this.workers[i].busy) {
          this.workers.splice(i, 1);
          removed++;
        }
      }
    }

    // Process queue with potentially new workers
    this.processQueue();
  }
}

/**
 * Singleton pool for Godot operations
 * Configuration from environment variables via config.ts
 */
let godotPool: ProcessPool | null = null;

export function getGodotPool(): ProcessPool {
  if (!godotPool) {
    godotPool = new ProcessPool({
      maxWorkers: PROCESS_POOL_CONFIG.MAX_WORKERS,
      taskTimeout: PROCESS_POOL_CONFIG.DEFAULT_TASK_TIMEOUT_MS,
      maxQueueSize: PROCESS_POOL_CONFIG.MAX_QUEUE_SIZE,
    });
  }
  return godotPool;
}

export function shutdownGodotPool(): Promise<void> {
  if (godotPool) {
    const pool = godotPool;
    godotPool = null;
    return pool.shutdown();
  }
  return Promise.resolve();
}
