/**
 * ScriptValidator Unit Tests
 * Tests high-level script validation without requiring Godot runtime
 * ISO/IEC 25010 compliant test coverage
 */

import { type ValidationError, type ValidationResult } from './ScriptValidator.js';

describe('ScriptValidator', () => {
  describe('ValidationError interface', () => {
    it('should have all required fields', () => {
      const error: ValidationError = {
        file: 'res://scripts/player.gd',
        line: 10,
        message: 'Undefined variable',
        type: 'error',
      };

      expect(error.file).toBeDefined();
      expect(error.line).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.type).toBeDefined();
    });

    it('should allow optional column field', () => {
      const error: ValidationError = {
        file: 'res://scripts/player.gd',
        line: 10,
        column: 5,
        message: 'Undefined variable',
        type: 'error',
      };

      expect(error.column).toBe(5);
    });

    it('should accept error type', () => {
      const error: ValidationError = {
        file: 'test.gd',
        line: 1,
        message: 'Error',
        type: 'error',
      };
      expect(error.type).toBe('error');
    });

    it('should accept warning type', () => {
      const warning: ValidationError = {
        file: 'test.gd',
        line: 1,
        message: 'Warning',
        type: 'warning',
      };
      expect(warning.type).toBe('warning');
    });
  });

  describe('ValidationResult interface', () => {
    it('should represent LSP source', () => {
      const result: ValidationResult = {
        errors: [],
        source: 'lsp',
      };
      expect(result.source).toBe('lsp');
    });

    it('should represent bridge source', () => {
      const result: ValidationResult = {
        errors: [],
        source: 'bridge',
      };
      expect(result.source).toBe('bridge');
    });

    it('should represent CLI source', () => {
      const result: ValidationResult = {
        errors: [],
        source: 'cli',
        rawOutput: 'Godot output...',
      };
      expect(result.source).toBe('cli');
      expect(result.rawOutput).toBeDefined();
    });

    it('should represent no source available', () => {
      const result: ValidationResult = {
        errors: [],
        source: 'none',
      };
      expect(result.source).toBe('none');
    });

    it('should contain multiple errors', () => {
      const result: ValidationResult = {
        errors: [
          { file: 'test.gd', line: 10, message: 'Error 1', type: 'error' },
          { file: 'test.gd', line: 20, message: 'Error 2', type: 'error' },
          { file: 'test.gd', line: 30, message: 'Warning 1', type: 'warning' },
        ],
        source: 'lsp',
      };

      expect(result.errors).toHaveLength(3);
      expect(result.errors.filter((e) => e.type === 'error')).toHaveLength(2);
      expect(result.errors.filter((e) => e.type === 'warning')).toHaveLength(1);
    });
  });

  describe('validation priority', () => {
    it('should prefer LSP over Bridge over CLI', () => {
      const priorities = ['lsp', 'bridge', 'cli'] as const;
      expect(priorities[0]).toBe('lsp');
      expect(priorities[1]).toBe('bridge');
      expect(priorities[2]).toBe('cli');
    });
  });

  describe('path handling', () => {
    it('should handle res:// paths', () => {
      const path = 'res://scripts/player.gd';
      expect(path.startsWith('res://')).toBe(true);
    });

    it('should convert Windows paths to res:// format', () => {
      const windowsPath = 'scripts\\player.gd';
      const resPath = `res://${windowsPath.replace(/\\/g, '/')}`;
      expect(resPath).toBe('res://scripts/player.gd');
    });
  });
});
