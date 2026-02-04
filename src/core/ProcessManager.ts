/**
 * Process management utilities for Godot engine integration.
 *
 * This module provides comprehensive lifecycle management for Godot processes,
 * including spawning, monitoring, and graceful termination of editor and game instances.
 *
 * @module ProcessManager
 * @author Godot MCP Unified Team
 * @version 1.0.0
 *
 * @description
 * Implements ISO/IEC 25010 quality characteristics:
 * - **Reliability**: Robust process lifecycle management with error handling
 * - **Performance Efficiency**: Efficient resource cleanup and process monitoring
 * - **Maintainability**: Clear separation of concerns with modular functions
 * - **Security**: Safe process termination to prevent resource leaks
 *
 * @example
 * ```typescript
 * import { runGodotProject, stopActiveProcess, cleanup } from './ProcessManager';
 *
 * // Run a Godot project
 * const process = runGodotProject('/path/to/godot', '/path/to/project');
 *
 * // Later, stop the process
 * const result = stopActiveProcess();
 * console.log('Output:', result?.output);
 *
 * // Cleanup on shutdown
 * cleanup();
 * ```
 */

import { spawn, ChildProcess } from 'child_process';

import { logDebug } from '../utils/Logger';

/**
 * Represents an active Godot process with its associated I/O streams.
 *
 * This interface encapsulates all information needed to track and manage
 * a running Godot process, including its output buffers for debugging purposes.
 *
 * @interface GodotProcess
 * @property {ChildProcess} process - The underlying Node.js child process instance
 * @property {string[]} output - Array of captured stdout lines from the process
 * @property {string[]} errors - Array of captured stderr lines from the process
 *
 * @example
 * ```typescript
 * const godotProcess: GodotProcess = {
 *   process: childProcess,
 *   output: ['Godot Engine v4.2.stable'],
 *   errors: []
 * };
 * ```
 */
export interface GodotProcess {
  process: ChildProcess;
  output: string[];
  errors: string[];
}

/**
 * Global state for the currently active Godot process.
 * Only one process can be active at a time to prevent resource conflicts.
 * @internal
 */
let activeProcess: GodotProcess | null = null;

/**
 * Retrieves the currently active Godot process.
 *
 * This function provides read-only access to the global active process state,
 * allowing consumers to inspect the running process without modifying it.
 *
 * @function getActiveProcess
 * @returns {GodotProcess | null} The active process if one exists, or null if no process is running
 *
 * @example
 * ```typescript
 * const process = getActiveProcess();
 * if (process) {
 *   console.log('Process output lines:', process.output.length);
 * }
 * ```
 */
export const getActiveProcess = (): GodotProcess | null => activeProcess;

/**
 * Sets or clears the active Godot process.
 *
 * This function updates the global active process state. It should be used
 * carefully as it directly modifies shared state. Typically called internally
 * by process management functions.
 *
 * @function setActiveProcess
 * @param {GodotProcess | null} process - The process to set as active, or null to clear
 * @returns {void}
 *
 * @example
 * ```typescript
 * // Set a new active process
 * setActiveProcess(newGodotProcess);
 *
 * // Clear the active process
 * setActiveProcess(null);
 * ```
 */
export const setActiveProcess = (process: GodotProcess | null): void => {
  activeProcess = process;
};

/**
 * Checks whether a Godot process is currently active.
 *
 * This is a convenience function that provides a boolean check without
 * exposing the actual process object, useful for conditional logic.
 *
 * @function hasActiveProcess
 * @returns {boolean} True if a process is currently active, false otherwise
 *
 * @example
 * ```typescript
 * if (hasActiveProcess()) {
 *   console.log('A Godot process is already running');
 * }
 * ```
 */
export const hasActiveProcess = (): boolean => activeProcess !== null;

/**
 * Stops the currently active Godot process and returns its captured output.
 *
 * This function performs a graceful termination of the active process by sending
 * a SIGTERM signal. It captures and returns all stdout and stderr output that
 * was collected during the process's lifetime.
 *
 * @function stopActiveProcess
 * @returns {{ output: string[]; errors: string[] } | null} An object containing
 *   the captured output and error streams, or null if no process was active
 *
 * @example
 * ```typescript
 * const result = stopActiveProcess();
 * if (result) {
 *   console.log('Captured output:', result.output.join('\n'));
 *   if (result.errors.length > 0) {
 *     console.error('Errors:', result.errors.join('\n'));
 *   }
 * } else {
 *   console.log('No active process to stop');
 * }
 * ```
 *
 * @see {@link runGodotProject} for starting a process
 * @see {@link cleanup} for cleanup during shutdown
 */
export const stopActiveProcess = (): { output: string[]; errors: string[] } | null => {
  if (!activeProcess) {
    return null;
  }

  logDebug('Stopping active Godot process');
  activeProcess.process.kill();

  const result = {
    output: activeProcess.output,
    errors: activeProcess.errors,
  };

  activeProcess = null;
  return result;
};

/**
 * Launches the Godot editor for a specific project.
 *
 * This function spawns a detached Godot editor process for the specified project.
 * Unlike {@link runGodotProject}, this does not track the process or capture output,
 * as the editor is intended to run independently.
 *
 * @function launchGodotEditor
 * @param {string} godotPath - Absolute path to the Godot executable
 * @param {string} projectPath - Absolute path to the Godot project directory
 * @returns {void}
 * @throws {Error} Emits an error event if the process fails to start (handled internally)
 *
 * @example
 * ```typescript
 * // Launch the Godot editor for a project
 * launchGodotEditor(
 *   'C:/Godot/Godot_v4.2.exe',
 *   'C:/Projects/MyGame'
 * );
 * ```
 *
 * @remarks
 * - Uses the `-e` flag to open in editor mode
 * - Uses `--path` to specify the project directory
 * - Process errors are logged to console but not thrown
 *
 * @see {@link runGodotProject} for running a project with output capture
 */
export const launchGodotEditor = (godotPath: string, projectPath: string): void => {
  logDebug(`Launching Godot editor for project: ${projectPath}`);

  const process = spawn(godotPath, ['-e', '--path', projectPath], {
    stdio: 'pipe',
  });

  process.on('error', (err: Error) => {
    console.error('Failed to start Godot editor:', err);
  });
};

/**
 * Runs a Godot project in debug mode with full output capture.
 *
 * This function spawns a Godot process to run the specified project, automatically
 * managing the process lifecycle. It captures all stdout and stderr output for
 * debugging purposes. If another process is already running, it will be terminated
 * first to ensure only one instance runs at a time.
 *
 * @function runGodotProject
 * @param {string} godotPath - Absolute path to the Godot executable
 * @param {string} projectPath - Absolute path to the Godot project directory
 * @param {string} [scene] - Optional path to a specific scene file to run
 * @returns {GodotProcess} A GodotProcess object containing the process handle and output buffers
 *
 * @example
 * ```typescript
 * // Run the main scene
 * const process = runGodotProject(
 *   '/usr/bin/godot',
 *   '/home/user/projects/game'
 * );
 *
 * // Run a specific scene
 * const process = runGodotProject(
 *   '/usr/bin/godot',
 *   '/home/user/projects/game',
 *   'res://scenes/level1.tscn'
 * );
 *
 * // Access captured output
 * console.log('Output lines:', process.output);
 * console.log('Error lines:', process.errors);
 * ```
 *
 * @remarks
 * - Uses the `-d` flag for debug mode
 * - Automatically kills any previously running process
 * - Output and error streams are captured asynchronously
 * - The process is stored as the active process and cleared on exit
 * - Process errors are logged to console
 *
 * @see {@link stopActiveProcess} for stopping the running process
 * @see {@link getActiveProcess} for retrieving the active process
 * @see {@link GodotProcess} for the return type structure
 */
export const runGodotProject = (
  godotPath: string,
  projectPath: string,
  scene?: string,
): GodotProcess => {
  // Kill any existing process
  if (activeProcess) {
    logDebug('Killing existing Godot process before starting a new one');
    activeProcess.process.kill();
  }

  const cmdArgs = ['-d', '--path', projectPath];
  if (scene) {
    logDebug(`Adding scene parameter: ${scene}`);
    cmdArgs.push(scene);
  }

  logDebug(`Running Godot project: ${projectPath}`);
  const process = spawn(godotPath, cmdArgs, { stdio: 'pipe' });
  const output: string[] = [];
  const errors: string[] = [];

  process.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    output.push(...lines);
    lines.forEach((line: string) => {
      if (line.trim()) logDebug(`[Godot stdout] ${line}`);
    });
  });

  process.stderr?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n');
    errors.push(...lines);
    lines.forEach((line: string) => {
      if (line.trim()) logDebug(`[Godot stderr] ${line}`);
    });
  });

  process.on('exit', (code: number | null) => {
    logDebug(`Godot process exited with code ${code}`);
    if (activeProcess && activeProcess.process === process) {
      activeProcess = null;
    }
  });

  process.on('error', (err: Error) => {
    console.error('Failed to start Godot process:', err);
    if (activeProcess && activeProcess.process === process) {
      activeProcess = null;
    }
  });

  const godotProcess: GodotProcess = { process, output, errors };
  activeProcess = godotProcess;

  return godotProcess;
};

/**
 * Cleans up all managed processes during application shutdown.
 *
 * This function should be called during graceful shutdown to ensure all
 * spawned Godot processes are properly terminated and resources are released.
 * It prevents orphaned processes and potential resource leaks.
 *
 * @function cleanup
 * @returns {void}
 *
 * @example
 * ```typescript
 * // Register cleanup for process exit
 * process.on('exit', cleanup);
 * process.on('SIGINT', () => {
 *   cleanup();
 *   process.exit(0);
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Manual cleanup before application shutdown
 * async function shutdown() {
 *   cleanup();
 *   await saveState();
 *   process.exit(0);
 * }
 * ```
 *
 * @remarks
 * - Safe to call multiple times
 * - Safe to call when no process is active
 * - Clears the active process reference after termination
 *
 * @see {@link stopActiveProcess} for stopping with output capture
 */
export const cleanup = (): void => {
  logDebug('Cleaning up processes');
  if (activeProcess) {
    logDebug('Killing active Godot process');
    activeProcess.process.kill();
    activeProcess = null;
  }
};
