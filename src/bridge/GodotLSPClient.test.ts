/**
 * GodotLSPClient Unit Tests
 * Tests LSP client functionality without requiring Godot runtime
 * ISO/IEC 25010 compliant test coverage
 */

import {
  GodotLSPClient,
  getGodotLSPClient,
  DiagnosticSeverity,
  type Diagnostic,
  type ScriptDiagnostic,
} from './GodotLSPClient.js';

describe('GodotLSPClient', () => {
  describe('constructor', () => {
    it('should create instance with default host and port', () => {
      const client = new GodotLSPClient();
      expect(client).toBeInstanceOf(GodotLSPClient);
      expect(client.isReady()).toBe(false);
    });

    it('should create instance with custom host and port', () => {
      const client = new GodotLSPClient('192.168.1.100', 7005);
      expect(client).toBeInstanceOf(GodotLSPClient);
    });
  });

  describe('singleton', () => {
    it('should return same instance from getGodotLSPClient', () => {
      const client1 = getGodotLSPClient();
      const client2 = getGodotLSPClient();
      expect(client1).toBe(client2);
    });
  });

  describe('isReady', () => {
    it('should return false when not connected', () => {
      const client = new GodotLSPClient();
      expect(client.isReady()).toBe(false);
    });
  });

  describe('disconnect', () => {
    it('should handle disconnect when not connected', () => {
      const client = new GodotLSPClient();
      expect(() => client.disconnect()).not.toThrow();
      expect(client.isReady()).toBe(false);
    });
  });
});

describe('GodotLSPClient URI conversion', () => {
  let client: GodotLSPClient;

  beforeEach(() => {
    client = new GodotLSPClient();
  });

  describe('pathToUri', () => {
    it('should preserve res:// paths', () => {
      const uri = client.pathToUri('res://scripts/player.gd');
      expect(uri).toBe('res://scripts/player.gd');
    });

    it('should convert Windows paths to file URI', () => {
      const uri = client.pathToUri('C:/Projects/game/scripts/player.gd');
      expect(uri).toBe('file:///C:/Projects/game/scripts/player.gd');
    });

    it('should convert Unix paths to file URI', () => {
      const uri = client.pathToUri('/home/user/game/scripts/player.gd');
      expect(uri).toBe('file:///home/user/game/scripts/player.gd');
    });

    it('should normalize backslashes to forward slashes', () => {
      const uri = client.pathToUri('C:\\Projects\\game\\scripts\\player.gd');
      expect(uri).toBe('file:///C:/Projects/game/scripts/player.gd');
    });
  });
});

describe('GodotLSPClient diagnostics', () => {
  let client: GodotLSPClient;

  beforeEach(() => {
    client = new GodotLSPClient();
  });

  describe('getDiagnostics', () => {
    it('should return empty array for unknown URI', () => {
      const diagnostics = client.getDiagnostics('res://unknown.gd');
      expect(diagnostics).toEqual([]);
    });
  });

  describe('getAllDiagnostics', () => {
    it('should return empty map when no diagnostics', () => {
      const allDiagnostics = client.getAllDiagnostics();
      expect(allDiagnostics.size).toBe(0);
    });
  });

  describe('convertDiagnostics', () => {
    it('should convert LSP diagnostics to ScriptDiagnostic format', () => {
      const lspDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 9, character: 4 },
            end: { line: 9, character: 10 },
          },
          severity: DiagnosticSeverity.Error,
          message: 'Undefined identifier "player"',
          code: 'E001',
        },
      ];

      const converted = client.convertDiagnostics('res://test.gd', lspDiagnostics);

      expect(converted).toHaveLength(1);
      expect(converted[0].file).toBe('res://test.gd');
      expect(converted[0].line).toBe(10); // LSP is 0-indexed, converted to 1-indexed
      expect(converted[0].column).toBe(5);
      expect(converted[0].severity).toBe('error');
      expect(converted[0].message).toBe('Undefined identifier "player"');
    });

    it('should handle warning severity', () => {
      const lspDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 5, character: 0 },
            end: { line: 5, character: 20 },
          },
          severity: DiagnosticSeverity.Warning,
          message: 'Unused variable "temp"',
        },
      ];

      const converted = client.convertDiagnostics('res://test.gd', lspDiagnostics);

      expect(converted[0].severity).toBe('warning');
    });

    it('should handle info severity', () => {
      const lspDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          severity: DiagnosticSeverity.Information,
          message: 'Consider using typed arrays',
        },
      ];

      const converted = client.convertDiagnostics('res://test.gd', lspDiagnostics);

      expect(converted[0].severity).toBe('info');
    });

    it('should handle hint severity', () => {
      const lspDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          severity: DiagnosticSeverity.Hint,
          message: 'Code style suggestion',
        },
      ];

      const converted = client.convertDiagnostics('res://test.gd', lspDiagnostics);

      expect(converted[0].severity).toBe('hint');
    });

    it('should default to error for undefined severity', () => {
      const lspDiagnostics: Diagnostic[] = [
        {
          range: {
            start: { line: 0, character: 0 },
            end: { line: 0, character: 10 },
          },
          message: 'Some error',
        },
      ];

      const converted = client.convertDiagnostics('res://test.gd', lspDiagnostics);

      expect(converted[0].severity).toBe('error');
    });

    it('should handle multiple diagnostics', () => {
      const lspDiagnostics: Diagnostic[] = [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 5 } },
          severity: DiagnosticSeverity.Error,
          message: 'Error 1',
        },
        {
          range: { start: { line: 5, character: 0 }, end: { line: 5, character: 5 } },
          severity: DiagnosticSeverity.Warning,
          message: 'Warning 1',
        },
        {
          range: { start: { line: 10, character: 0 }, end: { line: 10, character: 5 } },
          severity: DiagnosticSeverity.Error,
          message: 'Error 2',
        },
      ];

      const converted = client.convertDiagnostics('res://test.gd', lspDiagnostics);

      expect(converted).toHaveLength(3);
      expect(converted.filter((d) => d.severity === 'error')).toHaveLength(2);
      expect(converted.filter((d) => d.severity === 'warning')).toHaveLength(1);
    });
  });
});

describe('DiagnosticSeverity enum', () => {
  it('should have correct values', () => {
    expect(DiagnosticSeverity.Error).toBe(1);
    expect(DiagnosticSeverity.Warning).toBe(2);
    expect(DiagnosticSeverity.Information).toBe(3);
    expect(DiagnosticSeverity.Hint).toBe(4);
  });
});

describe('LSP message format', () => {
  describe('Content-Length header', () => {
    it('should format header correctly', () => {
      const content = '{"jsonrpc":"2.0","id":1,"method":"initialize"}';
      const header = `Content-Length: ${Buffer.byteLength(content)}\r\n\r\n`;
      expect(header).toContain('Content-Length:');
      expect(header.endsWith('\r\n\r\n')).toBe(true);
    });

    it('should calculate correct byte length for UTF-8', () => {
      const content = '{"message":"héllo"}'; // Contains non-ASCII char
      const byteLength = Buffer.byteLength(content);
      expect(byteLength).toBeGreaterThan(content.length);
    });
  });

  describe('JSON-RPC format', () => {
    it('should format request correctly', () => {
      const request = {
        jsonrpc: '2.0',
        id: 1,
        method: 'textDocument/didOpen',
        params: {
          textDocument: {
            uri: 'file:///test.gd',
            languageId: 'gdscript',
            version: 1,
            text: 'extends Node',
          },
        },
      };

      const json = JSON.stringify(request);
      expect(json).toContain('"jsonrpc":"2.0"');
      expect(json).toContain('"method":"textDocument/didOpen"');
    });

    it('should format notification correctly (no id)', () => {
      const notification = {
        jsonrpc: '2.0',
        method: 'initialized',
        params: {},
      };

      const json = JSON.stringify(notification);
      expect(json).toContain('"method":"initialized"');
      expect(json).not.toContain('"id"');
    });
  });
});

describe('ScriptDiagnostic interface', () => {
  it('should have all required fields', () => {
    const diagnostic: ScriptDiagnostic = {
      file: 'res://scripts/player.gd',
      line: 10,
      column: 5,
      endLine: 10,
      endColumn: 15,
      message: 'Undefined variable',
      severity: 'error',
    };

    expect(diagnostic.file).toBeDefined();
    expect(diagnostic.line).toBeDefined();
    expect(diagnostic.column).toBeDefined();
    expect(diagnostic.message).toBeDefined();
    expect(diagnostic.severity).toBeDefined();
  });

  it('should allow optional code field', () => {
    const diagnostic: ScriptDiagnostic = {
      file: 'res://test.gd',
      line: 1,
      column: 1,
      endLine: 1,
      endColumn: 5,
      message: 'Test',
      severity: 'warning',
      code: 'W001',
    };

    expect(diagnostic.code).toBe('W001');
  });
});
