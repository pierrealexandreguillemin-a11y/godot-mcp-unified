/**
 * ProcessManager Unit Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test Categories:
 * - TC-STATE: State management (getActiveProcess, setActiveProcess, hasActiveProcess)
 * - TC-STOP: stopActiveProcess behavior
 * - TC-CLEAN: cleanup behavior
 * - TC-RUN: runGodotProject (spawn args, capture, lifecycle)
 * - TC-EDIT: launchGodotEditor (spawn args)
 * - TC-SEC: Security (validateCommandSecurity, shell:false)
 * - TC-EDGE: Edge cases
 *
 * Uses jest.unstable_mockModule for ESM-compatible mocking.
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

// Track mock process state
let currentMockProcess: EventEmitter & {
  kill: jest.Mock;
  pid: number;
  stdout: EventEmitter;
  stderr: EventEmitter;
};
let spawnCallArgs: unknown[][] = [];

function createMockProcess() {
  const proc = new EventEmitter() as EventEmitter & {
    kill: jest.Mock;
    pid: number;
    stdout: EventEmitter;
    stderr: EventEmitter;
  };
  proc.kill = jest.fn();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.pid = Math.floor(Math.random() * 100000);
  return proc;
}

const mockValidateCommandSecurity = jest.fn();

// TOP-LEVEL mock registrations (synchronous, before any dynamic imports)
jest.unstable_mockModule('child_process', () => ({
  spawn: (...args: unknown[]) => {
    currentMockProcess = createMockProcess();
    spawnCallArgs.push(args);
    return currentMockProcess;
  },
}));

jest.unstable_mockModule('./ProcessPool.js', () => ({
  validateCommandSecurity: (...args: unknown[]) => mockValidateCommandSecurity(...args),
  getGodotPool: jest.fn(),
}));

jest.unstable_mockModule('../utils/Logger.js', () => ({
  logDebug: jest.fn(),
  logError: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
}));

// Type declarations for dynamically imported functions
let getActiveProcess: typeof import('./ProcessManager.js')['getActiveProcess'];
let setActiveProcess: typeof import('./ProcessManager.js')['setActiveProcess'];
let hasActiveProcess: typeof import('./ProcessManager.js')['hasActiveProcess'];
let stopActiveProcess: typeof import('./ProcessManager.js')['stopActiveProcess'];
let cleanup: typeof import('./ProcessManager.js')['cleanup'];
let runGodotProject: typeof import('./ProcessManager.js')['runGodotProject'];
let launchGodotEditor: typeof import('./ProcessManager.js')['launchGodotEditor'];
type GodotProcess = import('./ProcessManager.js').GodotProcess;

beforeAll(async () => {
  const mod = await import('./ProcessManager.js');
  getActiveProcess = mod.getActiveProcess;
  setActiveProcess = mod.setActiveProcess;
  hasActiveProcess = mod.hasActiveProcess;
  stopActiveProcess = mod.stopActiveProcess;
  cleanup = mod.cleanup;
  runGodotProject = mod.runGodotProject;
  launchGodotEditor = mod.launchGodotEditor;
});

describe('ProcessManager', () => {
  beforeEach(() => {
    setActiveProcess(null);
    spawnCallArgs = [];
    jest.resetAllMocks();
  });

  // ===================================
  // TC-STATE: State management
  // ===================================
  describe('TC-STATE: getActiveProcess', () => {
    it('should return null when no process is active', () => {
      expect(getActiveProcess()).toBeNull();
    });

    it('should return the active process when one is set', () => {
      const mockProc = createMockProcess();
      const godotProcess: GodotProcess = {
        process: mockProc as unknown as ChildProcess,
        output: ['line1'],
        errors: [],
      };
      setActiveProcess(godotProcess);
      expect(getActiveProcess()).toBe(godotProcess);
    });
  });

  describe('TC-STATE: setActiveProcess', () => {
    it('should set the active process', () => {
      const mockProc = createMockProcess();
      const gp: GodotProcess = { process: mockProc as unknown as ChildProcess, output: [], errors: [] };
      setActiveProcess(gp);
      expect(getActiveProcess()).toBe(gp);
    });

    it('should clear when null is passed', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      setActiveProcess(null);
      expect(getActiveProcess()).toBeNull();
    });

    it('should replace an existing active process', () => {
      const proc1 = createMockProcess();
      const proc2 = createMockProcess();
      const gp1: GodotProcess = { process: proc1 as unknown as ChildProcess, output: [], errors: [] };
      const gp2: GodotProcess = { process: proc2 as unknown as ChildProcess, output: ['new'], errors: [] };
      setActiveProcess(gp1);
      setActiveProcess(gp2);
      expect(getActiveProcess()).toBe(gp2);
    });
  });

  describe('TC-STATE: hasActiveProcess', () => {
    it('should return false when no process is active', () => {
      expect(hasActiveProcess()).toBe(false);
    });

    it('should return true when a process is active', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      expect(hasActiveProcess()).toBe(true);
    });

    it('should return false after clearing', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      setActiveProcess(null);
      expect(hasActiveProcess()).toBe(false);
    });
  });

  // ===================================
  // TC-STOP: stopActiveProcess
  // ===================================
  describe('TC-STOP: stopActiveProcess', () => {
    it('should return null when no process is active', () => {
      expect(stopActiveProcess()).toBeNull();
    });

    it('should return captured output and errors', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: ['stdout line 1', 'stdout line 2'],
        errors: ['stderr line 1'],
      });
      const result = stopActiveProcess();
      expect(result).not.toBeNull();
      expect(result!.output).toEqual(['stdout line 1', 'stdout line 2']);
      expect(result!.errors).toEqual(['stderr line 1']);
    });

    it('should kill the process', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      stopActiveProcess();
      expect(mockProc.kill).toHaveBeenCalled();
    });

    it('should clear the active process', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      stopActiveProcess();
      expect(getActiveProcess()).toBeNull();
    });

    it('should be idempotent - second call returns null', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: ['data'], errors: [] });
      expect(stopActiveProcess()).not.toBeNull();
      expect(stopActiveProcess()).toBeNull();
    });
  });

  // ===================================
  // TC-CLEAN: cleanup
  // ===================================
  describe('TC-CLEAN: cleanup', () => {
    it('should be safe to call when no process is active', () => {
      expect(() => cleanup()).not.toThrow();
    });

    it('should kill the active process', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      cleanup();
      expect(mockProc.kill).toHaveBeenCalled();
    });

    it('should clear the active process', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      cleanup();
      expect(getActiveProcess()).toBeNull();
    });

    it('should be safe to call multiple times (kill only once)', () => {
      const mockProc = createMockProcess();
      setActiveProcess({ process: mockProc as unknown as ChildProcess, output: [], errors: [] });
      cleanup();
      cleanup();
      cleanup();
      expect(mockProc.kill).toHaveBeenCalledTimes(1);
    });
  });

  // ===================================
  // TC-RUN: runGodotProject
  // ===================================
  describe('TC-RUN: runGodotProject', () => {
    it('should spawn with -d, --path, and shell:false', () => {
      runGodotProject('/usr/bin/godot', '/home/user/project');
      expect(spawnCallArgs).toHaveLength(1);
      expect(spawnCallArgs[0][0]).toBe('/usr/bin/godot');
      expect(spawnCallArgs[0][1]).toEqual(['-d', '--path', '/home/user/project']);
      expect(spawnCallArgs[0][2]).toEqual(expect.objectContaining({ stdio: 'pipe', shell: false }));
    });

    it('should include scene path in spawn args when provided', () => {
      runGodotProject('/usr/bin/godot', '/project', 'res://scenes/level.tscn');
      expect(spawnCallArgs[0][1]).toEqual(['-d', '--path', '/project', 'res://scenes/level.tscn']);
    });

    it('should call validateCommandSecurity before spawning', () => {
      runGodotProject('/usr/bin/godot', '/project');
      expect(mockValidateCommandSecurity).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['-d', '--path', '/project'],
      );
    });

    it('should set the process as active', () => {
      const gp = runGodotProject('/usr/bin/godot', '/project');
      expect(getActiveProcess()).toBe(gp);
      expect(hasActiveProcess()).toBe(true);
    });

    it('should return a GodotProcess with output and errors arrays', () => {
      const gp = runGodotProject('/usr/bin/godot', '/project');
      expect(gp.output).toEqual([]);
      expect(gp.errors).toEqual([]);
      expect(gp.process).toBeDefined();
    });

    it('should capture stdout data', () => {
      const gp = runGodotProject('/usr/bin/godot', '/project');
      currentMockProcess.stdout.emit('data', Buffer.from('line1\nline2\n'));
      expect(gp.output).toContain('line1');
      expect(gp.output).toContain('line2');
    });

    it('should capture stderr data', () => {
      const gp = runGodotProject('/usr/bin/godot', '/project');
      currentMockProcess.stderr.emit('data', Buffer.from('error1\nerror2\n'));
      expect(gp.errors).toContain('error1');
      expect(gp.errors).toContain('error2');
    });

    it('should clear active process on exit event', () => {
      const gp = runGodotProject('/usr/bin/godot', '/project');
      expect(getActiveProcess()).toBe(gp);
      currentMockProcess.emit('exit', 0);
      expect(getActiveProcess()).toBeNull();
    });

    it('should clear active process on error event', () => {
      runGodotProject('/usr/bin/godot', '/project');
      expect(hasActiveProcess()).toBe(true);
      currentMockProcess.emit('error', new Error('spawn ENOENT'));
      expect(getActiveProcess()).toBeNull();
    });

    it('should kill existing process before starting a new one', () => {
      runGodotProject('/usr/bin/godot', '/project1');
      const firstMock = currentMockProcess;
      runGodotProject('/usr/bin/godot', '/project2');
      expect(firstMock.kill).toHaveBeenCalled();
    });

    it('should cap stdout at MAX_OUTPUT_LINES (10,000)', () => {
      const gp = runGodotProject('/usr/bin/godot', '/project');
      for (let i = 0; i < 10005; i++) {
        currentMockProcess.stdout.emit('data', Buffer.from(`line${i}\n`));
      }
      expect(gp.output.length).toBeLessThanOrEqual(10001);
    });

    it('should cap stderr at MAX_OUTPUT_LINES (10,000)', () => {
      const gp = runGodotProject('/usr/bin/godot', '/project');
      for (let i = 0; i < 10005; i++) {
        currentMockProcess.stderr.emit('data', Buffer.from(`err${i}\n`));
      }
      expect(gp.errors.length).toBeLessThanOrEqual(10001);
    });

    it('should reject when validateCommandSecurity throws', () => {
      mockValidateCommandSecurity.mockImplementation(() => {
        throw new Error('Invalid command: shell metacharacters');
      });
      expect(() => runGodotProject('/bad;cmd', '/project')).toThrow('shell metacharacters');
      expect(spawnCallArgs).toHaveLength(0);
    });
  });

  // ===================================
  // TC-EDIT: launchGodotEditor
  // ===================================
  describe('TC-EDIT: launchGodotEditor', () => {
    it('should spawn with -e and --path flags', () => {
      launchGodotEditor('/usr/bin/godot', '/home/user/project');
      expect(spawnCallArgs).toHaveLength(1);
      expect(spawnCallArgs[0][0]).toBe('/usr/bin/godot');
      expect(spawnCallArgs[0][1]).toEqual(['-e', '--path', '/home/user/project']);
      expect(spawnCallArgs[0][2]).toEqual(expect.objectContaining({ stdio: 'pipe', shell: false }));
    });

    it('should call validateCommandSecurity before spawning', () => {
      launchGodotEditor('/usr/bin/godot', '/project');
      expect(mockValidateCommandSecurity).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['-e', '--path', '/project'],
      );
    });

    it('should NOT set the process as active', () => {
      launchGodotEditor('/usr/bin/godot', '/project');
      expect(getActiveProcess()).toBeNull();
    });

    it('should handle error events without crashing', () => {
      launchGodotEditor('/usr/bin/godot', '/project');
      expect(() => {
        currentMockProcess.emit('error', new Error('spawn ENOENT'));
      }).not.toThrow();
    });

    it('should reject when validateCommandSecurity throws', () => {
      mockValidateCommandSecurity.mockImplementation(() => {
        throw new Error('Injection detected');
      });
      expect(() => launchGodotEditor('/bad;cmd', '/project')).toThrow('Injection detected');
      expect(spawnCallArgs).toHaveLength(0);
    });
  });

  // ===================================
  // TC-SEC: Security
  // ===================================
  describe('TC-SEC: Security', () => {
    it('runGodotProject always uses shell:false', () => {
      runGodotProject('/usr/bin/godot', '/project');
      expect(spawnCallArgs[0][2]).toEqual(expect.objectContaining({ shell: false }));
    });

    it('launchGodotEditor always uses shell:false', () => {
      launchGodotEditor('/usr/bin/godot', '/project');
      expect(spawnCallArgs[0][2]).toEqual(expect.objectContaining({ shell: false }));
    });

    it('validateCommandSecurity runs for every runGodotProject call', () => {
      runGodotProject('/path/godot', '/p1');
      runGodotProject('/path/godot', '/p2');
      expect(mockValidateCommandSecurity).toHaveBeenCalledTimes(2);
    });

    it('validateCommandSecurity runs for every launchGodotEditor call', () => {
      launchGodotEditor('/path/godot', '/p1');
      launchGodotEditor('/path/godot', '/p2');
      expect(mockValidateCommandSecurity).toHaveBeenCalledTimes(2);
    });
  });

  // ===================================
  // TC-EDGE: Edge cases
  // ===================================
  describe('TC-EDGE: Edge cases', () => {
    it('should handle process with large accumulated output arrays', () => {
      const mockProc = createMockProcess();
      const largeOutput = Array.from({ length: 100 }, (_, i) => `line ${i}`);
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: largeOutput,
        errors: ['err1', 'err2'],
      });
      const result = stopActiveProcess();
      expect(result!.output).toHaveLength(100);
      expect(result!.errors).toHaveLength(2);
    });

    it('exit event should not clear if different process is now active', () => {
      runGodotProject('/usr/bin/godot', '/project1');
      const firstProcess = currentMockProcess;
      const gp2 = runGodotProject('/usr/bin/godot', '/project2');

      firstProcess.emit('exit', 0);
      expect(getActiveProcess()).toBe(gp2);
    });

    it('stopActiveProcess returns correct data after output accumulation', () => {
      const mockProc = createMockProcess();
      const output = ['line1', 'line2'];
      const errors = ['err1'];
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output,
        errors,
      });
      output.push('line3');
      errors.push('err2');

      const result = stopActiveProcess();
      expect(result!.output).toEqual(['line1', 'line2', 'line3']);
      expect(result!.errors).toEqual(['err1', 'err2']);
    });
  });
});
