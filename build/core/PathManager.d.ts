/**
 * Path management utilities
 * Handles path validation, normalization, and Godot executable detection
 * ISO/IEC 25010 compliant - strict typing
 */
import { BaseToolArgs } from '../server/types';
/**
 * Validate a path to prevent path traversal attacks
 */
export declare const validatePath: (path: string) => boolean;
/**
 * Normalize path for cross-platform compatibility
 * Handles Windows drive letters and URL encoding issues
 */
export declare const normalizePath: (path: string) => string;
/**
 * Synchronous validation for quick checks
 * This is a quick check that only verifies file existence, not executable validity
 */
export declare const isValidGodotPathSync: (path: string) => boolean;
/**
 * Validate if a Godot path is valid and executable
 */
export declare const isValidGodotPath: (path: string) => Promise<boolean>;
/**
 * Get platform-specific possible Godot paths
 */
export declare const getPlatformGodotPaths: () => string[];
/**
 * Detect the Godot executable path based on the operating system
 */
export declare const detectGodotPath: (customPath?: string, strictPathValidation?: boolean) => Promise<string | null>;
/**
 * Normalize all path arguments in handler parameters
 * @param args - Tool arguments containing paths
 * @returns Arguments with normalized paths
 */
export declare const normalizeHandlerPaths: <T extends BaseToolArgs>(args: T) => T;
//# sourceMappingURL=PathManager.d.ts.map