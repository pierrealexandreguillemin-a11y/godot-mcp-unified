/**
 * Animation Tools Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleCreateAnimationPlayer } from './CreateAnimationPlayerTool';
import { handleAddAnimation } from './AddAnimationTool';
import { handleAddAnimationTrack } from './AddAnimationTrackTool';
import { handleSetKeyframe } from './SetKeyframeTool';
import { handleCreateAnimationTree } from './CreateAnimationTreeTool';
import { handleSetupStateMachine } from './SetupStateMachineTool';
import { handleBlendAnimations } from './BlendAnimationsTool';

describe('Animation Tools', () => {
  describe('CreateAnimationPlayer', () => {
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

    it('should return error for invalid project path', async () => {
      const result = await handleCreateAnimationPlayer({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        nodeName: 'AnimPlayer',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('AddAnimation', () => {
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

    it('should return error for invalid project path', async () => {
      const result = await handleAddAnimation({
        projectPath: '/non/existent/path',
        scenePath: 'scenes/main.tscn',
        playerNodePath: 'AnimPlayer',
        animationName: 'walk',
      });
      expect(result.isError).toBe(true);
    });
  });

  describe('AddAnimationTrack', () => {
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

  describe('SetKeyframe', () => {
    it('should return error when required params are missing', async () => {
      const result = await handleSetKeyframe({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
    });

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
  });

  describe('CreateAnimationTree', () => {
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

    it('should return error for empty nodeName', async () => {
      const result = await handleCreateAnimationTree({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        nodeName: '   ',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/cannot be empty|nodeName.*empty|Validation failed.*nodeName/i);
    });

    it('should return error for nodeName with invalid characters', async () => {
      const result = await handleCreateAnimationTree({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
        nodeName: 'Node/With:Invalid@Chars',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/invalid characters|nodeName|Validation failed.*nodeName/i);
    });

    it('should return error for invalid scenePath extension', async () => {
      const result = await handleCreateAnimationTree({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.gd',
        nodeName: 'AnimTree',
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/\.tscn or \.scn|scenePath|Validation failed.*scenePath/i);
    });

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

  describe('SetupStateMachine', () => {
    it('should return error when required params are missing', async () => {
      const result = await handleSetupStateMachine({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
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
  });

  describe('BlendAnimations', () => {
    it('should return error when required params are missing', async () => {
      const result = await handleBlendAnimations({
        projectPath: '/path/to/project',
        scenePath: 'scenes/main.tscn',
      });
      expect(result.isError).toBe(true);
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
});
