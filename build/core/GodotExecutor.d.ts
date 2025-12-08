/**
 * Godot executor utilities
 * Handles execution of Godot operations and commands
 */
import { BaseToolArgs } from '../server/types';
/**
 * Check if the Godot version is 4.4 or later
 */
export declare const isGodot44OrLater: (version: string) => boolean;
/**
 * Get Godot version
 */
export declare const getGodotVersion: (godotPath: string) => Promise<string>;
/**
 * Execute a Godot operation using the operations script
 */
export declare const executeOperation: (operation: string, params: BaseToolArgs, projectPath: string, godotPath: string) => Promise<{
    stdout: string;
    stderr: string;
}>;
//# sourceMappingURL=GodotExecutor.d.ts.map