/**
 * Tool Context - Dependency Injection for Tool Handlers
 *
 * Enables testability by injecting dependencies instead of relying on
 * static imports. Tests pass mock implementations directly; production
 * code uses the defaultToolContext singleton.
 *
 * This eliminates the need for jest.mock() which is unreliable with ESM
 * (--experimental-vm-modules) on Linux.
 */

import { ToolResponse, BaseToolArgs } from '../server/types.js';
import {
  detectGodotPath as _detectGodotPath,
  validatePath as _validatePath,
  normalizeHandlerPaths as _normalizeHandlerPaths,
  normalizePath as _normalizePath,
  isValidGodotPath as _isValidGodotPath,
} from '../core/PathManager.js';
import { normalizeParameters as _normalizeParameters } from '../core/ParameterNormalizer.js';
import {
  executeOperation as _executeOperation,
  getGodotVersion as _getGodotVersion,
} from '../core/GodotExecutor.js';
import { executeWithBridge as _executeWithBridge } from '../bridge/BridgeExecutor.js';
import {
  isGodotProject as _isGodotProject,
  findGodotProjects as _findGodotProjects,
  getProjectStructure as _getProjectStructure,
  GodotProject,
} from '../utils/FileUtils.js';
import {
  existsSync as _existsSync,
  readFileSync as _readFileSync,
  readdirSync as _readdirSync,
  writeFileSync as _writeFileSync,
  mkdirSync as _mkdirSync,
  unlinkSync as _unlinkSync,
  copyFileSync as _copyFileSync,
  statSync as _statSync,
  utimesSync as _utimesSync,
} from 'fs';
import type { Dirent, Stats } from 'fs';
import * as _fsExtra from 'fs-extra';
import {
  logDebug as _logDebug,
  logInfo as _logInfo,
  logError as _logError,
  logWarn as _logWarn,
} from '../utils/Logger.js';
import { getGodotPool as _getGodotPool, ProcessResult } from '../core/ProcessPool.js';
import {
  runGodotProject as _runGodotProject,
  launchGodotEditor as _launchGodotEditor,
} from '../core/ProcessManager.js';
import type { GodotProcess } from '../core/ProcessManager.js';
import { isGodot44OrLater as _isGodot44OrLater } from '../core/GodotExecutor.js';
import { validateScript as _validateScript } from '../bridge/ScriptValidator.js';
import type { ValidationResult } from '../bridge/ScriptValidator.js';

/**
 * Injectable context for tool handlers and resource providers.
 * All external dependencies (fs, executors, validators) are exposed here.
 */
export interface ToolContext {
  // -- PathManager --
  detectGodotPath: (customPath?: string, strictPathValidation?: boolean) => Promise<string | null>;
  validatePath: (path: string) => boolean;
  normalizeHandlerPaths: <T extends BaseToolArgs>(args: T) => T;
  normalizePath: (path: string) => string;
  isValidGodotPath: (path: string) => Promise<boolean>;

  // -- ParameterNormalizer --
  normalizeParameters: (args: BaseToolArgs) => BaseToolArgs;

  // -- GodotExecutor --
  executeOperation: (
    operation: string,
    params: BaseToolArgs,
    projectPath: string,
    godotPath: string,
  ) => Promise<{ stdout: string; stderr: string }>;
  getGodotVersion: (godotPath: string) => Promise<string>;

  // -- BridgeExecutor --
  executeWithBridge: (
    action: string,
    params: Record<string, unknown>,
    fallback: () => Promise<ToolResponse>,
  ) => Promise<ToolResponse>;

  // -- FileUtils --
  isGodotProject: (path: string) => boolean;
  findGodotProjects: (directory: string, recursive: boolean) => GodotProject[];
  getProjectStructure: (projectPath: string) => {
    scenes: number;
    scripts: number;
    assets: number;
    other: number;
  };

  // -- GodotExecutor (additional) --
  isGodot44OrLater: (version: string) => boolean;

  // -- ProcessManager --
  runGodotProject: (godotPath: string, projectPath: string, scene?: string) => GodotProcess;
  launchGodotEditor: (godotPath: string, projectPath: string) => void;

  // -- ScriptValidator --
  validateScript: (
    projectPath: string,
    scriptPath: string,
    options?: { useLSP?: boolean; useBridge?: boolean },
  ) => Promise<ValidationResult | null>;

  // -- fs --
  existsSync: (path: string) => boolean;
  readFileSync: (path: string, encoding: BufferEncoding) => string;
  readdirSync: (path: string, options: { withFileTypes: true }) => Dirent[];
  writeFileSync: (path: string, data: string, encoding?: BufferEncoding) => void;
  mkdirSync: (path: string, options?: { recursive: boolean }) => void;
  unlinkSync: (path: string) => void;
  copyFileSync: (src: string, dest: string) => void;
  statSync: (path: string) => Stats;
  utimesSync: (path: string, atime: Date | number, mtime: Date | number) => void;

  // -- fs-extra --
  ensureDir: (path: string) => Promise<void>;
  writeFile: (path: string, data: string, encoding?: string) => Promise<void>;
  readFile: (path: string, encoding: string) => Promise<string>;

  // -- Logger (simplified signatures for DI compatibility) --
  logDebug: (message: string, ...rest: unknown[]) => void;
  logInfo: (message: string, ...rest: unknown[]) => void;
  logError: (message: string, ...rest: unknown[]) => void;
  logWarn: (message: string, ...rest: unknown[]) => void;

  // -- ProcessPool --
  getGodotPool: () => {
    execute: (
      cmd: string,
      args: string[],
      opts?: Record<string, unknown>,
    ) => Promise<ProcessResult>;
  };
}

/**
 * Production singleton - wires in real implementations.
 * Every handler defaults to this when no ctx is passed.
 */
export const defaultToolContext: ToolContext = {
  // PathManager
  detectGodotPath: _detectGodotPath,
  validatePath: _validatePath,
  normalizeHandlerPaths: _normalizeHandlerPaths,
  normalizePath: _normalizePath,
  isValidGodotPath: _isValidGodotPath,

  // ParameterNormalizer
  normalizeParameters: _normalizeParameters,

  // GodotExecutor
  executeOperation: _executeOperation,
  getGodotVersion: _getGodotVersion,
  isGodot44OrLater: _isGodot44OrLater,

  // ProcessManager
  runGodotProject: _runGodotProject,
  launchGodotEditor: _launchGodotEditor,

  // ScriptValidator
  validateScript: _validateScript,

  // BridgeExecutor
  executeWithBridge: _executeWithBridge,

  // FileUtils
  isGodotProject: _isGodotProject,
  findGodotProjects: _findGodotProjects,
  getProjectStructure: _getProjectStructure,

  // fs
  existsSync: (path: string) => _existsSync(path),
  readFileSync: (path: string, encoding: BufferEncoding) =>
    _readFileSync(path, encoding) as string,
  readdirSync: (path: string, options: { withFileTypes: true }) =>
    _readdirSync(path, options),
  writeFileSync: (path: string, data: string, encoding?: BufferEncoding) =>
    _writeFileSync(path, data, { encoding: encoding ?? 'utf-8' }),
  mkdirSync: (path: string, options?: { recursive: boolean }) =>
    _mkdirSync(path, options ?? { recursive: false }),
  unlinkSync: (path: string) => _unlinkSync(path),
  copyFileSync: (src: string, dest: string) => _copyFileSync(src, dest),
  statSync: (path: string) => _statSync(path),
  utimesSync: (path: string, atime: Date | number, mtime: Date | number) =>
    _utimesSync(path, atime, mtime),

  // fs-extra (wrapped to match simplified signatures)
  ensureDir: (path: string) => _fsExtra.ensureDir(path),
  writeFile: (path: string, data: string, encoding?: string) =>
    _fsExtra.writeFile(path, data, { encoding: (encoding ?? 'utf-8') as BufferEncoding }),
  readFile: (path: string, encoding: string) =>
    _fsExtra.readFile(path, { encoding: encoding as BufferEncoding }) as Promise<string>,

  // Logger
  logDebug: _logDebug as (message: string, ...rest: unknown[]) => void,
  logInfo: _logInfo as (message: string, ...rest: unknown[]) => void,
  logError: _logError as (message: string, ...rest: unknown[]) => void,
  logWarn: _logWarn as (message: string, ...rest: unknown[]) => void,

  // ProcessPool
  getGodotPool: _getGodotPool,
};

/**
 * Create a ToolContext with sensible defaults for testing.
 * Override only the dependencies your test cares about.
 *
 * @example
 * ```typescript
 * const ctx = createMockContext({
 *   isGodotProject: () => true,
 *   ensureDir: jest.fn().mockResolvedValue(undefined),
 *   writeFile: jest.fn().mockResolvedValue(undefined),
 * });
 * const result = await handleCreateShader(args, ctx);
 * ```
 */
export const createMockContext = (overrides?: Partial<ToolContext>): ToolContext => ({
  // PathManager - permissive defaults
  detectGodotPath: async () => '/usr/bin/godot',
  validatePath: () => true,
  normalizeHandlerPaths: <T extends BaseToolArgs>(args: T): T => args,
  normalizePath: (p: string) => p,
  isValidGodotPath: async () => true,

  // ParameterNormalizer - identity
  normalizeParameters: (args: BaseToolArgs) => args,

  // GodotExecutor - success stubs
  executeOperation: async () => ({ stdout: '', stderr: '' }),
  getGodotVersion: async () => '4.2.stable',
  isGodot44OrLater: () => true,

  // ProcessManager - noop stubs
  runGodotProject: (_godotPath, _projectPath, _scene?) => ({
    process: { kill: () => {}, pid: 0, stdout: null, stderr: null } as unknown as import('child_process').ChildProcess,
    output: [],
    errors: [],
  }),
  launchGodotEditor: () => {},

  // ScriptValidator - no errors stub
  validateScript: async () => ({ errors: [], source: 'none' as const }),

  // BridgeExecutor - always fallback (no bridge)
  executeWithBridge: async (_action, _params, fallback) => fallback(),

  // FileUtils - permissive defaults
  isGodotProject: () => true,
  findGodotProjects: () => [],
  getProjectStructure: () => ({ scenes: 0, scripts: 0, assets: 0, other: 0 }),

  // fs - permissive defaults
  existsSync: () => true,
  readFileSync: () => '',
  readdirSync: () => [],
  writeFileSync: () => {},
  mkdirSync: () => {},
  unlinkSync: () => {},
  copyFileSync: () => {},
  statSync: () => ({ size: 0, mtime: new Date(), isFile: () => true, isDirectory: () => false }) as unknown as Stats,
  utimesSync: () => {},

  // fs-extra - success stubs
  ensureDir: async () => {},
  writeFile: async () => {},
  readFile: async () => '',

  // Logger - silent
  logDebug: () => {},
  logInfo: () => {},
  logError: () => {},
  logWarn: () => {},

  // ProcessPool - success stub
  getGodotPool: () => ({
    execute: async () => ({ stdout: '', stderr: '', exitCode: 0, duration: 0 }),
  }),

  // Apply user overrides
  ...overrides,
});
