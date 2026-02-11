/**
 * ProcessManager Unit Tests
 * ISO/IEC 29119 compliant test structure
 *
 * Test Categories:
 * - TC-VAL: Input validation
 * - TC-SUC: Success scenarios
 * - TC-ERR: Error handling
 * - TC-EDGE: Edge cases
 */

import { jest } from '@jest/globals';
import { EventEmitter } from 'events';
import type { ChildProcess } from 'child_process';

/**
 * Helper to create a mock ChildProcess-like object
 */
function createMockProcess(): { kill: jest.Mock; pid: number } & EventEmitter {
  const proc = new EventEmitter() as EventEmitter & {
    kill: jest.Mock;
    pid: number;
    stdout: EventEmitter | null;
    stderr: EventEmitter | null;
  };
  proc.kill = jest.fn();
  proc.stdout = new EventEmitter();
  proc.stderr = new EventEmitter();
  proc.pid = 12345;
  return proc;
}

// Import module under test (state management functions don't need mocking)
import {
  getActiveProcess,
  setActiveProcess,
  hasActiveProcess,
  stopActiveProcess,
  cleanup,
  type GodotProcess,
} from './ProcessManager.js';

describe('ProcessManager', () => {
  beforeEach(() => {
    // Reset active process state
    setActiveProcess(null);
  });

  describe('getActiveProcess', () => {
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

  describe('setActiveProcess', () => {
    it('should set the active process', () => {
      const mockProc = createMockProcess();
      const godotProcess: GodotProcess = {
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      };
      setActiveProcess(godotProcess);
      expect(getActiveProcess()).toBe(godotProcess);
    });

    it('should clear the active process when null is passed', () => {
      const mockProc = createMockProcess();
      const godotProcess: GodotProcess = {
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      };
      setActiveProcess(godotProcess);
      expect(getActiveProcess()).not.toBeNull();

      setActiveProcess(null);
      expect(getActiveProcess()).toBeNull();
    });

    it('should replace an existing active process', () => {
      const proc1 = createMockProcess();
      const proc2 = createMockProcess();
      const gp1: GodotProcess = { process: proc1 as unknown as ChildProcess, output: [], errors: [] };
      const gp2: GodotProcess = { process: proc2 as unknown as ChildProcess, output: ['new'], errors: [] };

      setActiveProcess(gp1);
      expect(getActiveProcess()).toBe(gp1);

      setActiveProcess(gp2);
      expect(getActiveProcess()).toBe(gp2);
    });
  });

  describe('hasActiveProcess', () => {
    it('should return false when no process is active', () => {
      expect(hasActiveProcess()).toBe(false);
    });

    it('should return true when a process is active', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });
      expect(hasActiveProcess()).toBe(true);
    });

    it('should return false after clearing the active process', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });
      setActiveProcess(null);
      expect(hasActiveProcess()).toBe(false);
    });
  });

  describe('stopActiveProcess', () => {
    it('should return null when no process is active', () => {
      const result = stopActiveProcess();
      expect(result).toBeNull();
    });

    it('should return output and errors when a process is stopped', () => {
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
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });

      stopActiveProcess();
      expect(mockProc.kill).toHaveBeenCalled();
    });

    it('should clear the active process after stopping', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });

      stopActiveProcess();
      expect(getActiveProcess()).toBeNull();
      expect(hasActiveProcess()).toBe(false);
    });

    it('should return empty arrays when process had no output', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });

      const result = stopActiveProcess();
      expect(result!.output).toEqual([]);
      expect(result!.errors).toEqual([]);
    });

    it('should be idempotent - second call returns null', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: ['data'],
        errors: [],
      });

      const result1 = stopActiveProcess();
      const result2 = stopActiveProcess();
      expect(result1).not.toBeNull();
      expect(result2).toBeNull();
    });
  });

  describe('cleanup', () => {
    it('should be safe to call when no process is active', () => {
      expect(() => cleanup()).not.toThrow();
    });

    it('should kill the active process', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });

      cleanup();
      expect(mockProc.kill).toHaveBeenCalled();
    });

    it('should clear the active process after cleanup', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });

      cleanup();
      expect(getActiveProcess()).toBeNull();
    });

    it('should be safe to call multiple times', () => {
      const mockProc = createMockProcess();
      setActiveProcess({
        process: mockProc as unknown as ChildProcess,
        output: [],
        errors: [],
      });

      cleanup();
      cleanup();
      cleanup();
      expect(getActiveProcess()).toBeNull();
      // kill should only be called once (first cleanup)
      expect(mockProc.kill).toHaveBeenCalledTimes(1);
    });
  });

  describe('GodotProcess interface', () => {
    it('should support process with populated output arrays', () => {
      const mockProc = createMockProcess();
      const largeOutput = Array.from({ length: 100 }, (_, i) => `line ${i}`);
      const gp: GodotProcess = {
        process: mockProc as unknown as ChildProcess,
        output: largeOutput,
        errors: ['err1', 'err2'],
      };
      setActiveProcess(gp);

      const result = stopActiveProcess();
      expect(result!.output).toHaveLength(100);
      expect(result!.errors).toHaveLength(2);
    });
  });
});
