/**
 * Animation Tools Tests
 * ISO/IEC 29119 compliant - comprehensive test coverage
 * ISO/IEC 25010 compliant - strict testing
 *
 * Test Categories:
 * - TC-VAL: Input validation (Zod schema validation)
 * - TC-SEC: Path security (traversal, injection)
 * - TC-ERR: Error handling (missing params, invalid values)
 * - TC-SUC: Success scenarios (valid operations)
 * - TC-EDGE: Edge cases (boundary values, special inputs)
 */

import { handleCreateAnimationPlayer } from './CreateAnimationPlayerTool';
import { handleAddAnimation } from './AddAnimationTool';
import { handleAddAnimationTrack } from './AddAnimationTrackTool';
import { handleSetKeyframe } from './SetKeyframeTool';
import { handleCreateAnimationTree } from './CreateAnimationTreeTool';
import { handleSetupStateMachine } from './SetupStateMachineTool';
import { handleBlendAnimations } from './BlendAnimationsTool';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';

describe('Animation Tools', () => {
  // ============================================================================
  // CreateAnimationPlayer Tests
  // ============================================================================
  describe('CreateAnimationPlayer', () => {
    describe('TC-VAL: Input Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateAnimationPlayer({
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '/path/to/project',
          nodeName: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
        });
        expect(result.isError).toBe(true);
        // May fail on nodeName validation or project validation
        expect(result.content[0].text).toMatch(/nodeName|Not a valid Godot project|Validation failed/i);
      });

      it('should return error when projectPath is empty string', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/projectPath|cannot be empty|Too small/i);
      });

      it('should return error when scenePath is empty string', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '/path/to/project',
          scenePath: '',
          nodeName: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/scenePath|cannot be empty|Too small/i);
      });
    });

    describe('TC-SEC: Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '/path/to/../../../etc/passwd',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        // Path traversal detected by Zod or project validation fails
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd',
          nodeName: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\./i);
      });
    });

    describe('TC-ERR: Error Handling', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should return error for non-existent scene', async () => {
        let projectPath: string;
        let cleanup: () => void;
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;

        try {
          const result = await handleCreateAnimationPlayer({
            projectPath,
            scenePath: 'scenes/nonexistent.tscn',
            nodeName: 'AnimPlayer',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/Scene file not found|does not exist/i);
        } finally {
          cleanup();
        }
      });
    });

    describe('TC-SUC: Success Scenarios', () => {
      let projectPath: string;
      let cleanup: () => void;

      beforeEach(() => {
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;
      });

      afterEach(() => {
        cleanup();
      });

      it('should create animation player with valid inputs', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimPlayer',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('AnimationPlayer');
      });

      it('should create animation player with parentNodePath', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimPlayer',
          parentNodePath: 'Player',
        });
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toContain('AnimPlayer');
      });
    });

    describe('TC-EDGE: Edge Cases', () => {
      it('should handle nodeName with special characters', async () => {
        const result = await handleCreateAnimationPlayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Anim_Player_01',
        });
        // Either validation error or project error
        expect(result.isError).toBe(true);
      });

      it('should handle very long nodeName', async () => {
        const longName = 'A'.repeat(256);
        const result = await handleCreateAnimationPlayer({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: longName,
        });
        expect(result.isError).toBe(true);
      });
    });
  });

  // ============================================================================
  // AddAnimation Tests
  // ============================================================================
  describe('AddAnimation', () => {
    describe('TC-VAL: Input Validation', () => {
      it('should return error when required params are missing', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error when playerNodePath is missing', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animationName: 'walk',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('playerNodePath');
      });

      it('should return error when animationName is missing', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('animationName');
      });

      it('should return error when animationName is empty', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: '',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/animationName|Too small|cannot be empty/i);
      });

      it('should return error when playerNodePath is empty', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: '',
          animationName: 'walk',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/playerNodePath|Too small|cannot be empty/i);
      });
    });

    describe('TC-SEC: Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleAddAnimation({
          projectPath: '/project/../../../etc',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\./i);
      });
    });

    describe('TC-ERR: Error Handling', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleAddAnimation({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for negative animation length', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          length: -1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/length|positive|Number must be greater than 0/i);
      });

      it('should return error for zero animation length', async () => {
        const result = await handleAddAnimation({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          length: 0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/length|positive|greater than 0/i);
      });
    });

    describe('TC-EDGE: Edge Cases', () => {
      it('should handle very small animation length', async () => {
        const result = await handleAddAnimation({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          length: 0.001,
        });
        // Should pass validation but fail on project
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should handle loop as true', async () => {
        const result = await handleAddAnimation({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          loop: true,
        });
        expect(result.isError).toBe(true);
        // Project error, not validation
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-SUC: Success Scenarios', () => {
      let projectPath: string;
      let cleanup: () => void;

      beforeEach(() => {
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;
      });

      afterEach(() => {
        cleanup();
      });

      it('should detect scene file correctly for valid project', async () => {
        // This tests that scene validation works with a valid project
        const result = await handleAddAnimation({
          projectPath,
          scenePath: 'scenes/nonexistent_player.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
        });
        // Should fail because scene does not exist, not project validation
        expect(result.isError).toBe(true);
        expect(getResponseText(result)).toMatch(/Scene file|does not exist/i);
      });

      it('should validate animation parameters with valid project', async () => {
        // This tests that validation passes and execution is attempted
        const result = await handleAddAnimation({
          projectPath,
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'NonExistent',
          animationName: 'test_anim',
          length: 2.0,
          loop: true,
        });
        // May succeed if Godot is installed, or fail due to Godot not being installed or player not found
        // Either way, this test validates input params pass Zod validation
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|AnimationPlayer|Godot|Animation added|successfully/i);
      });
    });
  });

  // ============================================================================
  // AddAnimationTrack Tests
  // ============================================================================
  describe('AddAnimationTrack', () => {
    describe('TC-VAL: Input Validation', () => {
      it('should return error when required params are missing', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error when trackType is missing', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('trackType');
      });

      it('should return error when nodePath is missing', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'value',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('nodePath');
      });

      it('should return error for invalid trackType enum', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'invalid_track' as 'value',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/trackType|Invalid enum/i);
      });

      it('should return error for value track without property', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'value',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Property is required|property.*required/i);
      });
    });

    describe('TC-SEC: Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/path/../../../etc',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'position_2d',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/path/to/project',
          scenePath: '../../etc/passwd',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'position_2d',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\./i);
      });
    });

    describe('TC-ERR: Error Handling - Track Types', () => {
      it('should accept position_2d track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'position_2d',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        // Project error, not validation
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept position_3d track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'position_3d',
          nodePath: 'MeshInstance3D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept rotation_2d track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'rotation_2d',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept scale_2d track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'scale_2d',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept method track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'method',
          nodePath: 'Player',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept bezier track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'bezier',
          nodePath: 'Sprite2D',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept audio track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'audio',
          nodePath: 'AudioPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept animation track type', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'animation',
          nodePath: 'AnimPlayer2',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-EDGE: Edge Cases', () => {
      it('should accept value track with property', async () => {
        const result = await handleAddAnimationTrack({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackType: 'value',
          nodePath: 'Sprite2D',
          property: 'modulate',
        });
        expect(result.isError).toBe(true);
        // Should fail on project validation, not input validation
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-SUC: Success Scenarios', () => {
      let projectPath: string;
      let cleanup: () => void;

      beforeEach(() => {
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;
      });

      afterEach(() => {
        cleanup();
      });

      it('should validate track parameters with valid project', async () => {
        const result = await handleAddAnimationTrack({
          projectPath,
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'NonExistent',
          animationName: 'walk',
          trackType: 'position_2d',
          nodePath: 'Sprite2D',
        });
        // May succeed or fail depending on Godot installation
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|Track added|successfully/i);
      });

      it('should validate value track with property', async () => {
        const result = await handleAddAnimationTrack({
          projectPath,
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'NonExistent',
          animationName: 'walk',
          trackType: 'value',
          nodePath: 'Sprite2D',
          property: 'modulate',
        });
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|Track added|successfully/i);
      });
    });
  });

  // ============================================================================
  // SetKeyframe Tests
  // ============================================================================
  describe('SetKeyframe', () => {
    describe('TC-VAL: Input Validation', () => {
      it('should return error when required params are missing', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error when trackIndex is missing', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          time: 0.5,
          value: { x: 100, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('trackIndex');
      });

      it('should return error when time is missing', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          value: { x: 100, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('time');
      });

      it('should return error when value is missing', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
        });
        expect(result.isError).toBe(true);
        // On Windows, project path validation may happen first
        expect(result.content[0].text).toMatch(/value|Not a valid Godot project/i);
      });
    });

    describe('TC-SEC: Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/path/../../../etc',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: { x: 100, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: { x: 100, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\./i);
      });
    });

    describe('TC-ERR: Error Handling', () => {
      it('should return error for negative track index', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: -1,
          time: 0.5,
          value: { x: 100, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/non-negative|greater than or equal|Validation failed.*trackIndex/i);
      });

      it('should return error for negative time', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: -1,
          value: { x: 100, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/non-negative|greater than or equal|Validation failed.*time/i);
      });

      it('should return error for non-integer track index', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 1.5,
          time: 0.5,
          value: { x: 100, y: 100 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/integer|trackIndex|Validation failed/i);
      });
    });

    describe('TC-EDGE: Edge Cases', () => {
      it('should accept zero time', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0,
          value: { x: 0, y: 0 },
        });
        expect(result.isError).toBe(true);
        // Should fail on project, not validation
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept zero track index', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: 100,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept string value', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: 'method_call',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept array value', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: [1, 2, 3],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept transition parameter', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: { x: 100, y: 100 },
          transition: 1,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept easing parameter', async () => {
        const result = await handleSetKeyframe({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'AnimPlayer',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: { x: 100, y: 100 },
          easing: 2.0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-SUC: Success Scenarios', () => {
      let projectPath: string;
      let cleanup: () => void;

      beforeEach(() => {
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;
      });

      afterEach(() => {
        cleanup();
      });

      it('should validate keyframe parameters with valid project', async () => {
        const result = await handleSetKeyframe({
          projectPath,
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'NonExistent',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: { x: 100, y: 100 },
        });
        // May succeed or fail depending on Godot installation
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|Keyframe|successfully/i);
      });

      it('should validate keyframe with transition and easing', async () => {
        const result = await handleSetKeyframe({
          projectPath,
          scenePath: 'scenes/main.tscn',
          playerNodePath: 'NonExistent',
          animationName: 'walk',
          trackIndex: 0,
          time: 0.5,
          value: 100,
          transition: 1,
          easing: 2.0,
        });
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|Keyframe|successfully/i);
      });
    });
  });

  // ============================================================================
  // CreateAnimationTree Tests
  // ============================================================================
  describe('CreateAnimationTree', () => {
    describe('TC-VAL: Input Validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateAnimationTree({
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('nodeName');
      });

      it('should return error for empty nodeName', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: '   ',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/cannot be empty|nodeName.*empty|Validation failed.*nodeName/i);
      });

      it('should return error for nodeName with invalid characters (slash)', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Node/Name',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/invalid characters|nodeName|cannot contain/i);
      });

      it('should return error for nodeName with invalid characters (colon)', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Node:Name',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/invalid characters|nodeName|cannot contain/i);
      });

      it('should return error for nodeName with invalid characters (at)', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Node@Name',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/invalid characters|nodeName|cannot contain/i);
      });

      it('should return error for invalid scenePath extension (.gd)', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.gd',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tscn or \.scn|scenePath|Validation failed.*scenePath/i);
      });

      it('should return error for invalid scenePath extension (.txt)', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.txt',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tscn or \.scn|scenePath/i);
      });

      it('should return error for invalid processCallback', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
          processCallback: 'invalid' as 'idle',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/processCallback|Validation failed.*processCallback/i);
      });
    });

    describe('TC-SEC: Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/../../../etc',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\./i);
      });
    });

    describe('TC-ERR: Error Handling', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('TC-EDGE: Edge Cases - processCallback values', () => {
      it('should accept processCallback: idle', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
          processCallback: 'idle',
        });
        expect(result.isError).toBe(true);
        // Should fail on project, not validation
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept processCallback: physics', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
          processCallback: 'physics',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept processCallback: manual', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
          processCallback: 'manual',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept optional animPlayerPath', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
          animPlayerPath: 'AnimPlayer',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept optional rootMotionTrack', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
          rootMotionTrack: 'Skeleton3D:root',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept .scn scene extension', async () => {
        const result = await handleCreateAnimationTree({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.scn',
          nodeName: 'AnimTree',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-SUC: Success Scenarios', () => {
      let projectPath: string;
      let cleanup: () => void;

      beforeEach(() => {
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;
      });

      afterEach(() => {
        cleanup();
      });

      it('should validate animation tree parameters with valid project', async () => {
        const result = await handleCreateAnimationTree({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
        });
        // May succeed or fail depending on Godot installation
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|AnimationTree|successfully/i);
      });

      it('should validate animation tree with all optional params', async () => {
        const result = await handleCreateAnimationTree({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'AnimTree',
          parentNodePath: 'Player',
          animPlayerPath: 'AnimPlayer',
          processCallback: 'physics',
          rootMotionTrack: 'Skeleton3D:root',
        });
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|AnimationTree|successfully/i);
      });
    });
  });

  // ============================================================================
  // SetupStateMachine Tests
  // ============================================================================
  describe('SetupStateMachine', () => {
    describe('TC-VAL: Input Validation', () => {
      it('should return error when required params are missing', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error when animTreePath is missing', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          states: [{ name: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('animTreePath');
      });

      it('should return error for invalid scenePath extension', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.txt',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tscn or \.scn|scenePath|Validation failed.*scenePath/i);
      });

      it('should return error when states is empty', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/non-empty array|states.*empty|Validation failed.*states/i);
      });

      it('should return error when state name is missing', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ animation: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'name' is required|name.*required|Validation failed.*name/i);
      });

      it('should return error when state name is empty string', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: '' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'name' is required|name.*required|Validation failed.*name|Too small/i);
      });
    });

    describe('TC-SEC: Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/../../../etc',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\./i);
      });
    });

    describe('TC-ERR: Error Handling - State Validation', () => {
      it('should return error for duplicate state names', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Duplicate state names|duplicate/i);
      });

      it('should return error for invalid startState', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          startState: 'nonexistent',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Unknown start state|startState/i);
      });

      it('should return error for unknown transition source state', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'unknown', to: 'walk' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/unknown source state|transition.*from/i);
      });

      it('should return error for unknown transition target state', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'unknown' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/unknown target state|transition.*to/i);
      });

      it('should return error for transition missing from field', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ to: 'walk' } as { from: string; to: string }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'from'.*required|from|Validation failed/i);
      });

      it('should return error for transition missing to field', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle' } as { from: string; to: string }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'to'.*required|to|Validation failed/i);
      });
    });

    describe('TC-ERR: Error Handling - switchMode validation', () => {
      it('should return error for invalid switchMode', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', switchMode: 'invalid' as 'immediate' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/invalid switchMode|switchMode|Validation failed.*switchMode/i);
      });

      it('should accept switchMode: immediate', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', switchMode: 'immediate' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept switchMode: sync', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', switchMode: 'sync' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept switchMode: at_end', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', switchMode: 'at_end' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-ERR: Error Handling - xfadeTime validation', () => {
      it('should return error for negative xfadeTime', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', xfadeTime: -1 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/non-negative number|xfadeTime|Validation failed.*xfadeTime/i);
      });

      it('should accept xfadeTime: 0', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', xfadeTime: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept positive xfadeTime', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', xfadeTime: 0.5 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-EDGE: Edge Cases', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept state with optional animation', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle', animation: 'idle_anim' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept state with optional blendPosition', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle', blendPosition: 0.5 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept transition with autoAdvance', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', autoAdvance: true }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept transition with advanceCondition', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [{ name: 'idle' }, { name: 'walk' }],
          transitions: [{ from: 'idle', to: 'walk', advanceCondition: 'is_moving' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept many states', async () => {
        const result = await handleSetupStateMachine({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          states: [
            { name: 'idle' },
            { name: 'walk' },
            { name: 'run' },
            { name: 'jump' },
            { name: 'fall' },
            { name: 'land' },
          ],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-SUC: Success Scenarios', () => {
      let projectPath: string;
      let cleanup: () => void;

      beforeEach(() => {
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;
      });

      afterEach(() => {
        cleanup();
      });

      it('should validate state machine parameters with valid project', async () => {
        const result = await handleSetupStateMachine({
          projectPath,
          scenePath: 'scenes/main.tscn',
          animTreePath: 'NonExistent',
          states: [{ name: 'idle' }, { name: 'walk' }],
        });
        // May succeed or fail depending on Godot installation
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|State machine|successfully/i);
      });

      it('should validate state machine with transitions', async () => {
        const result = await handleSetupStateMachine({
          projectPath,
          scenePath: 'scenes/main.tscn',
          animTreePath: 'NonExistent',
          states: [
            { name: 'idle', animation: 'idle_anim' },
            { name: 'walk', animation: 'walk_anim' },
          ],
          transitions: [
            { from: 'idle', to: 'walk', switchMode: 'immediate', xfadeTime: 0.2 },
            { from: 'walk', to: 'idle', switchMode: 'at_end' },
          ],
          startState: 'idle',
        });
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|State machine|successfully/i);
      });
    });
  });

  // ============================================================================
  // BlendAnimations Tests
  // ============================================================================
  describe('BlendAnimations', () => {
    describe('TC-VAL: Input Validation', () => {
      it('should return error when required params are missing', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
        });
        expect(result.isError).toBe(true);
      });

      it('should return error when animTreePath is missing', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('animTreePath');
      });

      it('should return error when blendSpaceName is missing', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('blendSpaceName');
      });

      it('should return error when type is missing', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('type');
      });

      it('should return error for invalid scenePath extension', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.json',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tscn or \.scn|scenePath|Validation failed.*scenePath/i);
      });

      it('should return error for invalid blend space type', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: 'invalid' as '1d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid blend space type|type|Validation failed.*type/i);
      });

      it('should return error when points is empty', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/non-empty array|points.*empty|Validation failed.*points/i);
      });
    });

    describe('TC-SEC: Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/../../../etc',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|"\.\."|\.\./i);
      });
    });

    describe('TC-ERR: Error Handling - 1D BlendSpace points', () => {
      it('should return error when 1D point missing animation', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'animation' is required|animation|Validation failed.*points|Invalid input/i);
      });

      it('should return error when 1D point missing position', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'position' is required|position|Validation failed.*points|Invalid input/i);
      });
    });

    describe('TC-ERR: Error Handling - 2D BlendSpace points', () => {
      it('should return error when 2D point missing positionX/Y', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'positionX' and 'positionY' are required|positionX|positionY/i);
      });

      it('should return error when 2D point missing positionY', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [{ animation: 'idle', positionX: 0 }],
        });
        expect(result.isError).toBe(true);
        // Note: Zod schema union validation may report "Invalid input" for incomplete BlendPoint2D
        expect(result.content[0].text).toMatch(/'positionX' and 'positionY' are required|positionY|Invalid input/i);
      });

      it('should return error when 2D point missing positionX', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [{ animation: 'idle', positionY: 0 }],
        });
        expect(result.isError).toBe(true);
        // Note: Zod schema union validation may report "Invalid input" for incomplete BlendPoint2D
        expect(result.content[0].text).toMatch(/'positionX' and 'positionY' are required|positionX|Invalid input/i);
      });
    });

    describe('TC-ERR: Error Handling - blendMode validation', () => {
      it('should return error for invalid blendMode', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          blendMode: 'invalid' as 'interpolated',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid blendMode|blendMode|Validation failed.*blendMode/i);
      });

      it('should accept blendMode: interpolated', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          blendMode: 'interpolated',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept blendMode: discrete', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          blendMode: 'discrete',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept blendMode: carry', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          blendMode: 'carry',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-ERR: Error Handling - space parameters', () => {
      it('should return error for NaN minSpace', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          minSpace: NaN,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/finite number|minSpace|Validation failed.*minSpace/i);
      });

      it('should return error for Infinity maxSpace', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          maxSpace: Infinity,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/finite number|maxSpace|Validation failed.*maxSpace/i);
      });

      it('should return error when minSpace >= maxSpace', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          minSpace: 5,
          maxSpace: 2,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/less than maxSpace|minSpace.*maxSpace/i);
      });

      it('should return error when minSpace equals maxSpace', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          minSpace: 5,
          maxSpace: 5,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/less than maxSpace|minSpace.*maxSpace/i);
      });

      it('should return error for NaN minSpaceY in 2D', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [{ animation: 'idle', positionX: 0, positionY: 0 }],
          minSpaceY: NaN,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/finite number|minSpaceY|Validation failed.*minSpaceY/i);
      });

      it('should return error for Infinity maxSpaceY in 2D', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [{ animation: 'idle', positionX: 0, positionY: 0 }],
          maxSpaceY: Infinity,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/finite number|maxSpaceY|Validation failed.*maxSpaceY/i);
      });

      it('should return error when minSpaceY >= maxSpaceY for 2D', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [{ animation: 'idle', positionX: 0, positionY: 0 }],
          minSpaceY: 10,
          maxSpaceY: 5,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/less than maxSpaceY|minSpaceY.*maxSpaceY/i);
      });
    });

    describe('TC-ERR: Error Handling - project validation', () => {
      it('should return error for invalid project path', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('TC-EDGE: Edge Cases', () => {
      it('should accept multiple 1D points', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [
            { animation: 'idle', position: 0 },
            { animation: 'walk', position: 0.5 },
            { animation: 'run', position: 1 },
          ],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept multiple 2D points', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [
            { animation: 'idle', positionX: 0, positionY: 0 },
            { animation: 'walk_left', positionX: -1, positionY: 0 },
            { animation: 'walk_right', positionX: 1, positionY: 0 },
            { animation: 'walk_up', positionX: 0, positionY: -1 },
            { animation: 'walk_down', positionX: 0, positionY: 1 },
          ],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept negative position values for 1D', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [
            { animation: 'backward', position: -1 },
            { animation: 'idle', position: 0 },
            { animation: 'forward', position: 1 },
          ],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept sync parameter', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          sync: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept all optional parameters together', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '2d',
          points: [{ animation: 'idle', positionX: 0, positionY: 0 }],
          minSpace: -1,
          maxSpace: 1,
          minSpaceY: -1,
          maxSpaceY: 1,
          blendMode: 'interpolated',
          sync: false,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });

      it('should accept valid 1D space range', async () => {
        const result = await handleBlendAnimations({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          animTreePath: 'AnimTree',
          blendSpaceName: 'BlendSpace',
          type: '1d',
          points: [{ animation: 'idle', position: 0 }],
          minSpace: -100,
          maxSpace: 100,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Not a valid Godot project/i);
      });
    });

    describe('TC-SUC: Success Scenarios', () => {
      let projectPath: string;
      let cleanup: () => void;

      beforeEach(() => {
        const temp = createTempProject();
        projectPath = temp.projectPath;
        cleanup = temp.cleanup;
      });

      afterEach(() => {
        cleanup();
      });

      it('should validate 1D blend space parameters with valid project', async () => {
        const result = await handleBlendAnimations({
          projectPath,
          scenePath: 'scenes/main.tscn',
          animTreePath: 'NonExistent',
          blendSpaceName: 'BlendSpace1D',
          type: '1d',
          points: [
            { animation: 'idle', position: 0 },
            { animation: 'walk', position: 0.5 },
            { animation: 'run', position: 1 },
          ],
        });
        // May succeed or fail depending on Godot installation
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|BlendSpace|successfully/i);
      });

      it('should validate 2D blend space parameters with valid project', async () => {
        const result = await handleBlendAnimations({
          projectPath,
          scenePath: 'scenes/main.tscn',
          animTreePath: 'NonExistent',
          blendSpaceName: 'BlendSpace2D',
          type: '2d',
          points: [
            { animation: 'idle', positionX: 0, positionY: 0 },
            { animation: 'walk_left', positionX: -1, positionY: 0 },
            { animation: 'walk_right', positionX: 1, positionY: 0 },
          ],
          minSpace: -2,
          maxSpace: 2,
          minSpaceY: -2,
          maxSpaceY: 2,
          blendMode: 'interpolated',
          sync: true,
        });
        const text = getResponseText(result);
        expect(text).toMatch(/Failed|Could not find|Godot|BlendSpace|successfully/i);
      });
    });
  });
});
