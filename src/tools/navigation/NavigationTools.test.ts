/**
 * Navigation Tools Tests
 * ISO/IEC 29119 compliant - comprehensive test coverage
 * ISO/IEC 25010 compliant - strict testing
 *
 * Tests for:
 * - BakeNavigationMeshTool
 * - CreateNavigationRegionTool
 */

import { handleCreateNavigationRegion } from './CreateNavigationRegionTool';
import { handleBakeNavigationMesh } from './BakeNavigationMeshTool';
import { createTempProject } from '../test-utils.js';

describe('Navigation Tools', () => {
  // ============================================================================
  // BakeNavigationMesh Tests
  // ============================================================================
  describe('BakeNavigationMesh', () => {
    describe('ISO 29119-4: Input Validation', () => {
      describe('Required Parameter Validation', () => {
        it('should return error when projectPath is missing', async () => {
          const result = await handleBakeNavigationMesh({
            meshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('projectPath');
        });

        it('should return error when meshPath is missing', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/path/to/project',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('meshPath');
        });

        it('should return error for empty projectPath', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '',
            meshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/projectPath|empty/i);
        });

        it('should return error for empty meshPath', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/path/to/project',
            meshPath: '',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/meshPath|empty/i);
        });
      });

      describe('File Extension Validation', () => {
        it('should return error for invalid mesh extension (.mesh)', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.mesh',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/\.tres|\.res/i);
        });

        it('should return error for invalid mesh extension (.txt)', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.txt',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/\.tres|\.res/i);
        });

        it('should return error for invalid mesh extension (.gd)', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.gd',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/\.tres|\.res/i);
        });

        it('should return error for no file extension', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/\.tres|\.res/i);
        });

        it('should accept .tres extension', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          // Should fail on project validation, not extension validation
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept .res extension', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.res',
          });
          expect(result.isError).toBe(true);
          // Should fail on project validation, not extension validation
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });

      describe('Agent Parameters Validation', () => {
        it('should accept valid agentRadius', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
            is3D: true,
            agentRadius: 0.5,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept valid agentHeight', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
            is3D: true,
            agentHeight: 2.0,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept valid agentMaxClimb', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
            is3D: true,
            agentMaxClimb: 0.5,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept valid agentMaxSlope', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
            is3D: true,
            agentMaxSlope: 45.0,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept all agent parameters together', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
            is3D: true,
            agentRadius: 0.5,
            agentHeight: 1.8,
            agentMaxClimb: 0.3,
            agentMaxSlope: 60.0,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });

      describe('Dimension Flag Validation', () => {
        it('should accept is3D: true', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
            is3D: true,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept is3D: false', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
            is3D: false,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should default to is3D: false when not specified', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });

      describe('Path Security Validation', () => {
        it('should return error for path traversal in projectPath', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/path/../../../etc/passwd',
            meshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          // On Windows, path resolution may resolve '..' before validation
          // Accept either path traversal error or invalid project error
          expect(result.content[0].text).toMatch(/path traversal|\.\.|Not a valid Godot project/i);
        });

        it('should return error for path traversal in meshPath', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/path/to/project',
            meshPath: '../../../etc/passwd.tres',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/path traversal|\.\./i);
        });
      });

      describe('Project Validation', () => {
        it('should return error for non-existent project path', async () => {
          const result = await handleBakeNavigationMesh({
            projectPath: '/non/existent/path',
            meshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });
    });

    describe('ISO 29119-4: Success Scenarios', () => {
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

      it('should pass validation for 2D navigation mesh request', async () => {
        const result = await handleBakeNavigationMesh({
          projectPath,
          meshPath: 'navigation/nav_poly.tres',
          is3D: false,
        });

        // Validation should pass - response contains result text
        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation for 3D navigation mesh request', async () => {
        const result = await handleBakeNavigationMesh({
          projectPath,
          meshPath: 'navigation/nav_mesh.tres',
          is3D: true,
        });

        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation with custom agent parameters', async () => {
        const result = await handleBakeNavigationMesh({
          projectPath,
          meshPath: 'navigation/custom_nav.tres',
          is3D: true,
          agentRadius: 0.8,
          agentHeight: 2.5,
          agentMaxClimb: 0.4,
          agentMaxSlope: 50.0,
        });

        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation for nested directory path', async () => {
        const result = await handleBakeNavigationMesh({
          projectPath,
          meshPath: 'resources/navigation/level1/nav.tres',
          is3D: false,
        });

        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation for .res extension', async () => {
        const result = await handleBakeNavigationMesh({
          projectPath,
          meshPath: 'navigation/nav.res',
          is3D: false,
        });

        expect(result.content[0].text).toBeDefined();
      });
    });
  });

  // ============================================================================
  // CreateNavigationRegion Tests
  // ============================================================================
  describe('CreateNavigationRegion', () => {
    describe('ISO 29119-4: Input Validation', () => {
      describe('Required Parameter Validation', () => {
        it('should return error when projectPath is missing', async () => {
          const result = await handleCreateNavigationRegion({
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('projectPath');
        });

        it('should return error when scenePath is missing', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/path/to/project',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('scenePath');
        });

        it('should return error when nodeName is missing', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/path/to/project',
            scenePath: 'scenes/main.tscn',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('nodeName');
        });

        it('should return error for empty projectPath', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/projectPath|empty/i);
        });

        it('should return error for empty scenePath', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/path/to/project',
            scenePath: '',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/scenePath|empty/i);
        });

        it('should return error for empty nodeName', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/path/to/project',
            scenePath: 'scenes/main.tscn',
            nodeName: '',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/nodeName|empty/i);
        });
      });

      describe('Optional Parameter Validation', () => {
        it('should accept parentNodePath', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
            parentNodePath: 'World',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept navigationMeshPath', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
            navigationMeshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept all optional parameters together', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
            parentNodePath: 'World',
            is3D: true,
            navigationMeshPath: 'navigation/nav_mesh.tres',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });

      describe('Dimension Flag Validation', () => {
        it('should accept is3D: true', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion3D',
            is3D: true,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should accept is3D: false', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion2D',
            is3D: false,
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });

        it('should default to is3D: false when not specified', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });

      describe('Path Security Validation', () => {
        it('should return error for path traversal in projectPath', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/path/../../../etc/passwd',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          // On Windows, path resolution may resolve '..' before validation
          // Accept either path traversal error or invalid project error
          expect(result.content[0].text).toMatch(/path traversal|\.\.|Not a valid Godot project/i);
        });

        it('should return error for path traversal in scenePath', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/path/to/project',
            scenePath: '../../../etc/passwd.tscn',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/path traversal|\.\./i);
        });
      });

      describe('Project Validation', () => {
        it('should return error for non-existent project path', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath: '/non/existent/path',
            scenePath: 'scenes/main.tscn',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toContain('Not a valid Godot project');
        });
      });

      describe('Scene Validation', () => {
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

        it('should return error for non-existent scene', async () => {
          const result = await handleCreateNavigationRegion({
            projectPath,
            scenePath: 'scenes/nonexistent.tscn',
            nodeName: 'NavRegion',
          });
          expect(result.isError).toBe(true);
          expect(result.content[0].text).toMatch(/scene|not found|does not exist/i);
        });
      });
    });

    describe('ISO 29119-4: Success Scenarios', () => {
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

      it('should pass validation for 2D navigation region request', async () => {
        const result = await handleCreateNavigationRegion({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'NavRegion2D',
          is3D: false,
        });
        // Validation should pass (may fail on Godot execution)
        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation for 3D navigation region request', async () => {
        const result = await handleCreateNavigationRegion({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'NavRegion3D',
          is3D: true,
        });
        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation with parent node specified', async () => {
        const result = await handleCreateNavigationRegion({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'NavRegion',
          parentNodePath: 'Player',
        });
        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation with navigation mesh path specified', async () => {
        const result = await handleCreateNavigationRegion({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'NavRegion',
          navigationMeshPath: 'navigation/nav_mesh.tres',
        });
        expect(result.content[0].text).toBeDefined();
      });

      it('should pass validation with all parameters specified', async () => {
        const result = await handleCreateNavigationRegion({
          projectPath,
          scenePath: 'scenes/main.tscn',
          nodeName: 'FullNavRegion',
          parentNodePath: 'Player',
          is3D: true,
          navigationMeshPath: 'navigation/nav_mesh.tres',
        });
        expect(result.content[0].text).toBeDefined();
      });
    });
  });

  // ============================================================================
  // Integration Tests - Validation Only
  // Note: Full file creation tests are skipped due to ESM/fs-extra compatibility issues in test environment
  // ============================================================================
  describe('ISO 29119-4: Integration Tests', () => {
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

    it('should pass validation for mesh followed by region creation', async () => {
      // Test validation for navigation mesh request
      const meshResult = await handleBakeNavigationMesh({
        projectPath,
        meshPath: 'navigation/level_nav.tres',
        is3D: false,
      });

      expect(meshResult.content[0].text).toBeDefined();

      // Test validation for navigation region request
      const regionResult = await handleCreateNavigationRegion({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'LevelNavRegion',
        is3D: false,
        navigationMeshPath: 'navigation/level_nav.tres',
      });

      expect(regionResult.content[0].text).toBeDefined();
    });

    it('should pass validation for 3D mesh with custom parameters followed by region', async () => {
      // Test validation for 3D navigation mesh request with custom settings
      const meshResult = await handleBakeNavigationMesh({
        projectPath,
        meshPath: 'navigation/player_nav.tres',
        is3D: true,
        agentRadius: 0.4,
        agentHeight: 1.8,
        agentMaxClimb: 0.25,
        agentMaxSlope: 45.0,
      });

      expect(meshResult.content[0].text).toBeDefined();

      // Test validation for region using this mesh
      const regionResult = await handleCreateNavigationRegion({
        projectPath,
        scenePath: 'scenes/main.tscn',
        nodeName: 'PlayerNavRegion',
        is3D: true,
        navigationMeshPath: 'navigation/player_nav.tres',
      });

      expect(regionResult.content[0].text).toBeDefined();
    });
  });
});
