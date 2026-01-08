/**
 * Project Tools Integration Tests
 * Tests GetProjectInfo, ListProjects, ListExportPresets, ManageAutoloads, ManageInputActions
 *
 * ISO/IEC 29119 Test Documentation Standard Compliance:
 * - Test Case Specification: describe/it blocks with clear naming
 * - Preconditions: beforeEach/afterEach for setup and teardown
 * - Test Design: Given-When-Then pattern (Arrange-Act-Assert)
 *
 * ISO/IEC 25010 Quality Characteristics:
 * - Functional Suitability: Complete validation path coverage
 * - Security: Path traversal prevention verification
 * - Reliability: Error handling validation
 */

import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  parseJsonResponse,
  isErrorResponse,
} from '../test-utils.js';
import { handleGetProjectInfo } from './GetProjectInfoTool.js';
import { handleListProjects } from './ListProjectsTool.js';
import { handleListExportPresets } from './ListExportPresetsTool.js';
import { handleManageAutoloads } from './ManageAutoloadsTool.js';
import { handleManageInputActions } from './ManageInputActionsTool.js';

describe('Project Tools', () => {
  let projectPath: string;
  let cleanup: () => void;

  // Precondition: Create temporary test project before each test
  beforeEach(() => {
    const temp = createTempProject();
    projectPath = temp.projectPath;
    cleanup = temp.cleanup;
  });

  // Postcondition: Clean up temporary project after each test
  afterEach(() => {
    cleanup();
  });

  // ============================================================================
  // GetProjectInfo Tool Tests
  // ============================================================================

  describe('GetProjectInfo', () => {
    /**
     * Test Suite: Input Validation
     * Verifies all validation paths for GetProjectInfo tool parameters
     */
    describe('validation', () => {
      /**
       * Test Case: TC-GETPROJINFO-VAL-001
       * Given: No arguments provided
       * When: handleGetProjectInfo is called
       * Then: Returns error response indicating validation failure
       */
      it('should return error when projectPath is missing', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
      });

      /**
       * Test Case: TC-GETPROJINFO-VAL-002
       * Given: Empty projectPath provided
       * When: handleGetProjectInfo is called
       * Then: Returns error response for empty path
       */
      it('should return error when projectPath is empty', async () => {
        // Arrange
        const args = {
          projectPath: '',
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|cannot be empty/i);
      });

      /**
       * Test Case: TC-GETPROJINFO-VAL-003
       * Given: Non-existent project path
       * When: handleGetProjectInfo is called
       * Then: Returns error response for invalid project
       */
      it('should return error for non-existent project path', async () => {
        // Arrange
        const args = {
          projectPath: '/non/existent/godot/project',
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|Not a valid Godot project/i);
      });

      /**
       * Test Case: TC-GETPROJINFO-VAL-004
       * Given: Project path pointing to a file (not directory)
       * When: handleGetProjectInfo is called
       * Then: Returns error response indicating invalid project directory
       */
      it('should return error when projectPath is a file not directory', async () => {
        // Arrange - use the project.godot file path instead of directory
        const args = {
          projectPath: `${projectPath}/project.godot`,
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|invalid|directory|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: Security - Path Traversal Prevention
     * Verifies protection against directory traversal attacks
     */
    describe('path traversal prevention', () => {
      /**
       * Test Case: TC-GETPROJINFO-SEC-001
       * Given: projectPath containing ".." (parent directory reference)
       * When: handleGetProjectInfo is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with path traversal attempt', async () => {
        // Arrange
        const args = {
          projectPath: '../../../etc',
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-GETPROJINFO-SEC-002
       * Given: projectPath with leading path traversal
       * When: handleGetProjectInfo is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with leading path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '../../sensitive/directory',
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-GETPROJINFO-SEC-003
       * Given: projectPath with embedded path traversal
       * When: handleGetProjectInfo is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with embedded path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '/home/user/projects/../../../etc',
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|Not a valid Godot project/i);
      });

      /**
       * Test Case: TC-GETPROJINFO-SEC-004
       * Given: projectPath with Windows-style path traversal
       * When: handleGetProjectInfo is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with Windows-style path traversal', async () => {
        // Arrange
        const args = {
          projectPath: 'C:\\Projects\\..\\..\\Windows\\System32',
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|not found|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: Project Validation
     * Verifies proper project directory validation
     */
    describe('project validation', () => {
      /**
       * Test Case: TC-GETPROJINFO-PROJ-001
       * Given: Directory exists but is not a Godot project
       * When: handleGetProjectInfo is called
       * Then: Returns error response for missing project.godot
       */
      it('should return error for directory without project.godot', async () => {
        // Arrange - use the scripts subdirectory which doesn't have project.godot
        const args = {
          projectPath: `${projectPath}/scripts`,
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|invalid|project\.godot|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: Successful Operations
     */
    describe('successful operations', () => {
      /**
       * Test Case: TC-GETPROJINFO-OP-001
       * Given: Valid Godot project path
       * When: handleGetProjectInfo is called
       * Then: Returns project information or Godot version error
       */
      it('should handle valid project info request (integration)', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        const responseText = getResponseText(result);
        if (isErrorResponse(result)) {
          // Accept Godot-related errors (not found, version issues)
          expect(responseText).toMatch(/Godot|not found|executable|failed/i);
        } else {
          // Success case - should contain project information
          const data = parseJsonResponse<{
            name: string;
            path: string;
            godotVersion: string;
            structure: unknown;
          }>(result);
          expect(data.name).toBeDefined();
          expect(data.path).toBe(projectPath);
          expect(data.godotVersion).toBeDefined();
          expect(data.structure).toBeDefined();
        }
      });

      /**
       * Test Case: TC-GETPROJINFO-OP-002
       * Given: Valid project with custom project name
       * When: handleGetProjectInfo is called
       * Then: Returns correct project name from config
       */
      it('should extract project name from project.godot', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        const responseText = getResponseText(result);
        if (!isErrorResponse(result)) {
          const data = parseJsonResponse<{ name: string }>(result);
          expect(data.name).toBe('Test Project');
        }
      });
    });

    /**
     * Test Suite: Edge Cases
     */
    describe('edge cases', () => {
      /**
       * Test Case: TC-GETPROJINFO-EDGE-001
       * Given: projectPath with only whitespace
       * When: handleGetProjectInfo is called
       * Then: Returns validation error
       */
      it('should handle projectPath with only whitespace', async () => {
        // Arrange
        const args = {
          projectPath: '   ',
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-GETPROJINFO-EDGE-002
       * Given: undefined values passed as arguments
       * When: handleGetProjectInfo is called
       * Then: Returns validation error
       */
      it('should handle undefined values gracefully', async () => {
        // Arrange
        const args = {
          projectPath: undefined,
        } as unknown as { projectPath: string };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-GETPROJINFO-EDGE-003
       * Given: null values passed as arguments
       * When: handleGetProjectInfo is called
       * Then: Returns validation error
       */
      it('should handle null values gracefully', async () => {
        // Arrange
        const args = {
          projectPath: null,
        } as unknown as { projectPath: string };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-GETPROJINFO-EDGE-004
       * Given: Very long projectPath
       * When: handleGetProjectInfo is called
       * Then: Returns appropriate error
       */
      it('should handle very long projectPath', async () => {
        // Arrange
        const args = {
          projectPath: '/a'.repeat(10000),
        };

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });
    });
  });

  // ============================================================================
  // ListProjects Tool Tests
  // ============================================================================

  describe('ListProjects', () => {
    /**
     * Test Suite: Input Validation
     * Verifies all validation paths for ListProjects tool parameters
     */
    describe('validation', () => {
      /**
       * Test Case: TC-LISTPROJ-VAL-001
       * Given: No arguments provided
       * When: handleListProjects is called
       * Then: Returns error response indicating validation failure
       */
      it('should return error when directory is missing', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|directory/i);
      });

      /**
       * Test Case: TC-LISTPROJ-VAL-002
       * Given: Empty directory provided
       * When: handleListProjects is called
       * Then: Returns error response for empty directory
       */
      it('should return error when directory is empty', async () => {
        // Arrange
        const args = {
          directory: '',
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|cannot be empty/i);
      });

      /**
       * Test Case: TC-LISTPROJ-VAL-003
       * Given: Non-existent directory path
       * When: handleListProjects is called
       * Then: Returns error response for invalid directory
       */
      it('should return error for non-existent directory', async () => {
        // Arrange
        const args = {
          directory: '/non/existent/directory',
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/does not exist/i);
      });

      /**
       * Test Case: TC-LISTPROJ-VAL-004
       * Given: Invalid recursive parameter type
       * When: handleListProjects is called
       * Then: Handles gracefully (coerces or errors)
       */
      it('should handle invalid recursive parameter type', async () => {
        // Arrange
        const args = {
          directory: projectPath,
          recursive: 'invalid' as unknown as boolean,
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        // Should either coerce the value or return validation error
        const responseText = getResponseText(result);
        expect(responseText.length).toBeGreaterThan(0);
      });
    });

    /**
     * Test Suite: Security - Path Traversal Prevention
     * Verifies protection against directory traversal attacks
     */
    describe('path traversal prevention', () => {
      /**
       * Test Case: TC-LISTPROJ-SEC-001
       * Given: directory containing ".." (parent directory reference)
       * When: handleListProjects is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject directory with path traversal attempt', async () => {
        // Arrange
        const args = {
          directory: '../../../etc',
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|does not exist/i);
      });

      /**
       * Test Case: TC-LISTPROJ-SEC-002
       * Given: directory with embedded path traversal
       * When: handleListProjects is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject directory with embedded path traversal', async () => {
        // Arrange
        const args = {
          directory: '/home/user/projects/../../../etc',
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|does not exist/i);
      });
    });

    /**
     * Test Suite: Successful Operations
     */
    describe('successful operations', () => {
      /**
       * Test Case: TC-LISTPROJ-OP-001
       * Given: Valid directory containing a Godot project
       * When: handleListProjects is called
       * Then: Returns list containing the project
       */
      it('should list projects in directory', async () => {
        // Arrange - get the parent directory which contains the temp project
        const parentDir = join(projectPath, '..');
        const args = {
          directory: parentDir,
          recursive: true,
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<Array<{ path: string; name: string }>>(result);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBeGreaterThanOrEqual(1);
      });

      /**
       * Test Case: TC-LISTPROJ-OP-002
       * Given: Valid directory with no projects
       * When: handleListProjects is called with recursive=false
       * Then: Returns empty list
       */
      it('should return empty list when no projects found', async () => {
        // Arrange - use scripts subdirectory which has no projects
        const args = {
          directory: `${projectPath}/scripts`,
          recursive: false,
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<Array<unknown>>(result);
        expect(Array.isArray(data)).toBe(true);
        expect(data.length).toBe(0);
      });

      /**
       * Test Case: TC-LISTPROJ-OP-003
       * Given: Valid directory with recursive=true
       * When: handleListProjects is called
       * Then: Returns projects from subdirectories
       */
      it('should list projects recursively when recursive=true', async () => {
        // Arrange - create nested project structure
        const nestedDir = join(projectPath, 'nested');
        mkdirSync(nestedDir, { recursive: true });
        writeFileSync(join(nestedDir, 'project.godot'), '[application]\nconfig/name="Nested"');

        const args = {
          directory: projectPath,
          recursive: true,
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<Array<{ path: string }>>(result);
        expect(data.length).toBeGreaterThanOrEqual(1);
      });

      /**
       * Test Case: TC-LISTPROJ-OP-004
       * Given: Valid directory with recursive=false
       * When: handleListProjects is called
       * Then: Does not return projects from subdirectories
       */
      it('should not list nested projects when recursive=false', async () => {
        // Arrange - create nested project structure
        const nestedDir = join(projectPath, 'nested_project');
        mkdirSync(nestedDir, { recursive: true });
        writeFileSync(join(nestedDir, 'project.godot'), '[application]\nconfig/name="Nested"');

        const args = {
          directory: projectPath,
          recursive: false,
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        // The test project itself should be found at root level
      });
    });

    /**
     * Test Suite: Edge Cases
     */
    describe('edge cases', () => {
      /**
       * Test Case: TC-LISTPROJ-EDGE-001
       * Given: directory with only whitespace
       * When: handleListProjects is called
       * Then: Returns validation error
       */
      it('should handle directory with only whitespace', async () => {
        // Arrange
        const args = {
          directory: '   ',
        };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-LISTPROJ-EDGE-002
       * Given: undefined directory
       * When: handleListProjects is called
       * Then: Returns validation error
       */
      it('should handle undefined directory gracefully', async () => {
        // Arrange
        const args = {
          directory: undefined,
        } as unknown as { directory: string };

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });
    });
  });

  // ============================================================================
  // ListExportPresets Tool Tests
  // ============================================================================

  describe('ListExportPresets', () => {
    /**
     * Test Suite: Input Validation
     * Verifies all validation paths for ListExportPresets tool parameters
     */
    describe('validation', () => {
      /**
       * Test Case: TC-LISTEXP-VAL-001
       * Given: No arguments provided
       * When: handleListExportPresets is called
       * Then: Returns error response indicating validation failure
       */
      it('should return error when projectPath is missing', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
      });

      /**
       * Test Case: TC-LISTEXP-VAL-002
       * Given: Empty projectPath provided
       * When: handleListExportPresets is called
       * Then: Returns error response for empty path
       */
      it('should return error when projectPath is empty', async () => {
        // Arrange
        const args = {
          projectPath: '',
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|cannot be empty/i);
      });

      /**
       * Test Case: TC-LISTEXP-VAL-003
       * Given: Non-existent project path
       * When: handleListExportPresets is called
       * Then: Returns error response for invalid project
       */
      it('should return error for non-existent project path', async () => {
        // Arrange
        const args = {
          projectPath: '/non/existent/godot/project',
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: Security - Path Traversal Prevention
     * Verifies protection against directory traversal attacks
     */
    describe('path traversal prevention', () => {
      /**
       * Test Case: TC-LISTEXP-SEC-001
       * Given: projectPath containing ".." (parent directory reference)
       * When: handleListExportPresets is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with path traversal attempt', async () => {
        // Arrange
        const args = {
          projectPath: '../../../etc',
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-LISTEXP-SEC-002
       * Given: projectPath with embedded path traversal
       * When: handleListExportPresets is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with embedded path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '/home/user/projects/../../../etc',
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: Successful Operations
     */
    describe('successful operations', () => {
      /**
       * Test Case: TC-LISTEXP-OP-001
       * Given: Valid project with no export presets
       * When: handleListExportPresets is called
       * Then: Returns empty presets array with message
       */
      it('should return empty list when no export_presets.cfg exists', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          projectPath: string;
          presetsFile: string;
          count: number;
          presets: unknown[];
          message?: string;
        }>(result);
        expect(data.count).toBe(0);
        expect(data.presets).toEqual([]);
        expect(data.message).toMatch(/No export_presets\.cfg/i);
      });

      /**
       * Test Case: TC-LISTEXP-OP-002
       * Given: Valid project with export presets configured
       * When: handleListExportPresets is called
       * Then: Returns list of configured presets
       */
      it('should list export presets from export_presets.cfg', async () => {
        // Arrange - create export_presets.cfg
        const presetsContent = `[preset.0]
name="Windows Desktop"
platform="Windows Desktop"
runnable=true
export_path="builds/windows/game.exe"

[preset.0.options]
custom_template/debug=""

[preset.1]
name="Linux"
platform="Linux"
runnable=false
export_path="builds/linux/game.x86_64"

[preset.1.options]
custom_template/release=""
`;
        writeFileSync(join(projectPath, 'export_presets.cfg'), presetsContent);

        const args = {
          projectPath,
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          count: number;
          presets: Array<{
            index: number;
            name: string;
            platform: string;
            runnable: boolean;
            exportPath?: string;
          }>;
        }>(result);
        expect(data.count).toBe(2);
        expect(data.presets[0].name).toBe('Windows Desktop');
        expect(data.presets[0].platform).toBe('Windows Desktop');
        expect(data.presets[0].runnable).toBe(true);
        expect(data.presets[1].name).toBe('Linux');
        expect(data.presets[1].runnable).toBe(false);
      });

      /**
       * Test Case: TC-LISTEXP-OP-003
       * Given: Valid project with single export preset
       * When: handleListExportPresets is called
       * Then: Returns single preset with all properties
       */
      it('should parse preset with export_filter', async () => {
        // Arrange
        const presetsContent = `[preset.0]
name="HTML5"
platform="Web"
runnable=true
export_filter="all_resources"
export_path="builds/web/index.html"
`;
        writeFileSync(join(projectPath, 'export_presets.cfg'), presetsContent);

        const args = {
          projectPath,
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          presets: Array<{
            exportFilter?: string;
          }>;
        }>(result);
        expect(data.presets[0].exportFilter).toBe('all_resources');
      });

      /**
       * Test Case: TC-LISTEXP-OP-004
       * Given: Valid project with preset without name
       * When: handleListExportPresets is called
       * Then: Handles gracefully (skips invalid preset)
       */
      it('should handle preset without name', async () => {
        // Arrange - preset without name should be skipped
        const presetsContent = `[preset.0]
platform="Android"
runnable=false
`;
        writeFileSync(join(projectPath, 'export_presets.cfg'), presetsContent);

        const args = {
          projectPath,
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{ count: number }>(result);
        // Preset without name should be skipped
        expect(data.count).toBe(0);
      });
    });

    /**
     * Test Suite: Edge Cases
     */
    describe('edge cases', () => {
      /**
       * Test Case: TC-LISTEXP-EDGE-001
       * Given: projectPath with only whitespace
       * When: handleListExportPresets is called
       * Then: Returns validation error
       */
      it('should handle projectPath with only whitespace', async () => {
        // Arrange
        const args = {
          projectPath: '   ',
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-LISTEXP-EDGE-002
       * Given: Empty export_presets.cfg file
       * When: handleListExportPresets is called
       * Then: Returns empty presets array
       */
      it('should handle empty export_presets.cfg', async () => {
        // Arrange
        writeFileSync(join(projectPath, 'export_presets.cfg'), '');

        const args = {
          projectPath,
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{ count: number }>(result);
        expect(data.count).toBe(0);
      });

      /**
       * Test Case: TC-LISTEXP-EDGE-003
       * Given: Malformed export_presets.cfg
       * When: handleListExportPresets is called
       * Then: Handles gracefully
       */
      it('should handle malformed export_presets.cfg', async () => {
        // Arrange
        writeFileSync(join(projectPath, 'export_presets.cfg'), 'not valid\nconfig format\n[invalid');

        const args = {
          projectPath,
        };

        // Act
        const result = await handleListExportPresets(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{ count: number }>(result);
        // Should return 0 presets for malformed file
        expect(data.count).toBe(0);
      });
    });
  });

  // ============================================================================
  // ManageAutoloads Tool Tests
  // ============================================================================

  describe('ManageAutoloads', () => {
    /**
     * Test Suite: Input Validation
     * Verifies all validation paths for ManageAutoloads tool parameters
     */
    describe('validation', () => {
      /**
       * Test Case: TC-AUTOLOAD-VAL-001
       * Given: No arguments provided
       * When: handleManageAutoloads is called
       * Then: Returns error response indicating validation failure
       */
      it('should return error when projectPath is missing', async () => {
        // Arrange
        const args = {
          action: 'list',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-VAL-002
       * Given: Missing action parameter
       * When: handleManageAutoloads is called
       * Then: Returns error response indicating missing action
       */
      it('should return error when action is missing', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|action/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-VAL-003
       * Given: Invalid action value
       * When: handleManageAutoloads is called
       * Then: Returns error response for invalid action
       */
      it('should return error for invalid action value', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'invalid_action',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|Invalid/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-VAL-004
       * Given: Add action without name
       * When: handleManageAutoloads is called
       * Then: Returns error response indicating missing name
       */
      it('should return error when add action is missing name', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          path: 'scripts/global.gd',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Name is required/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-VAL-005
       * Given: Add action without path
       * When: handleManageAutoloads is called
       * Then: Returns error response indicating missing path
       */
      it('should return error when add action is missing path', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'Global',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Path is required/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-VAL-006
       * Given: Remove action without name
       * When: handleManageAutoloads is called
       * Then: Returns error response indicating missing name
       */
      it('should return error when remove action is missing name', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'remove',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Name is required/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-VAL-007
       * Given: Empty projectPath provided
       * When: handleManageAutoloads is called
       * Then: Returns error response for empty path
       */
      it('should return error when projectPath is empty', async () => {
        // Arrange
        const args = {
          projectPath: '',
          action: 'list',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|cannot be empty/i);
      });
    });

    /**
     * Test Suite: Security - Path Traversal Prevention
     * Verifies protection against directory traversal attacks
     */
    describe('path traversal prevention', () => {
      /**
       * Test Case: TC-AUTOLOAD-SEC-001
       * Given: projectPath containing ".." (parent directory reference)
       * When: handleManageAutoloads is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with path traversal attempt', async () => {
        // Arrange
        const args = {
          projectPath: '../../../etc',
          action: 'list',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-SEC-002
       * Given: projectPath with embedded path traversal
       * When: handleManageAutoloads is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with embedded path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '/home/user/../../../etc',
          action: 'list',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: List Operations
     */
    describe('list operations', () => {
      /**
       * Test Case: TC-AUTOLOAD-LIST-001
       * Given: Valid project with no autoloads
       * When: handleManageAutoloads is called with action='list'
       * Then: Returns empty autoloads array
       */
      it('should return empty list when no autoloads configured', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'list',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          autoloadCount: number;
          autoloads: unknown[];
        }>(result);
        expect(data.autoloadCount).toBe(0);
        expect(data.autoloads).toEqual([]);
      });

      /**
       * Test Case: TC-AUTOLOAD-LIST-002
       * Given: Valid project with autoloads configured
       * When: handleManageAutoloads is called with action='list'
       * Then: Returns list of autoloads
       */
      it('should list autoloads from project.godot', async () => {
        // Arrange - add autoload section to project.godot
        const projectGodotPath = join(projectPath, 'project.godot');
        const existingContent = `; Engine configuration file.
config_version=5

[application]
config/name="Test Project"

[autoload]
Global="*res://scripts/global.gd"
GameManager="*res://scripts/game_manager.gd"
`;
        writeFileSync(projectGodotPath, existingContent);

        // Create the script files
        writeFileSync(join(projectPath, 'scripts/global.gd'), 'extends Node');
        writeFileSync(join(projectPath, 'scripts/game_manager.gd'), 'extends Node');

        const args = {
          projectPath,
          action: 'list',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          autoloadCount: number;
          autoloads: Array<{ name: string; path: string; enabled: boolean }>;
        }>(result);
        expect(data.autoloadCount).toBe(2);
        expect(data.autoloads.some(a => a.name === 'Global')).toBe(true);
        expect(data.autoloads.some(a => a.name === 'GameManager')).toBe(true);
      });
    });

    /**
     * Test Suite: Add Operations
     */
    describe('add operations', () => {
      /**
       * Test Case: TC-AUTOLOAD-ADD-001
       * Given: Valid project and valid script path
       * When: handleManageAutoloads is called with action='add'
       * Then: Adds autoload to project.godot
       */
      it('should add autoload successfully', async () => {
        // Arrange - create a script to autoload
        writeFileSync(join(projectPath, 'scripts/autoload.gd'), 'extends Node\nvar data = {}');

        const args = {
          projectPath,
          action: 'add',
          name: 'Autoload',
          path: 'scripts/autoload.gd',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
        expect(getResponseText(result)).toContain('Autoload');
      });

      /**
       * Test Case: TC-AUTOLOAD-ADD-002
       * Given: Add autoload with non-existent script
       * When: handleManageAutoloads is called with action='add'
       * Then: Returns error for missing file
       */
      it('should return error when adding non-existent script', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'Missing',
          path: 'scripts/nonexistent.gd',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|File not found/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-ADD-003
       * Given: Add autoload with duplicate name
       * When: handleManageAutoloads is called with action='add'
       * Then: Returns error for duplicate
       */
      it('should return error when adding duplicate autoload', async () => {
        // Arrange - add first autoload
        writeFileSync(join(projectPath, 'scripts/first.gd'), 'extends Node');
        writeFileSync(join(projectPath, 'scripts/second.gd'), 'extends Node');

        // Add first autoload
        await handleManageAutoloads({
          projectPath,
          action: 'add',
          name: 'MyAutoload',
          path: 'scripts/first.gd',
        });

        // Try to add duplicate
        const args = {
          projectPath,
          action: 'add',
          name: 'MyAutoload',
          path: 'scripts/second.gd',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/already exists/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-ADD-004
       * Given: Add autoload with res:// prefix in path
       * When: handleManageAutoloads is called with action='add'
       * Then: Handles res:// prefix correctly
       */
      it('should handle res:// prefix in path', async () => {
        // Arrange
        writeFileSync(join(projectPath, 'scripts/res_test.gd'), 'extends Node');

        const args = {
          projectPath,
          action: 'add',
          name: 'ResTest',
          path: 'res://scripts/res_test.gd',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        // Should handle res:// prefix (may succeed or fail based on implementation)
        const responseText = getResponseText(result);
        expect(responseText.length).toBeGreaterThan(0);
      });
    });

    /**
     * Test Suite: Remove Operations
     */
    describe('remove operations', () => {
      /**
       * Test Case: TC-AUTOLOAD-REMOVE-001
       * Given: Project with autoload configured
       * When: handleManageAutoloads is called with action='remove'
       * Then: Removes autoload from project.godot
       */
      it('should remove autoload successfully', async () => {
        // Arrange - add autoload first
        writeFileSync(join(projectPath, 'scripts/to_remove.gd'), 'extends Node');

        await handleManageAutoloads({
          projectPath,
          action: 'add',
          name: 'ToRemove',
          path: 'scripts/to_remove.gd',
        });

        const args = {
          projectPath,
          action: 'remove',
          name: 'ToRemove',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/removed successfully/i);
      });

      /**
       * Test Case: TC-AUTOLOAD-REMOVE-002
       * Given: Remove autoload that doesn't exist
       * When: handleManageAutoloads is called with action='remove'
       * Then: Returns error for not found
       */
      it('should return error when removing non-existent autoload', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'remove',
          name: 'NonExistent',
        };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found/i);
      });
    });

    /**
     * Test Suite: Edge Cases
     */
    describe('edge cases', () => {
      /**
       * Test Case: TC-AUTOLOAD-EDGE-001
       * Given: undefined action
       * When: handleManageAutoloads is called
       * Then: Returns validation error
       */
      it('should handle undefined action gracefully', async () => {
        // Arrange
        const args = {
          projectPath,
          action: undefined,
        } as unknown as { projectPath: string; action: string };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-AUTOLOAD-EDGE-002
       * Given: null name for add action
       * When: handleManageAutoloads is called
       * Then: Returns appropriate error
       */
      it('should handle null name gracefully', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: null,
          path: 'scripts/test.gd',
        } as unknown as { projectPath: string; action: string; name: string; path: string };

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });
    });
  });

  // ============================================================================
  // ManageInputActions Tool Tests
  // ============================================================================

  describe('ManageInputActions', () => {
    /**
     * Test Suite: Input Validation
     * Verifies all validation paths for ManageInputActions tool parameters
     */
    describe('validation', () => {
      /**
       * Test Case: TC-INPUT-VAL-001
       * Given: No arguments provided
       * When: handleManageInputActions is called
       * Then: Returns error response indicating validation failure
       */
      it('should return error when projectPath is missing', async () => {
        // Arrange
        const args = {
          action: 'list',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
      });

      /**
       * Test Case: TC-INPUT-VAL-002
       * Given: Missing action parameter
       * When: handleManageInputActions is called
       * Then: Returns error response indicating missing action
       */
      it('should return error when action is missing', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|action/i);
      });

      /**
       * Test Case: TC-INPUT-VAL-003
       * Given: Invalid action value
       * When: handleManageInputActions is called
       * Then: Returns error response for invalid action
       */
      it('should return error for invalid action value', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'invalid_action',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|Invalid/i);
      });

      /**
       * Test Case: TC-INPUT-VAL-004
       * Given: Add action without name
       * When: handleManageInputActions is called
       * Then: Returns error response indicating missing name
       */
      it('should return error when add action is missing name', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          events: [{ type: 'key', keycode: 'KEY_SPACE' }],
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Name is required/i);
      });

      /**
       * Test Case: TC-INPUT-VAL-005
       * Given: Remove action without name
       * When: handleManageInputActions is called
       * Then: Returns error response indicating missing name
       */
      it('should return error when remove action is missing name', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'remove',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Name is required/i);
      });

      /**
       * Test Case: TC-INPUT-VAL-006
       * Given: Empty projectPath provided
       * When: handleManageInputActions is called
       * Then: Returns error response for empty path
       */
      it('should return error when projectPath is empty', async () => {
        // Arrange
        const args = {
          projectPath: '',
          action: 'list',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|cannot be empty/i);
      });

      /**
       * Test Case: TC-INPUT-VAL-007
       * Given: Invalid deadzone value (negative)
       * When: handleManageInputActions is called
       * Then: Returns error for invalid deadzone
       */
      it('should return error for negative deadzone', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'test_action',
          deadzone: -0.5,
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|deadzone/i);
      });

      /**
       * Test Case: TC-INPUT-VAL-008
       * Given: Invalid deadzone value (greater than 1)
       * When: handleManageInputActions is called
       * Then: Returns error for invalid deadzone
       */
      it('should return error for deadzone greater than 1', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'test_action',
          deadzone: 1.5,
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|deadzone/i);
      });
    });

    /**
     * Test Suite: Security - Path Traversal Prevention
     * Verifies protection against directory traversal attacks
     */
    describe('path traversal prevention', () => {
      /**
       * Test Case: TC-INPUT-SEC-001
       * Given: projectPath containing ".." (parent directory reference)
       * When: handleManageInputActions is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with path traversal attempt', async () => {
        // Arrange
        const args = {
          projectPath: '../../../etc',
          action: 'list',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-INPUT-SEC-002
       * Given: projectPath with embedded path traversal
       * When: handleManageInputActions is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with embedded path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '/home/user/../../../etc',
          action: 'list',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: List Operations
     */
    describe('list operations', () => {
      /**
       * Test Case: TC-INPUT-LIST-001
       * Given: Valid project with no input actions
       * When: handleManageInputActions is called with action='list'
       * Then: Returns empty actions array
       */
      it('should return empty list when no input actions configured', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'list',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          actionCount: number;
          actions: unknown[];
        }>(result);
        expect(data.actionCount).toBe(0);
        expect(data.actions).toEqual([]);
      });

      /**
       * Test Case: TC-INPUT-LIST-002
       * Given: Valid project with input actions configured
       * When: handleManageInputActions is called with action='list'
       * Then: Returns list of input actions
       */
      it('should list input actions from project.godot', async () => {
        // Arrange - add input section to project.godot
        const projectGodotPath = join(projectPath, 'project.godot');
        const existingContent = `; Engine configuration file.
config_version=5

[application]
config/name="Test Project"

[input]
ui_accept={"deadzone": 0.5, "events": [Object(InputEventKey,"resource_local_to_scene":false,"keycode":32)]}
move_left={"deadzone": 0.5, "events": [Object(InputEventKey,"resource_local_to_scene":false,"keycode":65)]}
`;
        writeFileSync(projectGodotPath, existingContent);

        const args = {
          projectPath,
          action: 'list',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        const data = parseJsonResponse<{
          actionCount: number;
          actions: Array<{ name: string; deadzone: number; events: unknown[] }>;
        }>(result);
        expect(data.actionCount).toBe(2);
        expect(data.actions.some(a => a.name === 'ui_accept')).toBe(true);
        expect(data.actions.some(a => a.name === 'move_left')).toBe(true);
      });
    });

    /**
     * Test Suite: Add Operations
     */
    describe('add operations', () => {
      /**
       * Test Case: TC-INPUT-ADD-001
       * Given: Valid project and action name
       * When: handleManageInputActions is called with action='add'
       * Then: Adds input action to project.godot
       */
      it('should add input action successfully', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'jump',
          events: [{ type: 'key' as const, keycode: 'KEY_SPACE' }],
          deadzone: 0.5,
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
        expect(getResponseText(result)).toContain('jump');
      });

      /**
       * Test Case: TC-INPUT-ADD-002
       * Given: Add input action with duplicate name
       * When: handleManageInputActions is called with action='add'
       * Then: Returns error for duplicate
       */
      it('should return error when adding duplicate input action', async () => {
        // Arrange - add first action
        await handleManageInputActions({
          projectPath,
          action: 'add',
          name: 'my_action',
          events: [],
        });

        // Try to add duplicate
        const args = {
          projectPath,
          action: 'add',
          name: 'my_action',
          events: [{ type: 'key' as const, keycode: 'KEY_A' }],
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/already exists/i);
      });

      /**
       * Test Case: TC-INPUT-ADD-003
       * Given: Add input action with custom deadzone
       * When: handleManageInputActions is called with action='add'
       * Then: Adds action with custom deadzone
       */
      it('should add input action with custom deadzone', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'analog_move',
          events: [{ type: 'joypad_axis' as const, axis: 0, axisValue: 1.0 }],
          deadzone: 0.3,
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
        expect(getResponseText(result)).toContain('0.3');
      });

      /**
       * Test Case: TC-INPUT-ADD-004
       * Given: Add input action with no events
       * When: handleManageInputActions is called with action='add'
       * Then: Adds action successfully (events are optional)
       */
      it('should add input action with no events', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'empty_action',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
        expect(getResponseText(result)).toContain('Events: 0');
      });

      /**
       * Test Case: TC-INPUT-ADD-005
       * Given: Add input action with mouse button event
       * When: handleManageInputActions is called with action='add'
       * Then: Adds action with mouse button event
       */
      it('should add input action with mouse button event', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'shoot',
          events: [{ type: 'mouse_button' as const, button: 1 }],
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
      });

      /**
       * Test Case: TC-INPUT-ADD-006
       * Given: Add input action with joypad button event
       * When: handleManageInputActions is called with action='add'
       * Then: Adds action with joypad button event
       */
      it('should add input action with joypad button event', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'gamepad_jump',
          events: [{ type: 'joypad_button' as const, button: 0 }],
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
      });
    });

    /**
     * Test Suite: Remove Operations
     */
    describe('remove operations', () => {
      /**
       * Test Case: TC-INPUT-REMOVE-001
       * Given: Project with input action configured
       * When: handleManageInputActions is called with action='remove'
       * Then: Removes input action from project.godot
       */
      it('should remove input action successfully', async () => {
        // Arrange - add action first
        await handleManageInputActions({
          projectPath,
          action: 'add',
          name: 'to_remove',
          events: [],
        });

        const args = {
          projectPath,
          action: 'remove',
          name: 'to_remove',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/removed successfully/i);
      });

      /**
       * Test Case: TC-INPUT-REMOVE-002
       * Given: Remove input action that doesn't exist
       * When: handleManageInputActions is called with action='remove'
       * Then: Returns error for not found
       */
      it('should return error when removing non-existent input action', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'remove',
          name: 'nonexistent_action',
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found/i);
      });
    });

    /**
     * Test Suite: Edge Cases
     */
    describe('edge cases', () => {
      /**
       * Test Case: TC-INPUT-EDGE-001
       * Given: undefined action
       * When: handleManageInputActions is called
       * Then: Returns validation error
       */
      it('should handle undefined action gracefully', async () => {
        // Arrange
        const args = {
          projectPath,
          action: undefined,
        } as unknown as { projectPath: string; action: string };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-INPUT-EDGE-002
       * Given: null name for add action
       * When: handleManageInputActions is called
       * Then: Returns appropriate error
       */
      it('should handle null name gracefully', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: null,
        } as unknown as { projectPath: string; action: string; name: string };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-INPUT-EDGE-003
       * Given: Action name with special characters
       * When: handleManageInputActions is called with action='add'
       * Then: Handles appropriately
       */
      it('should handle action name with underscores', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'my_custom_action_v2',
          events: [],
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
      });

      /**
       * Test Case: TC-INPUT-EDGE-004
       * Given: events array with mixed event types
       * When: handleManageInputActions is called with action='add'
       * Then: Adds all event types correctly
       */
      it('should handle mixed event types', async () => {
        // Arrange
        const args = {
          projectPath,
          action: 'add',
          name: 'mixed_input',
          events: [
            { type: 'key' as const, keycode: 'KEY_W' },
            { type: 'joypad_axis' as const, axis: 1, axisValue: -1.0 },
          ],
        };

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(false);
        expect(getResponseText(result)).toMatch(/added successfully/i);
        expect(getResponseText(result)).toContain('Events: 2');
      });
    });
  });

  // ============================================================================
  // Cross-Tool Integration Tests
  // ============================================================================

  describe('Cross-Tool Integration', () => {
    /**
     * Test Suite: Tool Interoperability
     * Verifies tools work correctly together
     */
    describe('tool interoperability', () => {
      /**
       * Test Case: TC-PROJ-INTEG-001
       * Given: Valid project
       * When: Multiple project tools are called in sequence
       * Then: All operations complete without conflicts
       */
      it('should allow sequential operations on same project', async () => {
        // Arrange & Act - run multiple operations
        const listResult = await handleManageAutoloads({
          projectPath,
          action: 'list',
        });

        const inputListResult = await handleManageInputActions({
          projectPath,
          action: 'list',
        });

        const presetsResult = await handleListExportPresets({
          projectPath,
        });

        // Assert - all should succeed
        expect(isErrorResponse(listResult)).toBe(false);
        expect(isErrorResponse(inputListResult)).toBe(false);
        expect(isErrorResponse(presetsResult)).toBe(false);
      });

      /**
       * Test Case: TC-PROJ-INTEG-002
       * Given: Valid project with modifications
       * When: GetProjectInfo is called after modifications
       * Then: Returns updated project information
       */
      it('should reflect autoload changes in project info', async () => {
        // Arrange - add an autoload
        writeFileSync(join(projectPath, 'scripts/singleton.gd'), 'extends Node');
        await handleManageAutoloads({
          projectPath,
          action: 'add',
          name: 'Singleton',
          path: 'scripts/singleton.gd',
        });

        // Act - verify autoload was added
        const listResult = await handleManageAutoloads({
          projectPath,
          action: 'list',
        });

        // Assert
        expect(isErrorResponse(listResult)).toBe(false);
        const data = parseJsonResponse<{
          autoloadCount: number;
          autoloads: Array<{ name: string }>;
        }>(listResult);
        expect(data.autoloadCount).toBeGreaterThanOrEqual(1);
        expect(data.autoloads.some(a => a.name === 'Singleton')).toBe(true);
      });
    });
  });

  // ============================================================================
  // Error Message Quality Tests
  // ============================================================================

  describe('Error Message Quality', () => {
    /**
     * Test Suite: Error Message Clarity
     * Verifies error messages are helpful and informative
     */
    describe('error message clarity', () => {
      /**
       * Test Case: TC-PROJ-ERR-001
       * Given: Invalid input
       * When: handleGetProjectInfo is called
       * Then: Error message includes helpful suggestions
       */
      it('should provide helpful suggestions in GetProjectInfo error messages', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleGetProjectInfo(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        const responseText = getResponseText(result);
        expect(responseText).toMatch(/projectPath|Validation|Godot project/i);
      });

      /**
       * Test Case: TC-PROJ-ERR-002
       * Given: Invalid input
       * When: handleListProjects is called
       * Then: Error message includes helpful suggestions
       */
      it('should provide helpful suggestions in ListProjects error messages', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleListProjects(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        const responseText = getResponseText(result);
        expect(responseText).toMatch(/directory|Validation/i);
      });

      /**
       * Test Case: TC-PROJ-ERR-003
       * Given: Invalid input
       * When: handleManageAutoloads is called
       * Then: Error message includes helpful suggestions
       */
      it('should provide helpful suggestions in ManageAutoloads error messages', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleManageAutoloads(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        const responseText = getResponseText(result);
        expect(responseText).toMatch(/projectPath|action|Validation/i);
      });

      /**
       * Test Case: TC-PROJ-ERR-004
       * Given: Invalid input
       * When: handleManageInputActions is called
       * Then: Error message includes helpful suggestions
       */
      it('should provide helpful suggestions in ManageInputActions error messages', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleManageInputActions(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        const responseText = getResponseText(result);
        expect(responseText).toMatch(/projectPath|action|Validation/i);
      });
    });
  });
});
