/**
 * UI Tools Enhanced Tests
 * ISO/IEC 29119 compliant - covers uncovered Godot execution paths
 *
 * The existing UITools.test.ts covers validation, security, and enum validation.
 * These tests mock Godot to cover:
 * - Godot path not found
 * - Successful execution and response building
 * - stderr with "Failed to" message handling
 * - Error catch blocks
 * - Optional parameter passing
 */

import { jest } from '@jest/globals';
import { mkdirSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';

// Get real modules, override only what we need to mock
const realPathManager = await import('../../core/PathManager.js');
const mockDetectGodotPath = jest.fn<typeof realPathManager.detectGodotPath>();

jest.unstable_mockModule('../../core/PathManager', () => ({
  ...realPathManager,
  detectGodotPath: mockDetectGodotPath,
}));

const realGodotExecutor = await import('../../core/GodotExecutor.js');
const mockExecuteOperation = jest.fn<typeof realGodotExecutor.executeOperation>();

jest.unstable_mockModule('../../core/GodotExecutor', () => ({
  ...realGodotExecutor,
  executeOperation: mockExecuteOperation,
}));

// Must import after mocks are set up
const { handleCreateUIContainer } = await import('./CreateUIContainerTool.js');
const { handleCreateControl } = await import('./CreateControlTool.js');

describe('UI Tools Enhanced Tests', () => {
  let projectPath: string;
  let cleanup: () => void;

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
    mkdirSync(join(projectPath, 'ui'), { recursive: true });
    jest.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  // ============================================================================
  // CreateUIContainer - Happy Path / Error Handling
  // ============================================================================
  describe('CreateUIContainer Happy Path', () => {
    it('should return error when Godot path not found', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'MainContainer',
        containerType: 'vbox',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should create vbox container successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Container created',
        stderr: '',
      });

      const result = await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'MainMenu',
        containerType: 'vbox',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('UI Container created successfully');
      expect(getResponseText(result)).toContain('MainMenu');
      expect(getResponseText(result)).toContain('VBoxContainer');
    });

    it('should create hbox container successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      const result = await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Toolbar',
        containerType: 'hbox',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('HBoxContainer');
    });

    it('should pass columns for grid container', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'InventoryGrid',
        containerType: 'grid',
        columns: 4,
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_ui_container',
        expect.objectContaining({
          columns: 4,
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should pass customMinimumSize when provided', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'SizedBox',
        containerType: 'vbox',
        customMinimumSize: { x: 200, y: 100 },
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_ui_container',
        expect.objectContaining({
          custom_minimum_size: { x: 200, y: 100 },
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should pass anchorsPreset when provided', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'FullRect',
        containerType: 'panel',
        anchorsPreset: 'full_rect',
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_ui_container',
        expect.objectContaining({
          anchors_preset: 'full_rect',
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should pass parentNodePath when provided', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Inner',
        containerType: 'hbox',
        parentNodePath: 'OuterContainer',
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_ui_container',
        expect.objectContaining({
          parent_node_path: 'OuterContainer',
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should handle stderr with "Failed to" message', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to create container: parent not found',
      });

      const result = await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Container',
        containerType: 'vbox',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create UI container');
    });

    it('should handle execution error', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Process failed'));

      const result = await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Container',
        containerType: 'vbox',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create UI container');
      expect(getResponseText(result)).toContain('Process failed');
    });

    it('should handle non-Error exception', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(null);

      const result = await handleCreateUIContainer({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Container',
        containerType: 'vbox',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Unknown error');
    });
  });

  // ============================================================================
  // CreateControl - Happy Path / Error Handling
  // ============================================================================
  describe('CreateControl Happy Path', () => {
    it('should return error when Godot path not found', async () => {
      mockDetectGodotPath.mockResolvedValue(null);

      const result = await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'StartButton',
        controlType: 'button',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
    });

    it('should create button control successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Control created',
        stderr: '',
      });

      const result = await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'PlayButton',
        controlType: 'button',
        text: 'Play',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Control created successfully');
      expect(getResponseText(result)).toContain('PlayButton');
      expect(getResponseText(result)).toContain('Button');
    });

    it('should create label control successfully', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Created',
        stderr: '',
      });

      const result = await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Title',
        controlType: 'label',
        text: 'Game Title',
      });

      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toContain('Label');
    });

    it('should pass text parameter', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Btn',
        controlType: 'button',
        text: 'Click Me',
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_control',
        expect.objectContaining({
          text: 'Click Me',
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should pass placeholderText parameter', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Input',
        controlType: 'line_edit',
        placeholderText: 'Enter name...',
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_control',
        expect.objectContaining({
          placeholder_text: 'Enter name...',
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should pass texturePath parameter', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Image',
        controlType: 'texture_rect',
        texturePath: 'res://icon.png',
      });

      // Verify texture_path was passed (path may be normalized on Windows)
      const callArgs = mockExecuteOperation.mock.calls[0];
      const params = callArgs[1] as Record<string, unknown>;
      expect(params).toHaveProperty('texture_path');
      expect(String(params.texture_path)).toContain('icon.png');
    });

    it('should pass color parameter', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Bg',
        controlType: 'color_rect',
        color: { r: 1.0, g: 0.0, b: 0.5, a: 1.0 },
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_control',
        expect.objectContaining({
          color: { r: 1.0, g: 0.0, b: 0.5, a: 1.0 },
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should pass minValue, maxValue, value parameters', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'HealthBar',
        controlType: 'progress_bar',
        minValue: 0,
        maxValue: 100,
        value: 75,
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_control',
        expect.objectContaining({
          min_value: 0,
          max_value: 100,
          value: 75,
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should pass parentNodePath when provided', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: 'Done',
        stderr: '',
      });

      await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'InnerButton',
        controlType: 'button',
        parentNodePath: 'Container',
      });

      expect(mockExecuteOperation).toHaveBeenCalledWith(
        'create_control',
        expect.objectContaining({
          parent_node_path: 'Container',
        }),
        projectPath,
        '/usr/bin/godot',
      );
    });

    it('should handle stderr with "Failed to" message', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockResolvedValue({
        stdout: '',
        stderr: 'Failed to create control: scene error',
      });

      const result = await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Button',
        controlType: 'button',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create control');
    });

    it('should handle execution error', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(new Error('Connection refused'));

      const result = await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Button',
        controlType: 'button',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Failed to create control');
      expect(getResponseText(result)).toContain('Connection refused');
    });

    it('should handle non-Error exception', async () => {
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockExecuteOperation.mockRejectedValue(123);

      const result = await handleCreateControl({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'Button',
        controlType: 'button',
      });

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Unknown error');
    });
  });
});
