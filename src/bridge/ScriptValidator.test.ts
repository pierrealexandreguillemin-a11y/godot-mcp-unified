/**
 * ScriptValidator Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for validateViaLSP, validateViaBridge, validateScript, isRealTimeValidationAvailable
 * and convertLSPDiagnostics (internal function tested indirectly)
 *
 * Uses jest.unstable_mockModule + dynamic import for ESM compatibility
 */

import { jest, describe, it, expect, beforeAll, beforeEach } from '@jest/globals';

// Create typed mock functions at module scope
const mockReadFileSync = jest.fn<(...args: unknown[]) => string>();
const mockTryConnectToGodot = jest.fn<() => Promise<boolean>>();
const mockGetGodotBridge = jest.fn<() => unknown>();
const mockTryConnectToLSP = jest.fn<() => Promise<boolean>>();
const mockGetGodotLSPClient = jest.fn<() => unknown>();

// Register mocks at top level BEFORE any import of ScriptValidator
jest.unstable_mockModule('fs', () => ({
  readFileSync: mockReadFileSync,
}));

jest.unstable_mockModule('../utils/Logger.js', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

// Mock ALL modules that ./index.js re-exports from to prevent real code loading
// via the barrel import. ScriptValidator.ts imports from ./index.js which loads all of these.
jest.unstable_mockModule('./GodotBridge.js', () => ({
  GodotBridge: jest.fn(),
  getGodotBridge: mockGetGodotBridge,
  tryConnectToGodot: mockTryConnectToGodot,
}));

jest.unstable_mockModule('./GodotLSPClient.js', () => ({
  GodotLSPClient: jest.fn(),
  getGodotLSPClient: mockGetGodotLSPClient,
  tryConnectToLSP: mockTryConnectToLSP,
  DiagnosticSeverity: { Error: 1, Warning: 2, Information: 3, Hint: 4 },
}));

jest.unstable_mockModule('./GodotPluginBridge.js', () => ({
  GodotPluginBridge: jest.fn(),
  getGodotPluginBridge: jest.fn(),
  resetGodotPluginBridge: jest.fn(),
  tryConnectToPlugin: jest.fn(),
}));

jest.unstable_mockModule('./BridgeExecutor.js', () => ({
  executeWithBridge: jest.fn(),
  isBridgeAvailable: jest.fn(),
  tryInitializeBridge: jest.fn(),
}));

jest.unstable_mockModule('./BridgeProtocol.js', () => ({}));

// Helper to create a mock LSP client
function createMockLspClient(diagnostics: unknown[] = []) {
  return {
    pathToUri: jest.fn<() => string>().mockReturnValue('file:///project/test.gd'),
    openDocument: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    getDiagnostics: jest.fn<() => unknown[]>().mockReturnValue([]),
    convertDiagnostics: jest.fn<() => unknown[]>().mockReturnValue(diagnostics),
    closeDocument: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  };
}

// Helper to create a mock Bridge
function createMockBridge(errors: unknown[] = []) {
  return {
    validateScript: jest.fn<(path: string) => Promise<{ errors: unknown[] }>>().mockResolvedValue({ errors }),
  };
}

// Type declarations for dynamically imported module exports
let validateViaLSP: typeof import('./ScriptValidator.js')['validateViaLSP'];
let validateViaBridge: typeof import('./ScriptValidator.js')['validateViaBridge'];
let validateScript: typeof import('./ScriptValidator.js')['validateScript'];
let isRealTimeValidationAvailable: typeof import('./ScriptValidator.js')['isRealTimeValidationAvailable'];

// Dynamic import in beforeAll (AFTER mocks are registered)
beforeAll(async () => {
  const mod = await import('./ScriptValidator.js');
  validateViaLSP = mod.validateViaLSP;
  validateViaBridge = mod.validateViaBridge;
  validateScript = mod.validateScript;
  isRealTimeValidationAvailable = mod.isRealTimeValidationAvailable;
});

describe('ScriptValidator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('ValidationError interface', () => {
    it('should have all required fields', () => {
      const error = {
        file: 'res://scripts/player.gd',
        line: 10,
        message: 'Undefined variable',
        type: 'error' as const,
      };

      expect(error.file).toBeDefined();
      expect(error.line).toBeDefined();
      expect(error.message).toBeDefined();
      expect(error.type).toBeDefined();
    });

    it('should allow optional column field', () => {
      const error = {
        file: 'res://scripts/player.gd',
        line: 10,
        column: 5,
        message: 'Undefined variable',
        type: 'error' as const,
      };

      expect(error.column).toBe(5);
    });
  });

  describe('validateViaLSP', () => {
    it('should return null when LSP connection fails', async () => {
      mockTryConnectToLSP.mockResolvedValue(false);

      const result = await validateViaLSP('/project', 'scripts/player.gd');

      expect(result).toBeNull();
      expect(mockTryConnectToLSP).toHaveBeenCalled();
    });

    it('should validate script via LSP when connected', async () => {
      mockTryConnectToLSP.mockResolvedValue(true);
      mockReadFileSync.mockReturnValue('extends Node\n');
      mockGetGodotLSPClient.mockReturnValue(createMockLspClient());

      const result = await validateViaLSP('/project', 'scripts/player.gd');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('lsp');
      expect(result?.errors).toEqual([]);
    }, 15000);

    it('should convert LSP diagnostics to ValidationError format', async () => {
      mockTryConnectToLSP.mockResolvedValue(true);
      mockReadFileSync.mockReturnValue('extends Node\n');

      const diagnostics = [
        { file: 'player.gd', line: 10, column: 5, message: 'Undefined var', severity: 'error' },
        { file: 'player.gd', line: 20, column: 1, message: 'Unused var', severity: 'warning' },
      ];
      mockGetGodotLSPClient.mockReturnValue(createMockLspClient(diagnostics));

      const result = await validateViaLSP('/project', 'scripts/player.gd');

      expect(result?.errors).toHaveLength(2);
      expect(result?.errors[0].type).toBe('error');
      expect(result?.errors[0].message).toBe('Undefined var');
      expect(result?.errors[1].type).toBe('warning');
      expect(result?.errors[1].message).toBe('Unused var');
    }, 15000);

    it('should return null when LSP throws an error', async () => {
      mockTryConnectToLSP.mockResolvedValue(true);
      mockReadFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const result = await validateViaLSP('/project', 'nonexistent.gd');

      expect(result).toBeNull();
    });

    it('should map severity correctly for non-error diagnostics', async () => {
      mockTryConnectToLSP.mockResolvedValue(true);
      mockReadFileSync.mockReturnValue('extends Node\n');

      const diagnostics = [
        { file: 'test.gd', line: 5, column: 1, message: 'Info msg', severity: 'info' },
        { file: 'test.gd', line: 8, column: 1, message: 'Hint msg', severity: 'hint' },
      ];
      mockGetGodotLSPClient.mockReturnValue(createMockLspClient(diagnostics));

      const result = await validateViaLSP('/project', 'test.gd');

      // Non-error severity -> 'warning'
      expect(result?.errors[0].type).toBe('warning');
      expect(result?.errors[1].type).toBe('warning');
    }, 15000);
  });

  describe('validateViaBridge', () => {
    it('should return null when Bridge connection fails', async () => {
      mockTryConnectToGodot.mockResolvedValue(false);

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result).toBeNull();
      expect(mockTryConnectToGodot).toHaveBeenCalled();
    });

    it('should validate script via Bridge when connected', async () => {
      mockTryConnectToGodot.mockResolvedValue(true);
      mockGetGodotBridge.mockReturnValue(createMockBridge());

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('bridge');
      expect(result?.errors).toEqual([]);
    });

    it('should convert Bridge errors to ValidationError format', async () => {
      mockTryConnectToGodot.mockResolvedValue(true);

      const bridgeErrors = [
        { line: 10, column: 5, message: 'Parse error' },
        { line: 20, message: 'Type mismatch' },
      ];
      mockGetGodotBridge.mockReturnValue(createMockBridge(bridgeErrors));

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result?.errors).toHaveLength(2);
      expect(result?.errors[0].type).toBe('error');
      expect(result?.errors[0].line).toBe(10);
      expect(result?.errors[0].column).toBe(5);
      expect(result?.errors[1].line).toBe(20);
    });

    it('should handle bridge error with missing line field', async () => {
      mockTryConnectToGodot.mockResolvedValue(true);

      const bridgeErrors = [
        { message: 'Some error' }, // no line field
      ];
      mockGetGodotBridge.mockReturnValue(createMockBridge(bridgeErrors));

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result?.errors[0].line).toBe(0);
    });

    it('should return null when Bridge throws an error', async () => {
      mockTryConnectToGodot.mockResolvedValue(true);

      const mockBridge = {
        validateScript: jest.fn<() => Promise<never>>().mockRejectedValue(new Error('Bridge disconnected')),
      };
      mockGetGodotBridge.mockReturnValue(mockBridge);

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result).toBeNull();
    });

    it('should construct correct res:// path from project and script paths', async () => {
      mockTryConnectToGodot.mockResolvedValue(true);

      const mockBridge = createMockBridge();
      mockGetGodotBridge.mockReturnValue(mockBridge);

      await validateViaBridge('/project', 'scripts/player.gd');

      expect(mockBridge.validateScript).toHaveBeenCalledWith(
        expect.stringContaining('res://')
      );
    });
  });

  describe('validateScript', () => {
    it('should try LSP first by default', async () => {
      mockTryConnectToLSP.mockResolvedValue(true);
      mockReadFileSync.mockReturnValue('extends Node\n');
      mockGetGodotLSPClient.mockReturnValue(createMockLspClient());

      const result = await validateScript('/project', 'test.gd');

      expect(result?.source).toBe('lsp');
      // Bridge should not be tried if LSP succeeds
      expect(mockTryConnectToGodot).not.toHaveBeenCalled();
    }, 15000);

    it('should fall back to Bridge when LSP fails', async () => {
      mockTryConnectToLSP.mockResolvedValue(false);
      mockTryConnectToGodot.mockResolvedValue(true);
      mockGetGodotBridge.mockReturnValue(createMockBridge());

      const result = await validateScript('/project', 'test.gd');

      expect(result?.source).toBe('bridge');
    });

    it('should return null when both LSP and Bridge fail', async () => {
      mockTryConnectToLSP.mockResolvedValue(false);
      mockTryConnectToGodot.mockResolvedValue(false);

      const result = await validateScript('/project', 'test.gd');

      expect(result).toBeNull();
    });

    it('should skip LSP when useLSP is false', async () => {
      mockTryConnectToGodot.mockResolvedValue(true);
      mockGetGodotBridge.mockReturnValue(createMockBridge());

      const result = await validateScript('/project', 'test.gd', { useLSP: false });

      expect(mockTryConnectToLSP).not.toHaveBeenCalled();
      expect(result?.source).toBe('bridge');
    });

    it('should skip Bridge when useBridge is false', async () => {
      mockTryConnectToLSP.mockResolvedValue(false);

      const result = await validateScript('/project', 'test.gd', { useBridge: false });

      expect(mockTryConnectToGodot).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it('should return null when both options disabled', async () => {
      const result = await validateScript('/project', 'test.gd', { useLSP: false, useBridge: false });

      expect(result).toBeNull();
      expect(mockTryConnectToLSP).not.toHaveBeenCalled();
      expect(mockTryConnectToGodot).not.toHaveBeenCalled();
    });

    it('should use default options when not provided', async () => {
      mockTryConnectToLSP.mockResolvedValue(false);
      mockTryConnectToGodot.mockResolvedValue(false);

      const result = await validateScript('/project', 'test.gd');

      // Both should be tried
      expect(mockTryConnectToLSP).toHaveBeenCalled();
      expect(mockTryConnectToGodot).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('isRealTimeValidationAvailable', () => {
    it('should return both true when LSP and Bridge are available', async () => {
      mockTryConnectToLSP.mockResolvedValue(true);
      mockTryConnectToGodot.mockResolvedValue(true);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: true, bridge: true });
    });

    it('should return both false when neither is available', async () => {
      mockTryConnectToLSP.mockResolvedValue(false);
      mockTryConnectToGodot.mockResolvedValue(false);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: false, bridge: false });
    });

    it('should return mixed results', async () => {
      mockTryConnectToLSP.mockResolvedValue(true);
      mockTryConnectToGodot.mockResolvedValue(false);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: true, bridge: false });
    });

    it('should check both connections concurrently', async () => {
      mockTryConnectToLSP.mockResolvedValue(false);
      mockTryConnectToGodot.mockResolvedValue(true);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: false, bridge: true });
      expect(mockTryConnectToLSP).toHaveBeenCalledTimes(1);
      expect(mockTryConnectToGodot).toHaveBeenCalledTimes(1);
    });
  });
});
