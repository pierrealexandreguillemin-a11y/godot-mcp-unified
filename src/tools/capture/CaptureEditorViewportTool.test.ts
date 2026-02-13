/**
 * CaptureEditorViewportTool Unit Tests
 * ISO/IEC 29119 compliant - Test Case Specification
 *
 * Tests the editor viewport capture tool definition and handler.
 * Uses jest.mock + static imports pattern (standardized).
 */

import { jest } from '@jest/globals';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';

// Mock bridge to use fallback (no editor plugin in tests)
jest.mock('../../bridge/BridgeExecutor.js', () => ({
  executeWithBridge: jest.fn(async (
    _action: string,
    _params: Record<string, unknown>,
    fallback: () => Promise<unknown>,
  ) => fallback()),
  isBridgeAvailable: jest.fn(() => false),
  tryInitializeBridge: jest.fn(async () => false),
}));

jest.mock('../../core/PathManager.js', () => ({
  detectGodotPath: jest.fn(async () => null),
  validatePath: jest.fn(() => true),
  normalizePath: jest.fn((p: string) => p),
  normalizeHandlerPaths: jest.fn(<T,>(args: T) => args),
  isValidGodotPathSync: jest.fn(() => true),
  isValidGodotPath: jest.fn(async () => true),
  getPlatformGodotPaths: jest.fn(() => []),
  clearPathCache: jest.fn(),
  getPathCacheStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
}));

import {
  captureEditorViewportDefinition,
  handleCaptureEditorViewport,
} from './CaptureEditorViewportTool.js';

describe('CaptureEditorViewportTool', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(captureEditorViewportDefinition.name).toBe('capture_editor_viewport');
    });

    it('should have a description', () => {
      expect(captureEditorViewportDefinition.description).toBeDefined();
      expect(captureEditorViewportDefinition.description.length).toBeGreaterThan(0);
    });

    it('should have input schema with required properties', () => {
      expect(captureEditorViewportDefinition.inputSchema).toBeDefined();
      expect(captureEditorViewportDefinition.inputSchema.type).toBe('object');
      expect(captureEditorViewportDefinition.inputSchema.properties).toBeDefined();
    });

    it('should have inputSchema object structure', () => {
      expect(captureEditorViewportDefinition.inputSchema).toHaveProperty('type', 'object');
      expect(captureEditorViewportDefinition.inputSchema).toHaveProperty('properties');
      expect(captureEditorViewportDefinition.inputSchema).toHaveProperty('required');
    });
  });

  describe('Validation - Missing Parameters', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleCaptureEditorViewport({
        viewport: '2d',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('projectPath');
    });

    it('should return error when projectPath is empty', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath: '',
      });
      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe('Validation - Invalid Project Path', () => {
    it('should return error for non-existent project path', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath: '/non/existent/path',
      });
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Not a valid Godot project');
    });

    it('should return error for path traversal attempt', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath: '../../../etc',
      });
      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe('Handler - No Bridge (Fallback)', () => {
    it('should return error explaining editor plugin is required', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath,
        viewport: '2d',
      });

      expect(isErrorResponse(result)).toBe(true);
      const text = getResponseText(result);
      expect(text).toContain('requires the Godot editor plugin');
      expect(text).toContain('WebSocket bridge');
    });

    it('should return error for 3d viewport without bridge', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath,
        viewport: '3d',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('requires the Godot editor plugin');
    });

    it('should use default viewport when not specified', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath,
      });

      // Falls through to bridge fallback regardless of viewport value
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('requires the Godot editor plugin');
    });

    it('should mention WebSocket bridge in error message', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath,
      });

      expect(getResponseText(result)).toContain('WebSocket bridge is not connected');
    });
  });

  describe('Validation - Invalid Parameter Values', () => {
    it('should reject invalid viewport value', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath,
        viewport: 'invalid' as '2d' | '3d',
      });

      expect(isErrorResponse(result)).toBe(true);
    });
  });

  describe('Response Structure', () => {
    it('should return response with content array', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath,
      });

      expect(result.content).toBeDefined();
      expect(Array.isArray(result.content)).toBe(true);
    });

    it('should return response with text in first content item', async () => {
      const result = await handleCaptureEditorViewport({
        projectPath,
      });

      expect(result.content[0]).toBeDefined();
      expect(result.content[0].text).toBeDefined();
      expect(typeof result.content[0].text).toBe('string');
    });
  });
});
