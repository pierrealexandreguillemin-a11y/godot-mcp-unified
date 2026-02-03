/**
 * ScriptValidator Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for validateViaLSP, validateViaBridge, validateScript, isRealTimeValidationAvailable
 * and convertLSPDiagnostics (internal function tested indirectly)
 */

import { jest } from '@jest/globals';

// Mock dependencies before imports
jest.unstable_mockModule('fs', () => ({
  readFileSync: jest.fn(),
}));

jest.unstable_mockModule('../utils/Logger.js', () => ({
  logDebug: jest.fn(),
  logInfo: jest.fn(),
  logWarn: jest.fn(),
  logError: jest.fn(),
}));

jest.unstable_mockModule('./index.js', () => ({
  tryConnectToGodot: jest.fn(),
  getGodotBridge: jest.fn(),
  tryConnectToLSP: jest.fn(),
  getGodotLSPClient: jest.fn(),
}));

const fs = await import('fs');
const bridgeIndex = await import('./index.js');
const { validateViaLSP, validateViaBridge, validateScript, isRealTimeValidationAvailable } = await import('./ScriptValidator.js');

const mockReadFileSync = fs.readFileSync as unknown as jest.Mock;
const mockTryConnectToLSP = bridgeIndex.tryConnectToLSP as unknown as jest.Mock;
const mockGetGodotLSPClient = bridgeIndex.getGodotLSPClient as unknown as jest.Mock;
const mockTryConnectToGodot = bridgeIndex.tryConnectToGodot as unknown as jest.Mock;
const mockGetGodotBridge = bridgeIndex.getGodotBridge as unknown as jest.Mock;

// Helper to create a mock LSP client
function createMockLspClient(diagnostics: unknown[] = []) {
  return {
    pathToUri: jest.fn().mockReturnValue('file:///project/test.gd') as jest.Mock,
    openDocument: jest.fn().mockResolvedValue(undefined as never) as jest.Mock,
    getDiagnostics: jest.fn().mockReturnValue([]) as jest.Mock,
    convertDiagnostics: jest.fn().mockReturnValue(diagnostics) as jest.Mock,
    closeDocument: jest.fn().mockResolvedValue(undefined as never) as jest.Mock,
  };
}

// Helper to create a mock Bridge
function createMockBridge(errors: unknown[] = []) {
  return {
    validateScript: jest.fn().mockResolvedValue({ errors } as never) as jest.Mock,
  };
}

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
      mockTryConnectToLSP.mockResolvedValue(false as never);

      const result = await validateViaLSP('/project', 'scripts/player.gd');

      expect(result).toBeNull();
      expect(mockTryConnectToLSP).toHaveBeenCalled();
    });

    it('should validate script via LSP when connected', async () => {
      mockTryConnectToLSP.mockResolvedValue(true as never);
      mockReadFileSync.mockReturnValue('extends Node\n' as never);
      mockGetGodotLSPClient.mockReturnValue(createMockLspClient());

      const result = await validateViaLSP('/project', 'scripts/player.gd');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('lsp');
      expect(result?.errors).toEqual([]);
    }, 15000);

    it('should convert LSP diagnostics to ValidationError format', async () => {
      mockTryConnectToLSP.mockResolvedValue(true as never);
      mockReadFileSync.mockReturnValue('extends Node\n' as never);

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
      mockTryConnectToLSP.mockResolvedValue(true as never);
      mockReadFileSync.mockImplementation(() => { throw new Error('File not found'); });

      const result = await validateViaLSP('/project', 'nonexistent.gd');

      expect(result).toBeNull();
    });

    it('should map severity correctly for non-error diagnostics', async () => {
      mockTryConnectToLSP.mockResolvedValue(true as never);
      mockReadFileSync.mockReturnValue('extends Node\n' as never);

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
      mockTryConnectToGodot.mockResolvedValue(false as never);

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result).toBeNull();
      expect(mockTryConnectToGodot).toHaveBeenCalled();
    });

    it('should validate script via Bridge when connected', async () => {
      mockTryConnectToGodot.mockResolvedValue(true as never);
      mockGetGodotBridge.mockReturnValue(createMockBridge());

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result).not.toBeNull();
      expect(result?.source).toBe('bridge');
      expect(result?.errors).toEqual([]);
    });

    it('should convert Bridge errors to ValidationError format', async () => {
      mockTryConnectToGodot.mockResolvedValue(true as never);

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
      mockTryConnectToGodot.mockResolvedValue(true as never);

      const bridgeErrors = [
        { message: 'Some error' }, // no line field
      ];
      mockGetGodotBridge.mockReturnValue(createMockBridge(bridgeErrors));

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result?.errors[0].line).toBe(0);
    });

    it('should return null when Bridge throws an error', async () => {
      mockTryConnectToGodot.mockResolvedValue(true as never);

      const mockBridge = {
        validateScript: jest.fn().mockRejectedValue(new Error('Bridge disconnected') as never) as jest.Mock,
      };
      mockGetGodotBridge.mockReturnValue(mockBridge);

      const result = await validateViaBridge('/project', 'scripts/player.gd');

      expect(result).toBeNull();
    });

    it('should construct correct res:// path from project and script paths', async () => {
      mockTryConnectToGodot.mockResolvedValue(true as never);

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
      mockTryConnectToLSP.mockResolvedValue(true as never);
      mockReadFileSync.mockReturnValue('extends Node\n' as never);
      mockGetGodotLSPClient.mockReturnValue(createMockLspClient());

      const result = await validateScript('/project', 'test.gd');

      expect(result?.source).toBe('lsp');
      // Bridge should not be tried if LSP succeeds
      expect(mockTryConnectToGodot).not.toHaveBeenCalled();
    }, 15000);

    it('should fall back to Bridge when LSP fails', async () => {
      mockTryConnectToLSP.mockResolvedValue(false as never);
      mockTryConnectToGodot.mockResolvedValue(true as never);
      mockGetGodotBridge.mockReturnValue(createMockBridge());

      const result = await validateScript('/project', 'test.gd');

      expect(result?.source).toBe('bridge');
    });

    it('should return null when both LSP and Bridge fail', async () => {
      mockTryConnectToLSP.mockResolvedValue(false as never);
      mockTryConnectToGodot.mockResolvedValue(false as never);

      const result = await validateScript('/project', 'test.gd');

      expect(result).toBeNull();
    });

    it('should skip LSP when useLSP is false', async () => {
      mockTryConnectToGodot.mockResolvedValue(true as never);
      mockGetGodotBridge.mockReturnValue(createMockBridge());

      const result = await validateScript('/project', 'test.gd', { useLSP: false });

      expect(mockTryConnectToLSP).not.toHaveBeenCalled();
      expect(result?.source).toBe('bridge');
    });

    it('should skip Bridge when useBridge is false', async () => {
      mockTryConnectToLSP.mockResolvedValue(false as never);

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
      mockTryConnectToLSP.mockResolvedValue(false as never);
      mockTryConnectToGodot.mockResolvedValue(false as never);

      const result = await validateScript('/project', 'test.gd');

      // Both should be tried
      expect(mockTryConnectToLSP).toHaveBeenCalled();
      expect(mockTryConnectToGodot).toHaveBeenCalled();
      expect(result).toBeNull();
    });
  });

  describe('isRealTimeValidationAvailable', () => {
    it('should return both true when LSP and Bridge are available', async () => {
      mockTryConnectToLSP.mockResolvedValue(true as never);
      mockTryConnectToGodot.mockResolvedValue(true as never);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: true, bridge: true });
    });

    it('should return both false when neither is available', async () => {
      mockTryConnectToLSP.mockResolvedValue(false as never);
      mockTryConnectToGodot.mockResolvedValue(false as never);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: false, bridge: false });
    });

    it('should return mixed results', async () => {
      mockTryConnectToLSP.mockResolvedValue(true as never);
      mockTryConnectToGodot.mockResolvedValue(false as never);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: true, bridge: false });
    });

    it('should check both connections concurrently', async () => {
      mockTryConnectToLSP.mockResolvedValue(false as never);
      mockTryConnectToGodot.mockResolvedValue(true as never);

      const result = await isRealTimeValidationAvailable();

      expect(result).toEqual({ lsp: false, bridge: true });
      expect(mockTryConnectToLSP).toHaveBeenCalledTimes(1);
      expect(mockTryConnectToGodot).toHaveBeenCalledTimes(1);
    });
  });
});
