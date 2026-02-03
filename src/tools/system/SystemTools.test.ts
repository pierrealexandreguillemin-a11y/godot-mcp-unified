/**
 * System Tools Test Suite
 *
 * ISO/IEC 29119 Test Documentation Compliance:
 * - Test Case Specification: Organized in describe/it blocks with clear naming
 * - Preconditions: Established in beforeEach/afterEach hooks
 * - Test Pattern: Given-When-Then (Arrange-Act-Assert)
 *
 * ISO/IEC 25010 Quality Characteristics:
 * - Functional Suitability: Tests all validation and execution paths
 * - Reliability: Verifies error handling and edge cases
 * - Maintainability: Clear structure with reusable fixtures
 *
 * Test Coverage:
 * - GetGodotVersionTool: Version detection and error handling
 */

import { jest, describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { getResponseText, isErrorResponse } from '../test-utils.js';

// Helper to get all text content from response (including suggestions)
const getAllResponseText = (response: { content: Array<{ text: string }> }): string => {
  return response.content.map((c) => c.text).join('\n');
};

// Create mock functions before mocking modules
const mockDetectGodotPath = jest.fn<() => Promise<string | null>>();
const mockGetGodotVersion = jest.fn<(godotPath: string) => Promise<string>>();
const mockIsValidGodotPath = jest.fn<(path: string) => Promise<boolean>>();

// Mock the dependencies using unstable_mockModule for ESM support
// PathManager needs all exports that transitive imports might use
jest.unstable_mockModule('../../core/PathManager.js', () => ({
  detectGodotPath: mockDetectGodotPath,
  validatePath: jest.fn(() => true),
  normalizePath: jest.fn((p: string) => p),
  normalizeHandlerPaths: jest.fn(<T>(args: T) => args),
  isValidGodotPathSync: jest.fn(() => true),
  isValidGodotPath: mockIsValidGodotPath,
  getPlatformGodotPaths: jest.fn(() => []),
  clearPathCache: jest.fn(),
  getPathCacheStats: jest.fn(() => ({ hits: 0, misses: 0, size: 0 })),
}));

jest.unstable_mockModule('../../core/GodotExecutor.js', () => ({
  getGodotVersion: mockGetGodotVersion,
  isGodot44OrLater: jest.fn(() => false),
  executeOperation: jest.fn(),
}));

// Dynamic import after mocking
const { getGodotVersionDefinition, handleGetGodotVersion } = await import('./GetGodotVersionTool.js');
const { systemHealthDefinition, handleSystemHealth } = await import('./SystemHealthTool.js');

describe('GetGodotVersionTool', () => {
  /**
   * Test Suite ID: TS-SYSTEM-001
   * Test Suite Name: GetGodotVersion Tool Tests
   * Purpose: Verify the GetGodotVersion tool correctly retrieves Godot version
   *          and handles error conditions appropriately
   */

  // Preconditions: Reset all mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Cleanup: Ensure mocks are reset after each test
  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Tool Definition', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-DEF-001
     * Test Case Name: Tool definition should have correct name
     * Priority: High
     */
    it('should have correct tool name', () => {
      // Given: The tool definition is exported
      // When: We access the tool name
      const name = getGodotVersionDefinition.name;

      // Then: The name should be 'get_godot_version'
      expect(name).toBe('get_godot_version');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-DEF-002
     * Test Case Name: Tool definition should have a description
     * Priority: Medium
     */
    it('should have a description', () => {
      // Given: The tool definition is exported
      // When: We access the description
      const description = getGodotVersionDefinition.description;

      // Then: The description should be defined and non-empty
      expect(description).toBeDefined();
      expect(description.length).toBeGreaterThan(0);
      expect(description).toContain('Godot');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-DEF-003
     * Test Case Name: Tool definition should have valid input schema
     * Priority: Medium
     */
    it('should have valid input schema', () => {
      // Given: The tool definition is exported
      // When: We access the input schema
      const inputSchema = getGodotVersionDefinition.inputSchema;

      // Then: The schema should be a valid object schema (empty for this tool)
      expect(inputSchema).toBeDefined();
      expect(inputSchema.type).toBe('object');
    });
  });

  describe('Successful Execution', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-EXEC-001
     * Test Case Name: Should return Godot version when path is detected
     * Priority: Critical
     * Preconditions: Valid Godot path is detected
     */
    it('should return Godot version when path is detected', async () => {
      // Given: A valid Godot path and version
      const mockPath = '/usr/bin/godot';
      const mockVersion = '4.2.1.stable';
      mockDetectGodotPath.mockResolvedValue(mockPath);
      mockGetGodotVersion.mockResolvedValue(mockVersion);

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The result should contain the version
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe(mockVersion);
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EXEC-002
     * Test Case Name: Should handle various version formats
     * Priority: High
     */
    it('should handle standard stable version format', async () => {
      // Given: A standard stable version
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.2.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.2.stable');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EXEC-003
     * Test Case Name: Should handle beta version format
     * Priority: Medium
     */
    it('should handle beta version format', async () => {
      // Given: A beta version
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.3.beta2');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.3.beta2');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EXEC-004
     * Test Case Name: Should handle RC version format
     * Priority: Medium
     */
    it('should handle release candidate version format', async () => {
      // Given: An RC version
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.3.rc1');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.3.rc1');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EXEC-005
     * Test Case Name: Should handle dev version format
     * Priority: Low
     */
    it('should handle dev version format', async () => {
      // Given: A dev version
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.4.dev.custom_build');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.4.dev.custom_build');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EXEC-006
     * Test Case Name: Should call detectGodotPath with no arguments
     * Priority: Medium
     */
    it('should call detectGodotPath with no arguments', async () => {
      // Given: Mocked functions
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.2.1.stable');

      // When: We call handleGetGodotVersion
      await handleGetGodotVersion();

      // Then: detectGodotPath should be called without arguments
      expect(mockDetectGodotPath).toHaveBeenCalledTimes(1);
      expect(mockDetectGodotPath).toHaveBeenCalledWith();
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EXEC-007
     * Test Case Name: Should pass detected path to getGodotVersion
     * Priority: Medium
     */
    it('should pass detected path to getGodotVersion', async () => {
      // Given: A specific path is detected
      const expectedPath = '/custom/path/to/godot';
      mockDetectGodotPath.mockResolvedValue(expectedPath);
      mockGetGodotVersion.mockResolvedValue('4.2.stable');

      // When: We call handleGetGodotVersion
      await handleGetGodotVersion();

      // Then: getGodotVersion should be called with the detected path
      expect(mockGetGodotVersion).toHaveBeenCalledTimes(1);
      expect(mockGetGodotVersion).toHaveBeenCalledWith(expectedPath);
    });
  });

  describe('Error Handling - Path Detection', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-ERR-001
     * Test Case Name: Should return error when Godot path is not found
     * Priority: Critical
     * Preconditions: detectGodotPath returns null
     */
    it('should return error when Godot path is not found (null)', async () => {
      // Given: No Godot path is detected
      mockDetectGodotPath.mockResolvedValue(null);

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: An error should be returned with helpful suggestions
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Could not find a valid Godot executable path');
      // Suggestions are in a separate content item
      expect(getAllResponseText(result)).toContain('GODOT_PATH');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-ERR-002
     * Test Case Name: Should provide installation suggestion when path not found
     * Priority: Medium
     */
    it('should provide installation suggestion when path not found', async () => {
      // Given: No Godot path is detected
      mockDetectGodotPath.mockResolvedValue(null);

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The error should suggest installation (in suggestions content item)
      expect(isErrorResponse(result)).toBe(true);
      expect(getAllResponseText(result)).toContain('Ensure Godot is installed correctly');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-ERR-003
     * Test Case Name: Should not call getGodotVersion when path is null
     * Priority: Medium
     */
    it('should not call getGodotVersion when path is null', async () => {
      // Given: No Godot path is detected
      mockDetectGodotPath.mockResolvedValue(null);

      // When: We call handleGetGodotVersion
      await handleGetGodotVersion();

      // Then: getGodotVersion should not be called
      expect(mockGetGodotVersion).not.toHaveBeenCalled();
    });
  });

  describe('Error Handling - Version Retrieval', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-ERR-004
     * Test Case Name: Should handle error when getGodotVersion throws
     * Priority: Critical
     */
    it('should handle error when getGodotVersion throws Error', async () => {
      // Given: Path is detected but version retrieval fails
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue(new Error('Execution failed'));

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: An error should be returned
      expect(isErrorResponse(result)).toBe(true);
      const responseText = getResponseText(result);
      expect(responseText).toContain('Failed to get Godot version');
      expect(responseText).toContain('Execution failed');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-ERR-005
     * Test Case Name: Should handle non-Error thrown values
     * Priority: Medium
     */
    it('should handle non-Error thrown values', async () => {
      // Given: Path is detected but version retrieval throws a string
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue('String error');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: An error should be returned with 'Unknown error'
      expect(isErrorResponse(result)).toBe(true);
      const responseText = getResponseText(result);
      expect(responseText).toContain('Failed to get Godot version');
      expect(responseText).toContain('Unknown error');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-ERR-006
     * Test Case Name: Should handle timeout errors
     * Priority: Medium
     */
    it('should handle timeout errors', async () => {
      // Given: Path is detected but version retrieval times out
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue(new Error('Command timed out after 10000ms'));

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: An error should be returned mentioning the timeout
      expect(isErrorResponse(result)).toBe(true);
      const responseText = getResponseText(result);
      expect(responseText).toContain('timed out');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-ERR-007
     * Test Case Name: Should handle permission errors
     * Priority: Medium
     */
    it('should handle permission errors', async () => {
      // Given: Path is detected but execution fails due to permissions
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue(new Error('EACCES: permission denied'));

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: An error should be returned
      expect(isErrorResponse(result)).toBe(true);
      const responseText = getResponseText(result);
      expect(responseText).toContain('permission denied');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-ERR-008
     * Test Case Name: Should handle file not found errors
     * Priority: Medium
     */
    it('should handle file not found errors', async () => {
      // Given: Path is detected but executable is not found
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue(new Error('ENOENT: no such file or directory'));

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: An error should be returned
      expect(isErrorResponse(result)).toBe(true);
      const responseText = getResponseText(result);
      expect(responseText).toContain('no such file');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-ERR-009
     * Test Case Name: Should provide GODOT_PATH suggestion on version error
     * Priority: Medium
     */
    it('should provide GODOT_PATH suggestion on version error', async () => {
      // Given: Path is detected but version retrieval fails
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue(new Error('Any error'));

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The error should suggest checking GODOT_PATH (in suggestions content item)
      expect(isErrorResponse(result)).toBe(true);
      expect(getAllResponseText(result)).toContain('GODOT_PATH');
    });
  });

  describe('Error Handling - Path Detection Errors', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-ERR-010
     * Test Case Name: Should handle detectGodotPath throwing an error
     * Priority: High
     */
    it('should handle detectGodotPath throwing an error', async () => {
      // Given: detectGodotPath throws an error
      mockDetectGodotPath.mockRejectedValue(new Error('Path detection failed'));

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: An error should be returned
      expect(isErrorResponse(result)).toBe(true);
      const responseText = getResponseText(result);
      expect(responseText).toContain('Failed to get Godot version');
      expect(responseText).toContain('Path detection failed');
    });
  });

  describe('Response Format', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-FMT-001
     * Test Case Name: Successful response should have correct structure
     * Priority: High
     */
    it('should return response with correct content structure', async () => {
      // Given: Valid path and version
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.2.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: Response should have proper structure
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type', 'text');
      expect(result.content[0]).toHaveProperty('text');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-FMT-002
     * Test Case Name: Error response should have isError flag
     * Priority: High
     */
    it('should set isError flag on error response', async () => {
      // Given: No Godot path is detected
      mockDetectGodotPath.mockResolvedValue(null);

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: Response should have isError = true
      expect(result.isError).toBe(true);
    });

    /**
     * Test Case ID: TC-SYSTEM-001-FMT-003
     * Test Case Name: Success response should not have isError flag
     * Priority: Medium
     */
    it('should not set isError flag on successful response', async () => {
      // Given: Valid path and version
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.2.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: Response should not have isError or it should be undefined/false
      expect(result.isError).toBeUndefined();
    });
  });

  describe('Platform-Specific Paths', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-PLAT-001
     * Test Case Name: Should work with Windows path format
     * Priority: Medium
     */
    it('should work with Windows path format', async () => {
      // Given: A Windows path is detected
      mockDetectGodotPath.mockResolvedValue('C:\\Program Files\\Godot\\Godot.exe');
      mockGetGodotVersion.mockResolvedValue('4.2.1.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.2.1.stable');
      expect(mockGetGodotVersion).toHaveBeenCalledWith('C:\\Program Files\\Godot\\Godot.exe');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-PLAT-002
     * Test Case Name: Should work with macOS app bundle path format
     * Priority: Medium
     */
    it('should work with macOS app bundle path format', async () => {
      // Given: A macOS app bundle path is detected
      mockDetectGodotPath.mockResolvedValue('/Applications/Godot.app/Contents/MacOS/Godot');
      mockGetGodotVersion.mockResolvedValue('4.2.1.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.2.1.stable');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-PLAT-003
     * Test Case Name: Should work with Linux path format
     * Priority: Medium
     */
    it('should work with Linux path format', async () => {
      // Given: A Linux path is detected
      mockDetectGodotPath.mockResolvedValue('/usr/local/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.2.1.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.2.1.stable');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-PLAT-004
     * Test Case Name: Should work with simple 'godot' command (PATH lookup)
     * Priority: Medium
     */
    it('should work with simple godot command from PATH', async () => {
      // Given: 'godot' is found in PATH
      mockDetectGodotPath.mockResolvedValue('godot');
      mockGetGodotVersion.mockResolvedValue('4.2.1.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The version should be returned correctly
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.2.1.stable');
      expect(mockGetGodotVersion).toHaveBeenCalledWith('godot');
    });
  });

  describe('Edge Cases', () => {
    /**
     * Test Case ID: TC-SYSTEM-001-EDGE-001
     * Test Case Name: Should handle empty version string
     * Priority: Low
     */
    it('should handle empty version string', async () => {
      // Given: getGodotVersion returns empty string
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: Should still return successfully with empty string
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EDGE-002
     * Test Case Name: Should handle version with extra whitespace
     * Priority: Low
     */
    it('should handle version output as returned by GodotExecutor', async () => {
      // Given: getGodotVersion returns version (executor already trims)
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue('4.2.stable');

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: Version should be returned as-is
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe('4.2.stable');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EDGE-003
     * Test Case Name: Should handle very long version strings
     * Priority: Low
     */
    it('should handle long version strings', async () => {
      // Given: A very long version string
      const longVersion = '4.3.dev.mono.official.a1b2c3d4e5f6g7h8i9j0.linux.x86_64';
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockResolvedValue(longVersion);

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: The full version should be returned
      expect(isErrorResponse(result)).toBe(false);
      expect(getResponseText(result)).toBe(longVersion);
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EDGE-004
     * Test Case Name: Should handle undefined thrown from getGodotVersion
     * Priority: Low
     */
    it('should handle undefined thrown from getGodotVersion', async () => {
      // Given: getGodotVersion throws undefined
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue(undefined);

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: Should handle gracefully with 'Unknown error'
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Unknown error');
    });

    /**
     * Test Case ID: TC-SYSTEM-001-EDGE-005
     * Test Case Name: Should handle null thrown from getGodotVersion
     * Priority: Low
     */
    it('should handle null thrown from getGodotVersion', async () => {
      // Given: getGodotVersion throws null
      mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
      mockGetGodotVersion.mockRejectedValue(null);

      // When: We call handleGetGodotVersion
      const result = await handleGetGodotVersion();

      // Then: Should handle gracefully with 'Unknown error'
      expect(isErrorResponse(result)).toBe(true);
      expect(getResponseText(result)).toContain('Unknown error');
    });
  });
});

describe('SystemHealthTool', () => {
  /**
   * Test Suite ID: TS-SYSTEM-002
   * Test Suite Name: SystemHealth Tool Tests
   * Purpose: Verify the SystemHealth tool returns correct health status and metrics
   */

  beforeEach(() => {
    jest.clearAllMocks();
    mockDetectGodotPath.mockResolvedValue('/usr/bin/godot');
    mockIsValidGodotPath.mockResolvedValue(true);
    mockGetGodotVersion.mockResolvedValue('4.2.stable');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  describe('Tool Definition', () => {
    it('should have correct tool name', () => {
      expect(systemHealthDefinition.name).toBe('system_health');
    });

    it('should have a description', () => {
      expect(systemHealthDefinition.description).toBeDefined();
      expect(systemHealthDefinition.description.length).toBeGreaterThan(0);
      expect(systemHealthDefinition.description).toContain('health');
    });

    it('should have valid input schema', () => {
      const inputSchema = systemHealthDefinition.inputSchema;
      expect(inputSchema).toBeDefined();
      expect(inputSchema.type).toBe('object');
    });
  });

  describe('Successful Execution', () => {
    it('should return healthy status with all metrics', async () => {
      // Given: Default healthy environment
      // When: We call handleSystemHealth with all metrics
      const result = await handleSystemHealth({ includeMetrics: true, includeGodotStatus: true });

      // Then: The result should contain health info
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('status');
      expect(responseText).toContain('healthy');
    });

    it('should return version information', async () => {
      const result = await handleSystemHealth({});
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('version');
    });

    it('should return uptime', async () => {
      const result = await handleSystemHealth({});
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('uptime');
    });

    it('should return timestamp', async () => {
      const result = await handleSystemHealth({});
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('timestamp');
    });
  });

  describe('Metrics', () => {
    it('should include rate limiter stats when includeMetrics is true', async () => {
      const result = await handleSystemHealth({ includeMetrics: true });
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('rateLimiter');
    });

    it('should include memory usage when includeMetrics is true', async () => {
      const result = await handleSystemHealth({ includeMetrics: true });
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('memory');
    });

    it('should not include metrics when includeMetrics is false', async () => {
      const result = await handleSystemHealth({ includeMetrics: false, includeGodotStatus: false });
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      // Should still have basic fields but no metrics section
      expect(responseText).toContain('status');
      expect(responseText).toContain('uptime');
    });
  });

  describe('Godot Status', () => {
    it('should include Godot availability when includeGodotStatus is true', async () => {
      const result = await handleSystemHealth({ includeGodotStatus: true });
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('godot');
      expect(responseText).toContain('available');
    });

    it('should include Godot version when available', async () => {
      mockGetGodotVersion.mockResolvedValue('4.2.stable');
      const result = await handleSystemHealth({ includeGodotStatus: true });
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('4.2.stable');
    });

    it('should report degraded status when Godot is not available', async () => {
      mockDetectGodotPath.mockResolvedValue(null);
      mockIsValidGodotPath.mockResolvedValue(false);

      const result = await handleSystemHealth({ includeGodotStatus: true, includeMetrics: false });
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      expect(responseText).toContain('degraded');
    });

    it('should not include Godot status when includeGodotStatus is false', async () => {
      const result = await handleSystemHealth({ includeGodotStatus: false, includeMetrics: false });
      expect(isErrorResponse(result)).toBe(false);
      const responseText = getResponseText(result);
      // Should not contain godot section in response
      expect(responseText).toContain('status');
    });
  });

  describe('Default Parameters', () => {
    it('should use default values when no parameters provided', async () => {
      const result = await handleSystemHealth({});
      expect(isErrorResponse(result)).toBe(false);
      // Default is includeMetrics: true, includeGodotStatus: true
      const responseText = getResponseText(result);
      expect(responseText).toContain('rateLimiter');
      expect(responseText).toContain('godot');
    });
  });

  describe('Error Handling', () => {
    it('should handle Godot version retrieval failure gracefully', async () => {
      mockGetGodotVersion.mockRejectedValue(new Error('Version check failed'));

      const result = await handleSystemHealth({ includeGodotStatus: true });
      expect(isErrorResponse(result)).toBe(false);
      // Should still return health status, just without version
      const responseText = getResponseText(result);
      expect(responseText).toContain('status');
    });
  });

  describe('Response Format', () => {
    it('should return response with correct content structure', async () => {
      const result = await handleSystemHealth({});
      expect(result).toHaveProperty('content');
      expect(Array.isArray(result.content)).toBe(true);
      expect(result.content.length).toBeGreaterThan(0);
      expect(result.content[0]).toHaveProperty('type', 'text');
    });

    it('should return JSON-parseable response', async () => {
      const result = await handleSystemHealth({});
      const responseText = getResponseText(result);
      expect(() => JSON.parse(responseText)).not.toThrow();
    });
  });
});
