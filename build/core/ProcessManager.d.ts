/**
 * Process management utilities
 * Handles active Godot processes and their lifecycle
 * ISO/IEC 25010 compliant - strict typing
 */
import { ChildProcess } from 'child_process';
export interface GodotProcess {
    process: ChildProcess;
    output: string[];
    errors: string[];
}
/**
 * Get the currently active Godot process
 */
export declare const getActiveProcess: () => GodotProcess | null;
/**
 * Set the active Godot process
 */
export declare const setActiveProcess: (process: GodotProcess | null) => void;
/**
 * Check if there's an active Godot process
 */
export declare const hasActiveProcess: () => boolean;
/**
 * Stop the currently active Godot process
 */
export declare const stopActiveProcess: () => {
    output: string[];
    errors: string[];
} | null;
/**
 * Launch Godot editor for a specific project
 */
export declare const launchGodotEditor: (godotPath: string, projectPath: string) => void;
/**
 * Run a Godot project in debug mode
 */
export declare const runGodotProject: (godotPath: string, projectPath: string, scene?: string) => GodotProcess;
/**
 * Cleanup all processes when shutting down
 */
export declare const cleanup: () => void;
//# sourceMappingURL=ProcessManager.d.ts.map