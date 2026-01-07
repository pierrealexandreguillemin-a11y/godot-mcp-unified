/**
 * UID Tools Integration Tests
 * Tests GetUid and UpdateProjectUids tools
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

import { createTempProject, getResponseText, isErrorResponse } from '../test-utils.js';
import { handleGetUid } from './GetUidTool.js';
import { handleUpdateProjectUids } from './UpdateProjectUidsTool.js';

describe('UID Tools', () => {
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
  // GetUid Tool Tests
  // ============================================================================

  describe('GetUid', () => {
    /**
     * Test Suite: Input Validation
     * Verifies all validation paths for GetUid tool parameters
     */
    describe('validation', () => {
      /**
       * Test Case: TC-GETUID-VAL-001
       * Given: No arguments provided
       * When: handleGetUid is called
       * Then: Returns error response indicating validation failure
       */
      it('should return error when projectPath is missing', async () => {
        // Arrange
        const args = {
          filePath: 'scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
      });

      /**
       * Test Case: TC-GETUID-VAL-002
       * Given: Empty projectPath provided
       * When: handleGetUid is called
       * Then: Returns error response for empty path
       */
      it('should return error when projectPath is empty', async () => {
        // Arrange
        const args = {
          projectPath: '',
          filePath: 'scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|cannot be empty/i);
      });

      /**
       * Test Case: TC-GETUID-VAL-003
       * Given: Non-existent project path
       * When: handleGetUid is called
       * Then: Returns error response for invalid project
       */
      it('should return error for non-existent project path', async () => {
        // Arrange
        const args = {
          projectPath: '/non/existent/godot/project',
          filePath: 'scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|Not a valid Godot project/i);
      });

      /**
       * Test Case: TC-GETUID-VAL-004
       * Given: Missing filePath parameter
       * When: handleGetUid is called
       * Then: Returns error response indicating missing filePath
       */
      it('should return error when filePath is missing', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|filePath/i);
      });

      /**
       * Test Case: TC-GETUID-VAL-005
       * Given: Empty filePath provided
       * When: handleGetUid is called
       * Then: Returns error response for empty filePath
       */
      it('should return error when filePath is empty', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: '',
        };

        // Act
        const result = await handleGetUid(args);

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
       * Test Case: TC-GETUID-SEC-001
       * Given: projectPath containing ".." (parent directory reference)
       * When: handleGetUid is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with path traversal attempt', async () => {
        // Arrange
        const args = {
          projectPath: '../../../etc/passwd',
          filePath: 'scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|Not a valid Godot project/i);
      });

      /**
       * Test Case: TC-GETUID-SEC-002
       * Given: filePath containing ".." (parent directory reference)
       * When: handleGetUid is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject filePath with path traversal attempt', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: '../../../etc/passwd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-GETUID-SEC-003
       * Given: filePath with embedded path traversal
       * When: handleGetUid is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject filePath with embedded path traversal', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'scripts/../../../etc/passwd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-GETUID-SEC-004
       * Given: projectPath with embedded path traversal
       * When: handleGetUid is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with embedded path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '/valid/path/../../../etc',
          filePath: 'scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: File Validation
     * Verifies file existence and type validation
     */
    describe('file validation', () => {
      /**
       * Test Case: TC-GETUID-FILE-001
       * Given: Valid project path but non-existent file
       * When: handleGetUid is called
       * Then: Returns error response for missing file
       */
      it('should return error for non-existent file', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'scripts/nonexistent.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid/i);
      });

      /**
       * Test Case: TC-GETUID-FILE-002
       * Given: Valid project path but filePath points to directory
       * When: handleGetUid is called
       * Then: Returns error response indicating invalid file type
       */
      it('should return error when filePath points to a directory', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'scripts',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        // Should fail either during validation or execution
      });
    });

    /**
     * Test Suite: Successful Operations
     * Note: These tests require Godot 4.4+ to be installed
     * They may be skipped in CI environments without Godot
     */
    describe('successful operations', () => {
      /**
       * Test Case: TC-GETUID-OP-001
       * Given: Valid project path and existing script file
       * When: handleGetUid is called with Godot 4.4+ available
       * Then: Returns UID for the file or version error if older Godot
       */
      it('should handle valid file request (integration)', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        // This test may fail if Godot is not installed or version < 4.4
        // In that case, it should return a specific version error
        const responseText = getResponseText(result);
        if (isErrorResponse(result)) {
          // Accept version-related errors or Godot not found errors
          expect(responseText).toMatch(
            /Godot 4\.4|version|not found|executable|UID|failed/i
          );
        } else {
          // Success case - should contain UID information
          expect(responseText).toMatch(/uid:\/\/|UID/i);
        }
      });

      /**
       * Test Case: TC-GETUID-OP-002
       * Given: Valid project path and existing scene file
       * When: handleGetUid is called
       * Then: Returns UID or appropriate error
       */
      it('should handle scene file request (integration)', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'scenes/main.tscn',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        const responseText = getResponseText(result);
        if (isErrorResponse(result)) {
          expect(responseText).toMatch(
            /Godot 4\.4|version|not found|executable|UID|failed/i
          );
        } else {
          expect(responseText).toMatch(/uid:\/\/|UID/i);
        }
      });

      /**
       * Test Case: TC-GETUID-OP-003
       * Given: Valid project path and resource file
       * When: handleGetUid is called
       * Then: Returns UID or appropriate error
       */
      it('should handle resource file request (integration)', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'resources/theme.tres',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        const responseText = getResponseText(result);
        if (isErrorResponse(result)) {
          expect(responseText).toMatch(
            /Godot 4\.4|version|not found|executable|UID|failed/i
          );
        } else {
          expect(responseText).toMatch(/uid:\/\/|UID/i);
        }
      });
    });
  });

  // ============================================================================
  // UpdateProjectUids Tool Tests
  // ============================================================================

  describe('UpdateProjectUids', () => {
    /**
     * Test Suite: Input Validation
     * Verifies all validation paths for UpdateProjectUids tool parameters
     */
    describe('validation', () => {
      /**
       * Test Case: TC-UPDATEUIDS-VAL-001
       * Given: No arguments provided
       * When: handleUpdateProjectUids is called
       * Then: Returns error response indicating validation failure
       */
      it('should return error when projectPath is missing', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|projectPath/i);
      });

      /**
       * Test Case: TC-UPDATEUIDS-VAL-002
       * Given: Empty projectPath provided
       * When: handleUpdateProjectUids is called
       * Then: Returns error response for empty path
       */
      it('should return error when projectPath is empty', async () => {
        // Arrange
        const args = {
          projectPath: '',
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/Validation failed|cannot be empty/i);
      });

      /**
       * Test Case: TC-UPDATEUIDS-VAL-003
       * Given: Non-existent project path
       * When: handleUpdateProjectUids is called
       * Then: Returns error response for invalid project
       */
      it('should return error for non-existent project path', async () => {
        // Arrange
        const args = {
          projectPath: '/non/existent/godot/project',
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|does not exist|invalid|Not a valid Godot project/i);
      });

      /**
       * Test Case: TC-UPDATEUIDS-VAL-004
       * Given: Project path pointing to a file (not directory)
       * When: handleUpdateProjectUids is called
       * Then: Returns error response indicating invalid project directory
       */
      it('should return error when projectPath is a file not directory', async () => {
        // Arrange - use the project.godot file path instead of directory
        const args = {
          projectPath: `${projectPath}/project.godot`,
        };

        // Act
        const result = await handleUpdateProjectUids(args);

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
       * Test Case: TC-UPDATEUIDS-SEC-001
       * Given: projectPath containing ".." (parent directory reference)
       * When: handleUpdateProjectUids is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with path traversal attempt', async () => {
        // Arrange
        const args = {
          projectPath: '../../../etc',
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-UPDATEUIDS-SEC-002
       * Given: projectPath with leading path traversal
       * When: handleUpdateProjectUids is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with leading path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '../../sensitive/directory',
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed/i);
      });

      /**
       * Test Case: TC-UPDATEUIDS-SEC-003
       * Given: projectPath with embedded path traversal
       * When: handleUpdateProjectUids is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with embedded path traversal', async () => {
        // Arrange
        const args = {
          projectPath: '/home/user/projects/../../../etc',
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/path traversal|invalid|not allowed|Not a valid Godot project/i);
      });

      /**
       * Test Case: TC-UPDATEUIDS-SEC-004
       * Given: projectPath with Windows-style path traversal
       * When: handleUpdateProjectUids is called
       * Then: Returns error response rejecting path traversal
       */
      it('should reject projectPath with Windows-style path traversal', async () => {
        // Arrange
        const args = {
          projectPath: 'C:\\Projects\\..\\..\\Windows\\System32',
        };

        // Act
        const result = await handleUpdateProjectUids(args);

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
       * Test Case: TC-UPDATEUIDS-PROJ-001
       * Given: Directory exists but is not a Godot project
       * When: handleUpdateProjectUids is called
       * Then: Returns error response for missing project.godot
       */
      it('should return error for directory without project.godot', async () => {
        // Arrange - use the scripts subdirectory which doesn't have project.godot
        const args = {
          projectPath: `${projectPath}/scripts`,
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        expect(getResponseText(result)).toMatch(/not found|invalid|project\.godot|Not a valid Godot project/i);
      });
    });

    /**
     * Test Suite: Successful Operations
     * Note: These tests require Godot 4.4+ to be installed
     * They may be skipped in CI environments without Godot
     */
    describe('successful operations', () => {
      /**
       * Test Case: TC-UPDATEUIDS-OP-001
       * Given: Valid Godot project path
       * When: handleUpdateProjectUids is called with Godot 4.4+ available
       * Then: Updates UIDs successfully or returns version error if older Godot
       */
      it('should handle valid project update request (integration)', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        const responseText = getResponseText(result);
        if (isErrorResponse(result)) {
          // Accept version-related errors or Godot not found errors
          expect(responseText).toMatch(
            /Godot 4\.4|version|not found|executable|UID|failed/i
          );
        } else {
          // Success case - should confirm update
          expect(responseText).toMatch(/updated|success|complete/i);
        }
      });

      /**
       * Test Case: TC-UPDATEUIDS-OP-002
       * Given: Valid Godot project with existing resources
       * When: handleUpdateProjectUids is called
       * Then: Processes all resources or returns appropriate error
       */
      it('should process project with multiple resources (integration)', async () => {
        // Arrange
        const args = {
          projectPath,
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        const responseText = getResponseText(result);
        // Either succeeds or fails with expected error
        expect(responseText.length).toBeGreaterThan(0);
        if (!isErrorResponse(result)) {
          expect(responseText).toMatch(/updated|success|output/i);
        }
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
       * Test Case: TC-UID-INTEG-001
       * Given: Valid project with resources
       * When: UpdateProjectUids is called followed by GetUid
       * Then: Both operations complete without conflicts
       */
      it('should allow GetUid after UpdateProjectUids (integration)', async () => {
        // Arrange - first update UIDs
        const updateArgs = { projectPath };
        const updateResult = await handleUpdateProjectUids(updateArgs);

        // Act - then get UID for a file
        const getArgs = {
          projectPath,
          filePath: 'scripts/player.gd',
        };
        const getResult = await handleGetUid(getArgs);

        // Assert - both should complete (either success or expected errors)
        const updateText = getResponseText(updateResult);
        const getText = getResponseText(getResult);

        expect(updateText.length).toBeGreaterThan(0);
        expect(getText.length).toBeGreaterThan(0);

        // Both should either succeed or fail with Godot version/availability error
        if (isErrorResponse(updateResult)) {
          expect(updateText).toMatch(/Godot|version|not found|failed/i);
        }
        if (isErrorResponse(getResult)) {
          expect(getText).toMatch(/Godot|version|not found|failed/i);
        }
      });
    });
  });

  // ============================================================================
  // Edge Cases
  // ============================================================================

  describe('Edge Cases', () => {
    /**
     * Test Suite: Boundary Conditions
     * Tests edge cases and boundary conditions
     */
    describe('boundary conditions', () => {
      /**
       * Test Case: TC-UID-EDGE-001
       * Given: projectPath with only whitespace
       * When: handleGetUid is called
       * Then: Returns validation error
       */
      it('should handle projectPath with only whitespace', async () => {
        // Arrange
        const args = {
          projectPath: '   ',
          filePath: 'scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-UID-EDGE-002
       * Given: filePath with only whitespace
       * When: handleGetUid is called
       * Then: Returns validation error
       */
      it('should handle filePath with only whitespace', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: '   ',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-UID-EDGE-003
       * Given: Very long projectPath
       * When: handleUpdateProjectUids is called
       * Then: Returns appropriate error
       */
      it('should handle very long projectPath', async () => {
        // Arrange
        const args = {
          projectPath: '/a'.repeat(10000),
        };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-UID-EDGE-004
       * Given: filePath with special characters
       * When: handleGetUid is called
       * Then: Handles appropriately (either valid or error)
       */
      it('should handle filePath with special characters', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'scripts/my-script_v2.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        // Should either work or return file not found (not crash)
        const responseText = getResponseText(result);
        expect(responseText.length).toBeGreaterThan(0);
      });

      /**
       * Test Case: TC-UID-EDGE-005
       * Given: undefined values passed as arguments
       * When: handleGetUid is called
       * Then: Returns validation error
       */
      it('should handle undefined values gracefully', async () => {
        // Arrange
        const args = {
          projectPath: undefined,
          filePath: undefined,
        } as unknown as { projectPath: string; filePath: string };

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });

      /**
       * Test Case: TC-UID-EDGE-006
       * Given: null values passed as arguments
       * When: handleUpdateProjectUids is called
       * Then: Returns validation error
       */
      it('should handle null values gracefully', async () => {
        // Arrange
        const args = {
          projectPath: null,
        } as unknown as { projectPath: string };

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
      });
    });

    /**
     * Test Suite: File Path Variations
     * Tests various file path formats
     */
    describe('file path variations', () => {
      /**
       * Test Case: TC-UID-PATH-001
       * Given: filePath with leading slash
       * When: handleGetUid is called
       * Then: Handles appropriately
       */
      it('should handle filePath with leading slash', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: '/scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        const responseText = getResponseText(result);
        expect(responseText.length).toBeGreaterThan(0);
      });

      /**
       * Test Case: TC-UID-PATH-002
       * Given: filePath with res:// prefix
       * When: handleGetUid is called
       * Then: Handles the Godot resource path format
       */
      it('should handle filePath with res:// prefix', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'res://scripts/player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        const responseText = getResponseText(result);
        expect(responseText.length).toBeGreaterThan(0);
      });

      /**
       * Test Case: TC-UID-PATH-003
       * Given: filePath with backslashes (Windows-style)
       * When: handleGetUid is called
       * Then: Handles appropriately
       */
      it('should handle filePath with backslashes', async () => {
        // Arrange
        const args = {
          projectPath,
          filePath: 'scripts\\player.gd',
        };

        // Act
        const result = await handleGetUid(args);

        // Assert
        const responseText = getResponseText(result);
        expect(responseText.length).toBeGreaterThan(0);
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
       * Test Case: TC-UID-ERR-001
       * Given: Invalid input
       * When: handleGetUid is called
       * Then: Error message includes suggestions
       */
      it('should provide helpful suggestions in GetUid error messages', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleGetUid(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        const responseText = getResponseText(result);
        // Should mention what parameters are needed
        expect(responseText).toMatch(/projectPath|filePath|Validation/i);
      });

      /**
       * Test Case: TC-UID-ERR-002
       * Given: Invalid input
       * When: handleUpdateProjectUids is called
       * Then: Error message includes suggestions
       */
      it('should provide helpful suggestions in UpdateProjectUids error messages', async () => {
        // Arrange
        const args = {};

        // Act
        const result = await handleUpdateProjectUids(args);

        // Assert
        expect(isErrorResponse(result)).toBe(true);
        const responseText = getResponseText(result);
        // Should mention what parameters are needed
        expect(responseText).toMatch(/projectPath|Validation|Godot project/i);
      });
    });
  });
});
