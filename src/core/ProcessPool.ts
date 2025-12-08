/**
 * Process Pool for Concurrent Godot Operations
 * Manages multiple Godot processes for parallel execution
 *
 * ISO/IEC 25010 compliant - efficient, reliable, maintainable
 */

import { spawn, ChildProcess } from 'child_process';
import { EventEmitter } from 'events';

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
 * Process pool for managing concurrent Godot operations
 */
export class ProcessPool extends EventEmitter {
  private readonly config: PoolConfig;
  private readonly workers: PoolWorker[];
  private readonly taskQueue: ProcessTask[];
  private completedTasks: number;
  private failedTasks: number;
  private totalDuration: number;
  private isShuttingDown: boolean;

  constructor(config: Partial<PoolConfig> = {}) {
    super();

    this.config = {
      maxWorkers: config.maxWorkers ?? 4,
      taskTimeout: config.taskTimeout ?? 30000, // 30 seconds default
      maxQueueSize: config.maxQueueSize ?? 100,
    };

    this.workers = [];
    this.taskQueue = [];
    this.completedTasks = 0;
    this.failedTasks = 0;
    this.totalDuration = 0;
    this.isShuttingDown = false;

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
   * Execute a command in the process pool
   */
  execute(command: string, args: string[], options: { cwd?: string; timeout?: number } = {}): Promise<ProcessResult> {
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
      const proc = spawn(task.command, task.args, {
        cwd: task.cwd,
        shell: true,
        windowsHide: true,
      });

      worker.process = proc;

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
  async shutdown(timeout: number = 10000): Promise<void> {
    this.isShuttingDown = true;

    // Cancel all queued tasks
    this.cancelAllQueued();

    // Wait for running tasks to complete
    const startTime = Date.now();
    while (this.workers.some(w => w.busy)) {
      if (Date.now() - startTime > timeout) {
        // Force kill remaining processes
        for (const worker of this.workers) {
          if (worker.process) {
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
      if (worker.process) {
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
 */
let godotPool: ProcessPool | null = null;

export function getGodotPool(): ProcessPool {
  if (!godotPool) {
    godotPool = new ProcessPool({
      maxWorkers: 4,
      taskTimeout: 60000, // 1 minute for Godot operations
      maxQueueSize: 50,
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
