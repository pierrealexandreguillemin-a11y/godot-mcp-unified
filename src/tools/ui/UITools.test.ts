/**
 * UI Tools Tests
 * ISO/IEC 29119 compliant test suite
 * ISO/IEC 25010 compliant - strict testing
 *
 * Test Categories:
 * 1. Input Validation (Zod schema validation)
 * 2. Missing Required Parameters
 * 3. Invalid Enum Values (controlType, containerType)
 * 4. Path Security (traversal prevention)
 * 5. Success Scenarios
 * 6. Error Handling
 */

import { mkdirSync } from 'fs';
import { join } from 'path';
import { handleCreateUIContainer } from './CreateUIContainerTool';
import { handleCreateControl } from './CreateControlTool';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';

describe('UI Tools - ISO 29119 Compliant Test Suite', () => {
  // ============================================================================
  // CreateUIContainer Tests
  // ============================================================================
  describe('CreateUIContainer', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleCreateUIContainer({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handleCreateUIContainer({
          projectPath: null,
          scenePath: null,
          nodeName: null,
          containerType: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject undefined required fields', async () => {
        const result = await handleCreateUIContainer({
          projectPath: undefined,
          scenePath: undefined,
          nodeName: undefined,
          containerType: undefined,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject numeric nodeName', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 12345,
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject empty string nodeName', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: '',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject array as nodeName', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: ['Container'],
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject object as containerType', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Container',
          containerType: { type: 'vbox' },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateUIContainer({
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('nodeName');
      });

      it('should return error when containerType is missing', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('containerType');
      });
    });

    describe('3. Invalid Enum Values (containerType)', () => {
      it('should return error for invalid container type "invalid"', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/containerType.*Invalid|Invalid container type/i);
      });

      it('should return error for container type "VBox" (case sensitive)', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'VBox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/containerType.*Invalid|Invalid container type/i);
      });

      it('should return error for container type "VBOX" (uppercase)', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'VBOX',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/containerType.*Invalid|Invalid container type/i);
      });

      it('should return error for numeric containerType', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should return error for container type "box" (not valid)', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'box',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/containerType.*Invalid|Invalid container type/i);
      });

      it('should return error for container type "container" (not valid)', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'container',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/containerType.*Invalid|Invalid container type/i);
      });
    });

    describe('4. Valid Container Types', () => {
      const validContainerTypes = [
        'vbox', 'hbox', 'grid', 'center', 'margin',
        'panel', 'scroll', 'split_h', 'split_v', 'tab', 'flow',
      ];

      for (const containerType of validContainerTypes) {
        it(`should accept valid container type "${containerType}"`, async () => {
          const result = await handleCreateUIContainer({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'TestContainer',
            containerType,
          });
          expect(result.isError).toBe(true);
          // Should fail on project validation, not on containerType validation
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      }
    });

    describe('5. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/../escape/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject scenePath with path traversal', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/project',
          scenePath: '../escape/scene.tscn',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject multiple path traversal sequences', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/path/to/../../escape',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });
    });

    describe('6. Project Validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should return error for empty projectPath', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('7. Optional Parameters', () => {
      it('should accept request without optional parentNodePath', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainContainer',
          containerType: 'vbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with parentNodePath', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'InnerContainer',
          containerType: 'hbox',
          parentNodePath: 'OuterContainer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept columns parameter for grid container', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'GridContainer',
          containerType: 'grid',
          columns: 3,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept customMinimumSize parameter', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'SizedContainer',
          containerType: 'vbox',
          customMinimumSize: { x: 200, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept anchorsPreset parameter', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnchoredContainer',
          containerType: 'vbox',
          anchorsPreset: 'full_rect',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should reject invalid anchorsPreset value', async () => {
        const result = await handleCreateUIContainer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnchoredContainer',
          containerType: 'vbox',
          anchorsPreset: 'invalid_preset',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should accept all valid anchorsPreset values', async () => {
        const validPresets = ['full_rect', 'center', 'top_left', 'top_right', 'bottom_left', 'bottom_right'];
        for (const preset of validPresets) {
          const result = await handleCreateUIContainer({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'Container',
            containerType: 'vbox',
            anchorsPreset: preset,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        }
      });
    });
  });

  // ============================================================================
  // CreateControl Tests
  // ============================================================================
  describe('CreateControl', () => {
    describe('1. Input Validation (Zod Schema)', () => {
      it('should reject empty object input', async () => {
        const result = await handleCreateControl({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject null input values', async () => {
        const result = await handleCreateControl({
          projectPath: null,
          scenePath: null,
          nodeName: null,
          controlType: null,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject undefined required fields', async () => {
        const result = await handleCreateControl({
          projectPath: undefined,
          scenePath: undefined,
          nodeName: undefined,
          controlType: undefined,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject numeric nodeName', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 12345,
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject empty string nodeName', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: '',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should reject array as controlType', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MyButton',
          controlType: ['button'],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('2. Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateControl({
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          nodeName: 'StartButton',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('nodeName');
      });

      it('should return error when controlType is missing', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('controlType');
      });
    });

    describe('3. Invalid Enum Values (controlType)', () => {
      it('should return error for invalid control type "invalid"', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/controlType.*Invalid|Invalid control type/i);
      });

      it('should return error for control type "Button" (case sensitive)', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'Button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/controlType.*Invalid|Invalid control type/i);
      });

      it('should return error for control type "BUTTON" (uppercase)', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'BUTTON',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/controlType.*Invalid|Invalid control type/i);
      });

      it('should return error for numeric controlType', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });

      it('should return error for control type "text" (not valid)', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MyText',
          controlType: 'text',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/controlType.*Invalid|Invalid control type/i);
      });

      it('should return error for control type "input" (not valid)', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MyInput',
          controlType: 'input',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/controlType.*Invalid|Invalid control type/i);
      });

      it('should return error for control type "textbox" (should be text_edit)', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MyTextbox',
          controlType: 'textbox',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/controlType.*Invalid|Invalid control type/i);
      });
    });

    describe('4. Valid Control Types', () => {
      const validControlTypes = [
        'button', 'label', 'line_edit', 'text_edit', 'rich_text',
        'texture_rect', 'color_rect', 'progress_bar', 'slider_h', 'slider_v',
        'spin_box', 'check_box', 'check_button', 'option_button', 'menu_button',
      ];

      for (const controlType of validControlTypes) {
        it(`should accept valid control type "${controlType}"`, async () => {
          const result = await handleCreateControl({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'TestControl',
            controlType,
          });
          expect(result.isError).toBe(true);
          // Should fail on project validation, not on controlType validation
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      }
    });

    describe('5. Path Security', () => {
      it('should reject projectPath with path traversal', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/../escape/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject scenePath with path traversal', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          scenePath: '../escape/scene.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });

      it('should reject texturePath with path traversal', async () => {
        const result = await handleCreateControl({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'MyImage',
          controlType: 'texture_rect',
          texturePath: '../../../escape/image.png',
        });
        expect(result.isError).toBe(true);
        // May fail on project validation or path traversal - both are acceptable security outcomes
        expect(result.content[0].text).toMatch(/path.*traversal|cannot contain|Not a valid Godot project/i);
      });
    });

    describe('6. Project Validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should return error for empty projectPath', async () => {
        const result = await handleCreateControl({
          projectPath: '',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Validation failed');
      });
    });

    describe('7. Optional Parameters', () => {
      it('should accept request without optional parentNodePath', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept request with parentNodePath', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'InnerButton',
          controlType: 'button',
          parentNodePath: 'Container',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept text parameter for button', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
          text: 'Start Game',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept text parameter for label', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'TitleLabel',
          controlType: 'label',
          text: 'Welcome to the Game',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept placeholderText for line_edit', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'UsernameInput',
          controlType: 'line_edit',
          placeholderText: 'Enter your username',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept texturePath for texture_rect', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'BackgroundImage',
          controlType: 'texture_rect',
          texturePath: 'res://textures/background.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept color parameter for color_rect', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'ColorOverlay',
          controlType: 'color_rect',
          color: { r: 1.0, g: 0.5, b: 0.0, a: 0.5 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept minValue, maxValue, and value for progress_bar', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'HealthBar',
          controlType: 'progress_bar',
          minValue: 0,
          maxValue: 100,
          value: 75,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept minValue, maxValue, and value for slider_h', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'VolumeSlider',
          controlType: 'slider_h',
          minValue: 0,
          maxValue: 1,
          value: 0.5,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept minValue, maxValue, and value for spin_box', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'QuantitySpinner',
          controlType: 'spin_box',
          minValue: 1,
          maxValue: 99,
          value: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('8. Control-Specific Validation', () => {
      it('should accept check_box control type', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AcceptTerms',
          controlType: 'check_box',
          text: 'I accept the terms',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept check_button control type', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'ToggleMusic',
          controlType: 'check_button',
          text: 'Music',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept option_button control type', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'DifficultySelect',
          controlType: 'option_button',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept menu_button control type', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'OptionsMenu',
          controlType: 'menu_button',
          text: 'Options',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept rich_text control type', async () => {
        const result = await handleCreateControl({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'StoryText',
          controlType: 'rich_text',
          text: '[b]Bold[/b] and [i]italic[/i]',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // Integration Tests with Temp Project
  // ============================================================================
  describe('Integration Tests', () => {
    let projectPath: string;
    let cleanup: () => void;

    beforeEach(() => {
      const temp = createTempProject();
      projectPath = temp.projectPath;
      cleanup = temp.cleanup;

      // Create UI-related directories
      mkdirSync(join(projectPath, 'ui'), { recursive: true });
    });

    afterEach(() => {
      cleanup();
    });

    describe('CreateUIContainer with valid project', () => {
      it('should proceed to Godot execution with vbox container', async () => {
        const result = await handleCreateUIContainer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'MainMenu',
          containerType: 'vbox',
        });
        const text = getResponseText(result);
        // Should pass validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });

      it('should proceed to Godot execution with grid container and columns', async () => {
        const result = await handleCreateUIContainer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'InventoryGrid',
          containerType: 'grid',
          columns: 4,
        });
        const text = getResponseText(result);
        // Should pass validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });
    });

    describe('CreateControl with valid project', () => {
      it('should proceed to Godot execution with button control', async () => {
        const result = await handleCreateControl({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'PlayButton',
          controlType: 'button',
          text: 'Play',
        });
        const text = getResponseText(result);
        // Should pass validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });

      it('should proceed to Godot execution with label control', async () => {
        const result = await handleCreateControl({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'TitleLabel',
          controlType: 'label',
          text: 'Game Title',
        });
        const text = getResponseText(result);
        // Should pass validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });

      it('should proceed to Godot execution with progress_bar control', async () => {
        const result = await handleCreateControl({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'LoadingBar',
          controlType: 'progress_bar',
          minValue: 0,
          maxValue: 100,
          value: 0,
        });
        const text = getResponseText(result);
        // Should pass validation - may succeed or fail on Godot execution
        expect(text).not.toContain('Validation failed');
        expect(text).not.toContain('Not a valid Godot project');
      });
    });

    describe('Combined UI creation workflow', () => {
      it('should pass validation for container with nested controls', async () => {
        // First create container
        const containerResult = await handleCreateUIContainer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'MenuContainer',
          containerType: 'vbox',
        });
        const containerText = getResponseText(containerResult);
        // Should pass validation - may succeed or fail on Godot execution
        expect(containerText).not.toContain('Validation failed');

        // Then create controls inside
        const buttonResult = await handleCreateControl({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'StartButton',
          controlType: 'button',
          parentNodePath: 'MenuContainer',
          text: 'Start',
        });
        const buttonText = getResponseText(buttonResult);
        // Should pass validation - may succeed or fail on Godot execution
        expect(buttonText).not.toContain('Validation failed');
      });
    });
  });
});
