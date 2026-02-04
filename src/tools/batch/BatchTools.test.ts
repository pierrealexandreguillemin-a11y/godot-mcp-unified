/**
 * Batch Operations Tool Comprehensive Tests
 * ISO 29119 compliant test coverage
 *
 * Test Design Techniques Applied:
 * - Equivalence Partitioning: Valid/invalid operations
 * - Boundary Value Analysis: Operation count limits
 * - Decision Table Testing: stopOnError combinations
 * - State Transition Testing: Sequential execution states
 */

import { handleBatchOperations, BatchOperationsResult, BatchOperationResult } from './BatchOperationsTool';
import { createTempProject, parseJsonResponse } from '../test-utils.js';

// isErrorResponse reserved for future error validation tests

describe('BatchOperations', () => {
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

  describe('Parameter Validation', () => {
    describe('projectPath validation', () => {
      it('should return error when projectPath is missing', async () => {
        const result = await handleBatchOperations({
          operations: [{ tool: 'get_godot_version', args: {} }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('projectPath');
      });

      it('should return error when projectPath is empty', async () => {
        const result = await handleBatchOperations({
          projectPath: '',
          operations: [{ tool: 'get_godot_version', args: {} }],
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for path traversal attempt', async () => {
        const result = await handleBatchOperations({
          projectPath: '../../../etc',
          operations: [{ tool: 'get_godot_version', args: {} }],
        });
        expect(result.isError).toBe(true);
      });
    });

    describe('operations array validation', () => {
      it('should return error when operations is missing', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toContain('operations');
      });

      it('should return error when operations is not an array', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: 'not-an-array',
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/must be an array|Validation failed.*operations.*array/i);
      });

      it('should return error when operations array is empty', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/cannot be empty|Validation failed.*operations/i);
      });

      it('should return error for null operations', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: null,
        });
        expect(result.isError).toBe(true);
      });

      it('should return error for undefined operations', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: undefined,
        });
        expect(result.isError).toBe(true);
      });
    });

    describe('operation structure validation', () => {
      it('should return error when operation tool is missing', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ args: {} }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'tool' is required|Validation failed.*tool/i);
      });

      it('should return error when operation args is missing', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: 'get_godot_version' }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/'args' is required|Validation failed.*args/i);
      });

      it('should return error when operation args is an array', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: 'get_godot_version', args: ['not', 'an', 'object'] }],
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/must be a plain object|not an array|Validation failed.*args.*array/i);
      });

      it('should return error when tool is empty string', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: '', args: {} }],
        });
        expect(result.isError).toBe(true);
      });

      it('should return error when tool is not a string', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: 123, args: {} }],
        });
        expect(result.isError).toBe(true);
      });
    });
  });

  describe('Tool Validation', () => {
    it('should return error for invalid tool name', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'non_existent_tool', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Unknown tool|non_existent_tool/);
    }, 10000);

    it('should return error for recursive batch call', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'batch_operations', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('recursive batch not allowed');
    });

    it('should validate all operations before execution', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'list_scenes', args: {} },
          { tool: 'invalid_tool_name', args: {} },
          { tool: 'list_scripts', args: {} },
        ],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Unknown tool|invalid_tool_name/);
    }, 10000);
  });

  describe('Limits Validation', () => {
    describe('maxOperations limit', () => {
      it('should return error when exceeding max operations (100)', async () => {
        const operations = Array(101).fill({ tool: 'get_godot_version', args: {} });
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Too many operations|exceeds limit|Validation failed.*operations.*100/i);
      });

      it('should accept exactly 100 operations', async () => {
        const operations = Array(100).fill({ tool: 'list_scenes', args: {} });
        const result = await handleBatchOperations({
          projectPath,
          operations,
        });
        // Will likely fail on project validation if path is invalid
        // but should not fail on operation count
        expect(result.content[0].text).not.toMatch(/Too many operations/i);
      });

      it('should respect custom maxOperations limit', async () => {
        const operations = Array(50).fill({ tool: 'get_godot_version', args: {} });
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations,
          maxOperations: 10,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/exceeds limit of 10|Too many operations|Validation failed.*operations/i);
      });

      it('should cap maxOperations at 100', async () => {
        const operations = Array(101).fill({ tool: 'get_godot_version', args: {} });
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations,
          maxOperations: 200,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/exceeds limit of 100|Validation failed.*100/i);
      });
    });

    describe('invalid maxOperations values', () => {
      it('should return error for negative maxOperations', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: 'get_godot_version', args: {} }],
          maxOperations: -5,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid maxOperations|Validation failed.*maxOperations/i);
      });

      it('should return error for zero maxOperations', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: 'get_godot_version', args: {} }],
          maxOperations: 0,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid maxOperations|Validation failed.*maxOperations/i);
      });

      it('should return error for NaN maxOperations', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: 'get_godot_version', args: {} }],
          maxOperations: NaN,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid maxOperations|Validation failed.*maxOperations/i);
      });

      it('should return error for Infinity maxOperations', async () => {
        const result = await handleBatchOperations({
          projectPath: '/path/to/project',
          operations: [{ tool: 'get_godot_version', args: {} }],
          maxOperations: Infinity,
        });
        expect(result.isError).toBe(true);
        expect(result.content[0].text).toMatch(/Invalid maxOperations|Validation failed.*maxOperations/i);
      });

      it('should handle float maxOperations', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [{ tool: 'list_scenes', args: {} }],
          maxOperations: 5.5,
        });
        // May truncate or error depending on implementation
        // Just ensure it doesn't crash
        expect(result).toBeDefined();
      });
    });
  });

  describe('Project Path Validation', () => {
    it('should return error for invalid project path', async () => {
      const result = await handleBatchOperations({
        projectPath: '/non/existent/project',
        operations: [{ tool: 'list_scenes', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Not a valid Godot project|Unknown tool/);
    }, 10000);

    it('should validate all operations before project path check', async () => {
      const result = await handleBatchOperations({
        projectPath: '/non/existent/project',
        operations: [{ tool: 'invalid_tool', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toMatch(/Unknown tool|invalid_tool/);
    }, 10000);
  });

  describe('Operation Execution', () => {
    describe('successful execution', () => {
      it('should execute single operation successfully', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [{ tool: 'list_scenes', args: {} }],
        });

        expect(result.isError).toBeFalsy();
        const data = parseJsonResponse<BatchOperationsResult>(result);

        expect(data.totalOperations).toBe(1);
        expect(data.successCount).toBe(1);
        expect(data.failureCount).toBe(0);
        expect(data.stoppedEarly).toBe(false);
        expect(data.results).toHaveLength(1);
        expect(data.results[0].success).toBe(true);
      }, 15000);

      it('should execute multiple operations sequentially', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: {} },
            { tool: 'list_scripts', args: {} },
            { tool: 'list_resources', args: {} },
          ],
        });

        expect(result.isError).toBeFalsy();
        const data = parseJsonResponse<BatchOperationsResult>(result);

        expect(data.totalOperations).toBe(3);
        expect(data.successCount).toBe(3);
        expect(data.results).toHaveLength(3);
      }, 30000);

      it('should include duration for each operation', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [{ tool: 'list_scenes', args: {} }],
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].durationMs).toBeGreaterThanOrEqual(0);
      }, 15000);

      it('should include operation index in results', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: {} },
            { tool: 'list_scripts', args: {} },
          ],
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].index).toBe(0);
        expect(data.results[1].index).toBe(1);
      }, 20000);

      it('should include tool name in results', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [{ tool: 'list_scenes', args: {} }],
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].tool).toBe('list_scenes');
      }, 15000);
    });

    describe('optional id parameter', () => {
      it('should accept optional id parameter', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: {}, id: 'step1' },
          ],
        });

        expect(result.isError).toBeFalsy();
        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].id).toBe('step1');
      }, 15000);

      it('should preserve id across multiple operations', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: {}, id: 'step1' },
            { tool: 'list_scripts', args: {}, id: 'step2' },
          ],
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].id).toBe('step1');
        expect(data.results[1].id).toBe('step2');
      }, 20000);

      it('should handle undefined id', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [{ tool: 'list_scenes', args: {} }],
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].id).toBeUndefined();
      }, 15000);
    });

    describe('projectPath injection', () => {
      it('should inject projectPath into operation args', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [{ tool: 'list_scenes', args: {} }],
        });

        expect(result.isError).toBeFalsy();
        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].success).toBe(true);
      }, 15000);

      it('should not override explicit projectPath in args', async () => {
        // Create another temp project
        const temp2 = createTempProject();

        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: { projectPath: temp2.projectPath } },
          ],
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].success).toBe(true);

        temp2.cleanup();
      }, 15000);
    });
  });

  describe('stopOnError Behavior', () => {
    describe('stopOnError: true (default)', () => {
      it('should stop on first error when stopOnError is true', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: {} },
            { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
            { tool: 'list_scripts', args: {} }, // Should not execute
          ],
          stopOnError: true,
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.stoppedEarly).toBe(true);
        expect(data.results.length).toBeLessThan(3);
      }, 20000);

      it('should set stoppedEarly to true when stopping early', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
            { tool: 'list_scenes', args: {} },
          ],
          stopOnError: true,
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.stoppedEarly).toBe(true);
      }, 15000);

      it('should include failure count when stopped early', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
            { tool: 'list_scenes', args: {} },
          ],
          stopOnError: true,
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.failureCount).toBe(1);
      }, 15000);
    });

    describe('stopOnError: false', () => {
      it('should continue on error when stopOnError is false', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: {} },
            { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
            { tool: 'list_scripts', args: {} }, // Should still execute
          ],
          stopOnError: false,
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.stoppedEarly).toBe(false);
        expect(data.results.length).toBe(3);
      }, 30000);

      it('should track both success and failure counts', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'list_scenes', args: {} },
            { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
            { tool: 'list_scripts', args: {} },
          ],
          stopOnError: false,
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.successCount).toBe(2);
        expect(data.failureCount).toBe(1);
      }, 30000);

      it('should include error info in failed operation result', async () => {
        const result = await handleBatchOperations({
          projectPath,
          operations: [
            { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
          ],
          stopOnError: false,
        });

        const data = parseJsonResponse<BatchOperationsResult>(result);
        expect(data.results[0].success).toBe(false);
        // Error info may be in 'error' field or 'result' contains the error response
        expect(data.results[0].error !== undefined || data.results[0].result !== undefined).toBe(true);
      }, 15000);
    });
  });

  describe('Result Structure', () => {
    it('should include projectPath in result', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [{ tool: 'list_scenes', args: {} }],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.projectPath).toBe(projectPath);
    }, 15000);

    it('should include totalOperations count', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'list_scenes', args: {} },
          { tool: 'list_scripts', args: {} },
        ],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.totalOperations).toBe(2);
    }, 20000);

    it('should return operation results in array', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [{ tool: 'list_scenes', args: {} }],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(Array.isArray(data.results)).toBe(true);
    }, 15000);

    it('should include result data for successful operations', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [{ tool: 'list_scenes', args: {} }],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.results[0].result).toBeDefined();
    }, 15000);
  });

  describe('BatchOperationResult Interface', () => {
    it('should conform to BatchOperationResult interface', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [{ tool: 'list_scenes', args: {}, id: 'test' }],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      const opResult: BatchOperationResult = data.results[0];

      expect(typeof opResult.index).toBe('number');
      expect(typeof opResult.tool).toBe('string');
      expect(typeof opResult.success).toBe('boolean');
      expect(typeof opResult.durationMs).toBe('number');
      // id is optional
      if (opResult.id !== undefined) {
        expect(typeof opResult.id).toBe('string');
      }
    }, 15000);
  });

  describe('Error Handling', () => {
    it('should handle tool that throws exception', async () => {
      // A tool with invalid args that causes internal error
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'create_scene', args: { scenePath: null } },
        ],
        stopOnError: false,
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.results[0].success).toBe(false);
    }, 15000);

    it('should include error details in failed result', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'create_scene', args: { scenePath: '' } },
        ],
        stopOnError: false,
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.results[0].success).toBe(false);
      // Error details are in 'error' field (for exceptions) or 'result' field (for error responses)
      const hasErrorInfo = data.results[0].error !== undefined || data.results[0].result !== undefined;
      expect(hasErrorInfo).toBe(true);
    }, 15000);
  });

  describe('Edge Cases', () => {
    it('should handle single operation', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [{ tool: 'list_scenes', args: {} }],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.totalOperations).toBe(1);
      expect(data.results).toHaveLength(1);
    }, 15000);

    it('should handle operation with empty args object', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [{ tool: 'list_scenes', args: {} }],
      });

      expect(result.isError).toBeFalsy();
    }, 15000);

    it('should handle operation with complex args', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          {
            tool: 'create_scene',
            args: {
              scenePath: 'scenes/batch_test.tscn',
              rootNodeType: 'Node2D',
            },
          },
        ],
      });

      // May succeed or fail but should not crash
      expect(result).toBeDefined();
    }, 15000);

    it('should handle mixed success and failure operations', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'list_scenes', args: {} },
          { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
          { tool: 'list_scripts', args: {} },
          { tool: 'create_scene', args: { scenePath: '' } }, // Will fail
          { tool: 'list_resources', args: {} },
        ],
        stopOnError: false,
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.successCount + data.failureCount).toBe(5);
    }, 45000);
  });

  describe('Performance', () => {
    it('should track duration for each operation', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'list_scenes', args: {} },
          { tool: 'list_scripts', args: {} },
        ],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      for (const opResult of data.results) {
        expect(opResult.durationMs).toBeGreaterThanOrEqual(0);
      }
    }, 20000);

    it('should complete operations in reasonable time', async () => {
      const startTime = Date.now();

      await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'list_scenes', args: {} },
          { tool: 'list_scripts', args: {} },
          { tool: 'list_resources', args: {} },
        ],
      });

      const elapsed = Date.now() - startTime;
      // Should complete within 30 seconds for 3 operations
      expect(elapsed).toBeLessThan(30000);
    }, 35000);
  });

  describe('Integration Scenarios', () => {
    it('should support scene creation workflow', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          {
            tool: 'create_scene',
            args: { scenePath: 'scenes/batch_created.tscn', rootNodeType: 'Node2D' },
            id: 'create_scene',
          },
          {
            tool: 'list_scenes',
            args: {},
            id: 'verify_creation',
          },
        ],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      // At least the list_scenes should succeed
      expect(data.results.some((r) => r.success)).toBe(true);
    }, 20000);

    it('should support resource listing workflow', async () => {
      const result = await handleBatchOperations({
        projectPath,
        operations: [
          { tool: 'list_scenes', args: {}, id: 'list_scenes' },
          { tool: 'list_scripts', args: {}, id: 'list_scripts' },
          { tool: 'list_resources', args: {}, id: 'list_resources' },
        ],
      });

      const data = parseJsonResponse<BatchOperationsResult>(result);
      expect(data.successCount).toBe(3);
    }, 30000);
  });
});
