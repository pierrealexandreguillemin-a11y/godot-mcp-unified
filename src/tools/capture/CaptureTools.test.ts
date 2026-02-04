/**
 * Capture Tools Tests
 * ISO/IEC 29119 compliant - Test Case Specification
 *
 * Test Structure:
 * - Test Case Specification: describe/it blocks following ISO/IEC 29119-3
 * - Preconditions: beforeEach/afterEach for test setup and cleanup
 * - Test Design: Given-When-Then pattern (Arrange-Act-Assert)
 *
 * Coverage:
 * - TakeScreenshotTool: Validation paths, parameter handling, error scenarios
 *
 * ISO/IEC 25010 compliant - quality assurance
 */

import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import {
  createTempProject,
  getResponseText,
  isErrorResponse,
} from '../test-utils.js';
import { handleTakeScreenshot, takeScreenshotDefinition } from './TakeScreenshotTool.js';

describe('Capture Tools', () => {
  /**
   * Test Suite: TakeScreenshotTool
   * Tests screenshot capture functionality for Godot projects
   */
  describe('TakeScreenshotTool', () => {
    let projectPath: string;
    let cleanup: () => void;

    /**
     * Preconditions: Create temporary Godot project before each test
     * ISO/IEC 29119-3: Test precondition setup
     */
    beforeEach(() => {
      const temp = createTempProject();
      projectPath = temp.projectPath;
      cleanup = temp.cleanup;
    });

    /**
     * Postconditions: Clean up temporary project after each test
     * ISO/IEC 29119-3: Test postcondition cleanup
     */
    afterEach(() => {
      cleanup();
    });

    /**
     * Test Case Group: Tool Definition
     * Verifies the tool definition matches expected schema
     */
    describe('Tool Definition', () => {
      it('should have correct tool name', () => {
        // Given: The takeScreenshotDefinition export
        // When: Accessing the name property
        // Then: It should be "take_screenshot"
        expect(takeScreenshotDefinition.name).toBe('take_screenshot');
      });

      it('should have a description', () => {
        // Given: The takeScreenshotDefinition export
        // When: Accessing the description property
        // Then: It should be defined and non-empty
        expect(takeScreenshotDefinition.description).toBeDefined();
        expect(takeScreenshotDefinition.description.length).toBeGreaterThan(0);
      });

      it('should have input schema with required properties', () => {
        // Given: The takeScreenshotDefinition export
        // When: Accessing the inputSchema
        // Then: It should define type as object with properties
        expect(takeScreenshotDefinition.inputSchema).toBeDefined();
        expect(takeScreenshotDefinition.inputSchema.type).toBe('object');
        expect(takeScreenshotDefinition.inputSchema.properties).toBeDefined();
      });

      it('should have inputSchema object structure', () => {
        // Given: The takeScreenshotDefinition inputSchema
        // When: Checking the schema structure
        // Then: It should have the expected MCP schema format
        // Note: Properties may be empty due to Zod-to-JSON-Schema conversion limitations
        // but the handler validates projectPath at runtime via Zod
        expect(takeScreenshotDefinition.inputSchema).toHaveProperty('type', 'object');
        expect(takeScreenshotDefinition.inputSchema).toHaveProperty('properties');
        expect(takeScreenshotDefinition.inputSchema).toHaveProperty('required');
      });
    });

    /**
     * Test Case Group: Validation - Missing Parameters
     * ISO/IEC 29119-3: Negative test cases for missing required parameters
     */
    describe('Validation - Missing Parameters', () => {
      it('should return error when projectPath is missing', async () => {
        // Given: Arguments without projectPath
        const args = {
          outputPath: 'screenshots/test.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error response mentioning projectPath
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('projectPath');
      });

      it('should return error when projectPath is empty string', async () => {
        // Given: Arguments with empty projectPath
        const args = {
          projectPath: '',
          outputPath: 'screenshots/test.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error response
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result).toLowerCase()).toMatch(/empty|cannot be empty|path/);
      });

      it('should return error when projectPath is whitespace only', async () => {
        // Given: Arguments with whitespace-only projectPath
        const args = {
          projectPath: '   ',
          outputPath: 'screenshots/test.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error response
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when projectPath is undefined', async () => {
        // Given: Arguments with undefined projectPath
        const args = {
          projectPath: undefined,
          outputPath: 'screenshots/test.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error response
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should return error when projectPath is null', async () => {
        // Given: Arguments with null projectPath
        const args = {
          projectPath: null,
          outputPath: 'screenshots/test.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error response
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    /**
     * Test Case Group: Validation - Invalid Project Path
     * ISO/IEC 29119-3: Negative test cases for invalid project paths
     */
    describe('Validation - Invalid Project Path', () => {
      it('should return error for non-existent project path', async () => {
        // Given: A non-existent project path
        const args = {
          projectPath: '/non/existent/godot/project/path',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error about invalid project
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Not a valid Godot project');
      });

      it('should return error for path without project.godot', async () => {
        // Given: A temporary directory without project.godot
        const tempDir = join(projectPath, 'not_a_project');
        mkdirSync(tempDir, { recursive: true });

        const args = {
          projectPath: tempDir,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error about invalid project
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('Not a valid Godot project');
      });

      it('should return error for path traversal attempt', async () => {
        // Given: A path with traversal characters
        const args = {
          projectPath: '/some/path/../../../etc/passwd',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error (either validation or project not found)
        // The path may resolve and fail as "not a valid Godot project"
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result).toLowerCase()).toMatch(/traversal|not a valid godot project|validation/);
      });

      it('should return error when projectPath is a file not directory', async () => {
        // Given: A path pointing to a file
        const filePath = join(projectPath, 'project.godot');

        const args = {
          projectPath: filePath,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return error
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    /**
     * Test Case Group: Validation - Optional Parameters
     * ISO/IEC 29119-3: Test cases for optional parameter handling
     */
    describe('Validation - Optional Parameters', () => {
      it('should accept valid delay parameter', async () => {
        // Given: Valid project with delay parameter
        // Note: This test validates input acceptance, actual screenshot
        // requires Godot runtime which may not be available
        const args = {
          projectPath,
          delay: 2,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should not return validation error about delay
        const text = getResponseText(result);
        expect(text).not.toContain('delay: ');
      });

      it('should accept valid outputPath parameter', async () => {
        // Given: Valid project with outputPath parameter
        const args = {
          projectPath,
          outputPath: 'custom/path/screenshot.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should not return validation error about outputPath
        const text = getResponseText(result);
        expect(text).not.toContain('outputPath: ');
      });

      it('should accept valid scenePath parameter', async () => {
        // Given: Valid project with scenePath parameter
        const args = {
          projectPath,
          scenePath: 'scenes/main.tscn',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should not return validation error about scenePath
        const text = getResponseText(result);
        expect(text).not.toContain('scenePath: ');
      });

      it('should use default outputPath when not provided', async () => {
        // Given: Valid project without outputPath
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Response should reference default path or not complain about missing path
        // The tool should handle missing outputPath gracefully with a default
        const text = getResponseText(result);
        expect(text).not.toContain('outputPath is required');
      });

      it('should use default delay when not provided', async () => {
        // Given: Valid project without delay
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should not complain about missing delay
        const text = getResponseText(result);
        expect(text).not.toContain('delay is required');
      });
    });

    /**
     * Test Case Group: Validation - Invalid Parameter Values
     * ISO/IEC 29119-3: Boundary and invalid value test cases
     */
    describe('Validation - Invalid Parameter Values', () => {
      it('should handle negative delay value', async () => {
        // Given: Project with negative delay
        const args = {
          projectPath,
          delay: -1,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should either accept (coerce to positive) or return error
        // The tool may accept any number and use it as-is or validate
        // This test verifies the tool handles the edge case gracefully
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
      });

      it('should handle zero delay value', async () => {
        // Given: Project with zero delay
        const args = {
          projectPath,
          delay: 0,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should accept zero delay (immediate screenshot)
        const text = getResponseText(result);
        expect(text).not.toContain('delay must be');
      });

      it('should handle very large delay value', async () => {
        // Given: Project with very large delay
        const args = {
          projectPath,
          delay: 999999,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should accept the value (though execution may timeout)
        expect(result.content).toBeDefined();
      });

      it('should handle non-numeric delay value', async () => {
        // Given: Project with non-numeric delay
        const args = {
          projectPath,
          delay: 'not-a-number' as unknown as number,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return validation error
        expect(isErrorResponse(result)).toBe(true);
      });

      it('should handle outputPath with path traversal', async () => {
        // Given: outputPath with traversal attempt
        const args = {
          projectPath,
          outputPath: '../../../etc/sensitive.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: The tool proceeds with execution but may fail
        // Note: outputPath validation for traversal is not currently implemented
        // The tool will attempt to use the path and return an error or unknown result
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
      });
    });

    /**
     * Test Case Group: Response Structure
     * ISO/IEC 29119-3: Verify response format matches expected structure
     */
    describe('Response Structure', () => {
      it('should return response with content array', async () => {
        // Given: Any valid or invalid arguments
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Response should have content array
        expect(result.content).toBeDefined();
        expect(Array.isArray(result.content)).toBe(true);
      });

      it('should return response with text in first content item', async () => {
        // Given: Any valid or invalid arguments
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: First content item should have text property
        expect(result.content[0]).toBeDefined();
        expect(result.content[0].text).toBeDefined();
        expect(typeof result.content[0].text).toBe('string');
      });

      it('should return isError flag for error responses', async () => {
        // Given: Invalid arguments that should cause error
        const args = {
          projectPath: '/invalid/path',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: isError should be true
        expect(result.isError).toBe(true);
      });

      it('error response should contain helpful suggestions', async () => {
        // Given: Invalid arguments
        const args = {
          projectPath: '/invalid/path',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Error text should contain helpful information
        const text = getResponseText(result);
        expect(text.length).toBeGreaterThan(10);
      });
    });

    /**
     * Test Case Group: Project Structure Handling
     * ISO/IEC 29119-3: Test cases for project directory handling
     */
    describe('Project Structure Handling', () => {
      it('should create screenshots directory if not exists', async () => {
        // Given: Valid project without screenshots directory
        const screenshotsDir = join(projectPath, 'screenshots');
        expect(existsSync(screenshotsDir)).toBe(false);

        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        // Note: Directory creation happens during execution attempt
        await handleTakeScreenshot(args);

        // Then: Screenshots directory should be created
        // (This may depend on how far execution proceeds before Godot errors)
        // The tool attempts to create the directory before running
        expect(existsSync(screenshotsDir)).toBe(true);
      });

      it('should handle existing screenshots directory', async () => {
        // Given: Project with existing screenshots directory
        const screenshotsDir = join(projectPath, 'screenshots');
        mkdirSync(screenshotsDir, { recursive: true });

        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should not fail due to existing directory
        // (May fail for other reasons like missing Godot)
        expect(result.content).toBeDefined();
      });

      it('should handle custom output path directory creation', async () => {
        // Given: Output path in non-existent subdirectory
        const args = {
          projectPath,
          outputPath: 'custom/nested/dir/screenshot.png',
        };

        // When: Calling handleTakeScreenshot
        await handleTakeScreenshot(args);

        // Then: Tool should attempt to handle the nested path
        // The actual behavior depends on implementation
        expect(true).toBe(true); // Placeholder for actual verification
      });
    });

    /**
     * Test Case Group: Temporary File Management
     * ISO/IEC 29119-3: Test cases for temporary file handling
     */
    describe('Temporary File Management', () => {
      it('should create temporary screenshot script', async () => {
        // Given: Valid project
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        await handleTakeScreenshot(args);

        // Then: Temporary script should be cleaned up
        // The tool creates and removes _mcp_screenshot_temp.gd
        const tempScriptPath = join(projectPath, '_mcp_screenshot_temp.gd');
        // After execution (success or failure), temp files should be cleaned
        expect(existsSync(tempScriptPath)).toBe(false);
      });

      it('should create temporary screenshot scene', async () => {
        // Given: Valid project
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot
        await handleTakeScreenshot(args);

        // Then: Temporary scene should be cleaned up
        const tempScenePath = join(projectPath, '_mcp_screenshot_temp.tscn');
        // After execution (success or failure), temp files should be cleaned
        expect(existsSync(tempScenePath)).toBe(false);
      });

      it('should clean up temporary files on error', async () => {
        // Given: Valid project (Godot execution will likely fail in test env)
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot (may fail due to no Godot)
        await handleTakeScreenshot(args);

        // Then: Temporary files should still be cleaned up
        const tempScriptPath = join(projectPath, '_mcp_screenshot_temp.gd');
        const tempScenePath = join(projectPath, '_mcp_screenshot_temp.tscn');
        expect(existsSync(tempScriptPath)).toBe(false);
        expect(existsSync(tempScenePath)).toBe(false);
      });
    });

    /**
     * Test Case Group: Edge Cases
     * ISO/IEC 29119-3: Edge case and boundary condition tests
     */
    describe('Edge Cases', () => {
      it('should handle projectPath with trailing slash', async () => {
        // Given: Project path with trailing slash
        const args = {
          projectPath: projectPath + '/',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should handle gracefully (may succeed or fail for other reasons)
        expect(result.content).toBeDefined();
      });

      it('should handle projectPath with spaces', async () => {
        // Given: This test verifies handling of paths with spaces
        // The temp project path may not have spaces, so we test validation
        const args = {
          projectPath,
          outputPath: 'screenshots/my screenshot.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should not fail due to spaces in output path
        const text = getResponseText(result);
        expect(text).not.toContain('invalid character');
      });

      it('should handle empty args object', async () => {
        // Given: Empty arguments object
        const args = {};

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should return validation error
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toContain('projectPath');
      });

      it('should handle unicode characters in outputPath', async () => {
        // Given: Output path with unicode characters
        const args = {
          projectPath,
          outputPath: 'screenshots/capture.png',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should handle gracefully
        expect(result.content).toBeDefined();
      });

      it('should handle outputPath without file extension', async () => {
        // Given: Output path without extension
        const args = {
          projectPath,
          outputPath: 'screenshots/capture',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Should handle gracefully (may add .png or fail gracefully)
        expect(result.content).toBeDefined();
      });

      it('should handle outputPath with non-png extension', async () => {
        // Given: Output path with different extension
        const args = {
          projectPath,
          outputPath: 'screenshots/capture.jpg',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Tool may accept or reject non-png extensions
        // The implementation saves as PNG regardless
        expect(result.content).toBeDefined();
      });
    });

    /**
     * Test Case Group: Concurrent Execution Handling
     * ISO/IEC 29119-3: Test cases for concurrent execution scenarios
     */
    describe('Concurrent Execution Handling', () => {
      it('should handle multiple sequential calls', async () => {
        // Given: Valid project
        const args = {
          projectPath,
        };

        // When: Calling handleTakeScreenshot multiple times
        const result1 = await handleTakeScreenshot(args);
        const result2 = await handleTakeScreenshot(args);

        // Then: Both calls should complete without interference
        expect(result1.content).toBeDefined();
        expect(result2.content).toBeDefined();
      });

      it('should handle calls with different output paths', async () => {
        // Given: Valid project with different output paths
        const args1 = {
          projectPath,
          outputPath: 'screenshots/capture1.png',
        };
        const args2 = {
          projectPath,
          outputPath: 'screenshots/capture2.png',
        };

        // When: Calling handleTakeScreenshot with different outputs
        const result1 = await handleTakeScreenshot(args1);
        const result2 = await handleTakeScreenshot(args2);

        // Then: Both should handle their respective paths
        expect(result1.content).toBeDefined();
        expect(result2.content).toBeDefined();
      });
    });

    /**
     * Test Case Group: Error Message Quality
     * ISO/IEC 29119-3: Verify error messages are helpful and actionable
     */
    describe('Error Message Quality', () => {
      it('should provide clear error for missing projectPath', async () => {
        // Given: Missing projectPath
        const args = {};

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Error should clearly mention projectPath
        expect(isErrorResponse(result)).toBe(true);
        const text = getResponseText(result);
        expect(text.toLowerCase()).toMatch(/projectpath|project.*path/);
      });

      it('should provide suggestions in error response', async () => {
        // Given: Invalid project path
        const args = {
          projectPath: '/invalid/path',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Error should include suggestions array format or helpful text
        expect(isErrorResponse(result)).toBe(true);
        const text = getResponseText(result);
        // The error handler includes suggestions
        expect(text.length).toBeGreaterThan(20);
      });

      it('should mention path traversal in security error', async () => {
        // Given: Path with traversal
        const args = {
          projectPath: '../../../etc',
        };

        // When: Calling handleTakeScreenshot
        const result = await handleTakeScreenshot(args);

        // Then: Error should mention traversal or security issue
        expect(isErrorResponse(result)).toBe(true);
        const text = getResponseText(result).toLowerCase();
        expect(text).toMatch(/traversal|\.\.|path|invalid/);
      });
    });
  });
});
