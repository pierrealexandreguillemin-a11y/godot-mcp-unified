/**
 * Process management utilities
 * Handles active Godot processes and their lifecycle
 * ISO/IEC 25010 compliant - strict typing
 */
import { spawn } from 'child_process';
import { logDebug } from '../utils/Logger.js';
// Global state for active process
let activeProcess = null;
/**
 * Get the currently active Godot process
 */
export const getActiveProcess = () => activeProcess;
/**
 * Set the active Godot process
 */
export const setActiveProcess = (process) => {
    activeProcess = process;
};
/**
 * Check if there's an active Godot process
 */
export const hasActiveProcess = () => activeProcess !== null;
/**
 * Stop the currently active Godot process
 */
export const stopActiveProcess = () => {
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
 * Launch Godot editor for a specific project
 */
export const launchGodotEditor = (godotPath, projectPath) => {
    logDebug(`Launching Godot editor for project: ${projectPath}`);
    const process = spawn(godotPath, ['-e', '--path', projectPath], {
        stdio: 'pipe',
    });
    process.on('error', (err) => {
        console.error('Failed to start Godot editor:', err);
    });
};
/**
 * Run a Godot project in debug mode
 */
export const runGodotProject = (godotPath, projectPath, scene) => {
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
    const output = [];
    const errors = [];
    process.stdout?.on('data', (data) => {
        const lines = data.toString().split('\n');
        output.push(...lines);
        lines.forEach((line) => {
            if (line.trim())
                logDebug(`[Godot stdout] ${line}`);
        });
    });
    process.stderr?.on('data', (data) => {
        const lines = data.toString().split('\n');
        errors.push(...lines);
        lines.forEach((line) => {
            if (line.trim())
                logDebug(`[Godot stderr] ${line}`);
        });
    });
    process.on('exit', (code) => {
        logDebug(`Godot process exited with code ${code}`);
        if (activeProcess && activeProcess.process === process) {
            activeProcess = null;
        }
    });
    process.on('error', (err) => {
        console.error('Failed to start Godot process:', err);
        if (activeProcess && activeProcess.process === process) {
            activeProcess = null;
        }
    });
    const godotProcess = { process, output, errors };
    activeProcess = godotProcess;
    return godotProcess;
};
/**
 * Cleanup all processes when shutting down
 */
export const cleanup = () => {
    logDebug('Cleaning up processes');
    if (activeProcess) {
        logDebug('Killing active Godot process');
        activeProcess.process.kill();
        activeProcess = null;
    }
};
//# sourceMappingURL=ProcessManager.js.map