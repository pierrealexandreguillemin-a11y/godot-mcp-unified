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
 *
 * Uses dependency injection via ToolContext instead of jest.mock().
 */

import { jest } from '@jest/globals';
import { mkdirSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';
import { createMockContext, ToolContext } from '../ToolContext.js';
import { ToolResponse } from '../../server/types.js';

import { handleCreateUIContainer } from './CreateUIContainerTool.js';
import { handleCreateControl } from './CreateControlTool.js';

describe('UI Tools Enhanced Tests', () => {
  let projectPath: string;
  let cleanup: () => void;
  let ctx: ToolContext;

  // Mock functions that tests need to assert against
  const mockDetectGodotPath = jest.fn<(...args: unknown[]) => Promise<string | null>>();
  const mockExecuteOperation = jest.fn<(...args: unknown[]) => Promise<{ stdout: string; stderr: string }>>();
  const mockValidatePath = jest.fn<(path: string) => boolean>();
  const mockIsGodotProject = jest.fn<(path: string) => boolean>();
  const mockExistsSync = jest.fn<(path: string) => boolean>();

  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
    mkdirSync(join(projectPath, 'ui'), { recursive: true });
    jest.clearAllMocks();

    // Set sensible defaults
    mockValidatePath.mockReturnValue(true);
    mockIsGodotProject.mockReturnValue(true);
    mockExistsSync.mockReturnValue(true);

    ctx = createMockContext({
      detectGodotPath: mockDetectGodotPath,
      executeOperation: mockExecuteOperation,
      validatePath: mockValidatePath,
      isGodotProject: mockIsGodotProject,
      existsSync: mockExistsSync,
      executeWithBridge: async (
        _action: string,
        _params: Record<string, unknown>,
        fallback: () => Promise<ToolResponse>,
      ) => fallback(),
    });
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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

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
      }, ctx);

      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Unknown error');
    });
  });
});
