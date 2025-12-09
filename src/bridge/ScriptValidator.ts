/**
 * ScriptValidator - High-level script validation using available backends
 * Automatically selects LSP > Bridge > CLI fallback
 * ISO/IEC 25010 compliant
 */

import { readFileSync } from 'fs';
import { resolve, relative } from 'path';
import { logDebug, logInfo } from '../utils/Logger.js';
import {
  tryConnectToGodot,
  getGodotBridge,
  tryConnectToLSP,
  getGodotLSPClient,
  type ScriptDiagnostic,
} from './index.js';

export interface ValidationError {
  file: string;
  line: number;
  column?: number;
  message: string;
  type: 'error' | 'warning';
}

export interface ValidationResult {
  errors: ValidationError[];
  source: 'lsp' | 'bridge' | 'cli' | 'none';
  rawOutput?: string;
}

/**
 * Convert LSP diagnostics to ValidationError format
 */
const convertLSPDiagnostics = (diagnostics: ScriptDiagnostic[]): ValidationError[] => {
  return diagnostics.map((d) => ({
    file: d.file,
    line: d.line,
    column: d.column,
    message: d.message,
    type: d.severity === 'error' ? 'error' : 'warning',
  }));
};

/**
 * Validate script using Godot LSP (most accurate)
 */
export const validateViaLSP = async (
  projectPath: string,
  scriptPath: string
): Promise<ValidationResult | null> => {
  try {
    const connected = await tryConnectToLSP();
    if (!connected) {
      return null;
    }

    const lspClient = getGodotLSPClient();
    const fullPath = resolve(projectPath, scriptPath);
    const content = readFileSync(fullPath, 'utf-8');
    const uri = lspClient.pathToUri(fullPath);

    await lspClient.openDocument(uri, content);

    // Wait for diagnostics (LSP sends them asynchronously)
    await new Promise((r) => setTimeout(r, 500));

    const diagnostics = lspClient.getDiagnostics(uri);
    const converted = lspClient.convertDiagnostics(uri, diagnostics);

    await lspClient.closeDocument(uri);

    logInfo('Script validated via LSP');
    return {
      errors: convertLSPDiagnostics(converted),
      source: 'lsp',
    };
  } catch (error) {
    logDebug(`LSP validation error: ${error}`);
    return null;
  }
};

/**
 * Validate script using MCP Bridge plugin
 */
export const validateViaBridge = async (
  projectPath: string,
  scriptPath: string
): Promise<ValidationResult | null> => {
  try {
    const connected = await tryConnectToGodot();
    if (!connected) {
      return null;
    }

    const bridge = getGodotBridge();
    const resPath = `res://${relative(projectPath, resolve(projectPath, scriptPath)).replace(/\\/g, '/')}`;
    const result = await bridge.validateScript(resPath);

    const errors: ValidationError[] = result.errors.map((e) => ({
      file: scriptPath,
      line: e.line || 0,
      column: e.column,
      message: e.message,
      type: 'error' as const,
    }));

    logInfo('Script validated via Bridge');
    return {
      errors,
      source: 'bridge',
    };
  } catch (error) {
    logDebug(`Bridge validation error: ${error}`);
    return null;
  }
};

/**
 * Validate script using best available method
 * Tries: LSP -> Bridge -> returns null (caller should use CLI fallback)
 */
export const validateScript = async (
  projectPath: string,
  scriptPath: string,
  options: { useLSP?: boolean; useBridge?: boolean } = {}
): Promise<ValidationResult | null> => {
  const { useLSP = true, useBridge = true } = options;

  // Try LSP first (most accurate)
  if (useLSP) {
    logDebug('Attempting LSP validation...');
    const result = await validateViaLSP(projectPath, scriptPath);
    if (result) {
      return result;
    }
  }

  // Try Bridge
  if (useBridge) {
    logDebug('Attempting Bridge validation...');
    const result = await validateViaBridge(projectPath, scriptPath);
    if (result) {
      return result;
    }
  }

  // No real-time validation available
  return null;
};

/**
 * Check if any real-time validation backend is available
 */
export const isRealTimeValidationAvailable = async (): Promise<{
  lsp: boolean;
  bridge: boolean;
}> => {
  const [lsp, bridge] = await Promise.all([tryConnectToLSP(), tryConnectToGodot()]);
  return { lsp, bridge };
};
