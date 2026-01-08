/**
 * Lighting Tools Tests
 * ISO/IEC 29119 compliant - comprehensive test documentation
 * ISO/IEC 25010 compliant - strict testing
 *
 * Test Coverage Target: 80%+
 *
 * Test Categories (ISO 29119-4):
 * 1. Input Validation Tests (Zod schema validation)
 * 2. Missing Required Parameters Tests
 * 3. Invalid Enum Values Tests
 * 4. Path Security Tests
 * 5. Edge Case Tests
 * 6. File Extension Validation Tests
 */

import { handleCreateLight } from './CreateLightTool';
import { handleSetupEnvironment } from './SetupEnvironmentTool';

describe('Lighting Tools', () => {
  // ============================================================================
  // CreateLight Tests
  // ============================================================================
  describe('CreateLight', () => {
    describe('Input Validation - Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleCreateLight({
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when scenePath is missing', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('scenePath');
      });

      it('should return error when nodeName is missing', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('nodeName');
      });

      it('should return error when lightType is missing', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('lightType');
      });

      it('should return error when all required parameters are missing', async () => {
        const result = await handleCreateLight({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed/i);
      });
    });

    describe('Input Validation - Empty Values', () => {
      it('should return error for empty nodeName', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: '',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/nodeName|cannot be empty|Validation failed/i);
      });

      it('should return error for empty scenePath', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: '',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/scenePath|cannot be empty|Validation failed/i);
      });

      it('should return error for empty projectPath', async () => {
        const result = await handleCreateLight({
          projectPath: '',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/projectPath|cannot be empty|Validation failed/i);
      });
    });

    describe('Invalid Enum Values - lightType', () => {
      it('should return error for invalid lightType', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'invalid',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed|Invalid|lightType/i);
      });

      it('should return error for lightType with wrong case', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'DIRECTIONAL_3D' as 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed|lightType/i);
      });

      it('should return error for empty lightType', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: '' as 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/lightType|Validation failed/i);
      });

      it('should return error for partially matching lightType', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional' as 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed|lightType/i);
      });
    });

    describe('Valid Light Types', () => {
      const validLightTypes = [
        'directional_3d',
        'omni_3d',
        'spot_3d',
        'point_2d',
        'directional_2d',
      ] as const;

      validLightTypes.forEach((lightType) => {
        it(`should accept valid lightType: ${lightType}`, async () => {
          const result = await handleCreateLight({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'TestLight',
            lightType: lightType,
          });
          expect(result.isError).toBe(true);
          // Should fail on project validation, not on lightType
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });
    });

    describe('Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/../../../etc/passwd',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        // On Windows, path may be normalized; either path traversal error or invalid path is acceptable
        expect(result.content[0].text).toMatch(/path traversal|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in scenePath', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: '../../../etc/passwd.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|\.\./i);
      });

      it('should return error for invalid project path', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - Light Properties', () => {
      it('should accept color parameter with RGB values', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          color: { r: 1.0, g: 0.9, b: 0.8 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept energy parameter', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: 2.5,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept range parameter for omni/spot lights', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'PointLight',
          lightType: 'omni_3d',
          range: 10.0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept spotAngle parameter for spot lights', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'SpotLight',
          lightType: 'spot_3d',
          spotAngle: 45.0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept shadowEnabled parameter', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          shadowEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept parentNodePath parameter', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          parentNodePath: 'World/Lighting',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept texturePath parameter for 2D lights', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'PointLight2D',
          lightType: 'point_2d',
          texturePath: 'textures/light_gradient.png',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept all optional parameters together', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'SpotLight',
          lightType: 'spot_3d',
          parentNodePath: 'World/Lighting',
          color: { r: 1.0, g: 0.95, b: 0.9 },
          energy: 2.0,
          range: 15.0,
          spotAngle: 30.0,
          shadowEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Type Validation', () => {
      it('should return error for non-string nodeName', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 123 as unknown as string,
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/nodeName|string|Validation failed/i);
      });

      it('should return error for non-number energy', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: 'high' as unknown as number,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/energy|number|Validation failed/i);
      });

      it('should return error for non-boolean shadowEnabled', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          shadowEnabled: 'yes' as unknown as boolean,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/shadowEnabled|boolean|Validation failed/i);
      });

      it('should return error for invalid color object', async () => {
        const result = await handleCreateLight({
          projectPath: '/path/to/project',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          color: { red: 1.0, green: 0.9 } as unknown as { r: number; g: number; b: number },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/color|Validation failed/i);
      });
    });

    describe('Edge Cases', () => {
      it('should handle nodeName with special characters', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Light_Main-01',
          lightType: 'directional_3d',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle zero energy value', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: 0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle negative energy value', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: -1.0,
        });
        expect(result.isError).toBe(true);
        // Should fail on project validation or energy validation
        expect(result.content[0].text).toMatch(/Not a valid Godot project|energy/i);
      });

      it('should handle very large energy value', async () => {
        const result = await handleCreateLight({
          projectPath: '/non/existent/path',
          scenePath: 'scenes/main.tscn',
          nodeName: 'Sun',
          lightType: 'directional_3d',
          energy: 10000,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });

  // ============================================================================
  // SetupEnvironment Tests
  // ============================================================================
  describe('SetupEnvironment', () => {
    describe('Input Validation - Missing Required Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleSetupEnvironment({
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when environmentPath is missing', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('environmentPath');
      });

      it('should return error when all required parameters are missing', async () => {
        const result = await handleSetupEnvironment({});
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Validation failed/i);
      });
    });

    describe('Input Validation - Empty Values', () => {
      it('should return error for empty environmentPath', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: '',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/environmentPath|cannot be empty|Validation failed/i);
      });

      it('should return error for empty projectPath', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/projectPath|cannot be empty|Validation failed/i);
      });
    });

    describe('File Extension Validation', () => {
      it('should return error for invalid environment extension', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.env',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('.tres');
      });

      it('should return error for .tscn extension', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tscn',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should return error for no extension', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/\.tres|\.res/i);
      });

      it('should accept .tres extension', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        // Should fail on project validation, not extension
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept .res extension', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.res',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Path Security', () => {
      it('should return error for path traversal in projectPath', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/../../../etc/passwd',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        // On Windows, path may be normalized; either path traversal error or invalid path is acceptable
        expect(result.content[0].text).toMatch(/path traversal|\.\.|Not a valid Godot project/i);
      });

      it('should return error for path traversal in environmentPath', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: '../../../etc/passwd.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/path traversal|\.\./i);
      });

      it('should return error for invalid project path', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Invalid Enum Values - backgroundMode', () => {
      it('should return error for invalid backgroundMode', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          backgroundMode: 'invalid_mode' as 'clear_color',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/backgroundMode|Validation failed/i);
      });

      it('should return error for backgroundMode with wrong case', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          backgroundMode: 'CLEAR_COLOR' as 'clear_color',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/backgroundMode|Validation failed/i);
      });
    });

    describe('Invalid Enum Values - tonemapMode', () => {
      it('should return error for invalid tonemapMode', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          tonemapMode: 'invalid_tonemap' as 'linear',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/tonemapMode|Validation failed/i);
      });
    });

    describe('Valid Background Modes', () => {
      const validBackgroundModes = [
        'clear_color',
        'custom_color',
        'sky',
        'canvas',
        'keep',
        'camera_feed',
      ] as const;

      validBackgroundModes.forEach((mode) => {
        it(`should accept valid backgroundMode: ${mode}`, async () => {
          const result = await handleSetupEnvironment({
            projectPath: '/non/existent/path',
            environmentPath: 'environments/main_env.tres',
            backgroundMode: mode,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });
    });

    describe('Valid Tonemap Modes', () => {
      const validTonemapModes = ['linear', 'reinhard', 'filmic', 'aces'] as const;

      validTonemapModes.forEach((mode) => {
        it(`should accept valid tonemapMode: ${mode}`, async () => {
          const result = await handleSetupEnvironment({
            projectPath: '/non/existent/path',
            environmentPath: 'environments/main_env.tres',
            tonemapMode: mode,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });
    });

    describe('Optional Parameters - Background Settings', () => {
      it('should accept backgroundColor parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          backgroundMode: 'custom_color',
          backgroundColor: { r: 0.2, g: 0.3, b: 0.4 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - Ambient Light', () => {
      it('should accept ambientLightColor parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          ambientLightColor: { r: 0.5, g: 0.5, b: 0.5 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept ambientLightEnergy parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          ambientLightEnergy: 1.5,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - Glow', () => {
      it('should accept glowEnabled parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          glowEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept glowIntensity parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          glowEnabled: true,
          glowIntensity: 0.8,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - Fog', () => {
      it('should accept fogEnabled parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          fogEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept fogDensity parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          fogEnabled: true,
          fogDensity: 0.05,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept fogColor parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          fogEnabled: true,
          fogColor: { r: 0.8, g: 0.8, b: 0.9 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - Post-Processing Effects', () => {
      it('should accept ssaoEnabled parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          ssaoEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept ssrEnabled parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          ssrEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should accept sdfgiEnabled parameter', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          sdfgiEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Optional Parameters - All Together', () => {
      it('should accept all optional parameters together', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          backgroundMode: 'sky',
          backgroundColor: { r: 0.2, g: 0.3, b: 0.5 },
          ambientLightColor: { r: 0.4, g: 0.4, b: 0.5 },
          ambientLightEnergy: 1.2,
          tonemapMode: 'aces',
          glowEnabled: true,
          glowIntensity: 0.7,
          fogEnabled: true,
          fogDensity: 0.02,
          fogColor: { r: 0.6, g: 0.6, b: 0.7 },
          ssaoEnabled: true,
          ssrEnabled: true,
          sdfgiEnabled: true,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });

    describe('Type Validation', () => {
      it('should return error for non-string environmentPath', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 123 as unknown as string,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/environmentPath|string|Validation failed/i);
      });

      it('should return error for non-boolean glowEnabled', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          glowEnabled: 'true' as unknown as boolean,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/glowEnabled|boolean|Validation failed/i);
      });

      it('should return error for non-number fogDensity', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          fogDensity: 'thick' as unknown as number,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/fogDensity|number|Validation failed/i);
      });

      it('should return error for invalid color object in backgroundColor', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/path/to/project',
          environmentPath: 'environments/main_env.tres',
          backgroundColor: { red: 0.5, blue: 0.5 } as unknown as { r: number; g: number; b: number },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/backgroundColor|Validation failed/i);
      });
    });

    describe('Edge Cases', () => {
      it('should handle environmentPath with deeply nested directories', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'assets/environments/levels/level1/main_env.tres',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle zero glowIntensity', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          glowEnabled: true,
          glowIntensity: 0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle zero fogDensity', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          fogEnabled: true,
          fogDensity: 0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle color values at boundaries (0.0)', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          backgroundColor: { r: 0, g: 0, b: 0 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });

      it('should handle color values at boundaries (1.0)', async () => {
        const result = await handleSetupEnvironment({
          projectPath: '/non/existent/path',
          environmentPath: 'environments/main_env.tres',
          backgroundColor: { r: 1, g: 1, b: 1 },
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('Not a valid Godot project');
      });
    });
  });
});
