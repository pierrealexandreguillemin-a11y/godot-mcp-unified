/**
 * Batch Operations Tool Tests
 * ISO/IEC 25010 compliant - strict testing
 */

import { handleBatchOperations } from './BatchOperationsTool';

describe('BatchOperations', () => {
  describe('Parameter validation', () => {
    it('should return error when projectPath is missing', async () => {
      const result = await handleBatchOperations({
        operations: [{ tool: 'get_godot_version', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('projectPath');
    });

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
      expect(result.content[0].text).toContain('must be an array');
    });

    it('should return error when operations array is empty', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('cannot be empty');
    });
  });

  describe('Tool validation', () => {
    it('should return error for invalid tool name', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'non_existent_tool', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });

    it('should return error for recursive batch call', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'batch_operations', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('recursive batch not allowed');
    });

    it('should return error when operation tool is missing', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("'tool' is required");
    });

    it('should return error when operation args is missing', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'get_godot_version' }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain("'args' is required");
    });

    it('should return error when operation args is an array', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'get_godot_version', args: ['not', 'an', 'object'] }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('must be a plain object');
      expect(result.content[0].text).toContain('not an array');
    });
  });

  describe('Limits', () => {
    it('should return error when exceeding max operations', async () => {
      const operations = Array(101).fill({ tool: 'get_godot_version', args: {} });
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Too many operations');
      expect(result.content[0].text).toContain('exceeds limit');
    });

    it('should respect custom maxOperations limit', async () => {
      const operations = Array(50).fill({ tool: 'get_godot_version', args: {} });
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations,
        maxOperations: 10,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exceeds limit of 10');
    });

    it('should cap maxOperations at 100', async () => {
      // Even if user specifies higher, it should be capped
      const operations = Array(101).fill({ tool: 'get_godot_version', args: {} });
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations,
        maxOperations: 200,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('exceeds limit of 100');
    });

    it('should return error for negative maxOperations', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'get_godot_version', args: {} }],
        maxOperations: -5,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid maxOperations');
    });

    it('should return error for zero maxOperations', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'get_godot_version', args: {} }],
        maxOperations: 0,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid maxOperations');
    });

    it('should return error for NaN maxOperations', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'get_godot_version', args: {} }],
        maxOperations: NaN,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid maxOperations');
    });

    it('should return error for Infinity maxOperations', async () => {
      const result = await handleBatchOperations({
        projectPath: '/path/to/project',
        operations: [{ tool: 'get_godot_version', args: {} }],
        maxOperations: Infinity,
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Invalid maxOperations');
    });
  });

  describe('Project path validation', () => {
    it('should return error for invalid project path', async () => {
      const result = await handleBatchOperations({
        projectPath: '/non/existent/project',
        operations: [{ tool: 'get_godot_version', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });

  describe('Operation execution', () => {
    it('should validate all operations before project path check', async () => {
      // Business logic validation (invalid tool) should come before project path check
      const result = await handleBatchOperations({
        projectPath: '/non/existent/project',
        operations: [{ tool: 'invalid_tool', args: {} }],
      });
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Unknown tool');
    });

    it('should accept optional id parameter', async () => {
      const result = await handleBatchOperations({
        projectPath: '/non/existent/project',
        operations: [
          { tool: 'get_godot_version', args: {}, id: 'step1' },
        ],
      });
      // Will fail on project validation, but id param should be accepted
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });

    it('should accept stopOnError parameter', async () => {
      const result = await handleBatchOperations({
        projectPath: '/non/existent/project',
        operations: [{ tool: 'get_godot_version', args: {} }],
        stopOnError: false,
      });
      // Will fail on project validation
      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Not a valid Godot project');
    });
  });
});
