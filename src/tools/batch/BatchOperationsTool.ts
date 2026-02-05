/**
 * Batch Operations Tool
 * Execute multiple MCP tools in sequence with error handling
 *
 * ISO/IEC 5055 compliant - Zod validation
 * ISO/IEC 25010 compliant - data integrity
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ProjectToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateProjectPath,
  createJsonResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug, logError } from '../../utils/Logger.js';
import {
  BatchOperationsSchema,
  BatchOperationsInput,
  toMcpSchema,
  safeValidateInput,
} from '../../core/ZodSchemas.js';

// Lazy import to avoid circular dependency
let toolRegistryModule: typeof import('../ToolRegistry.js') | null = null;

async function getToolRegistry(): Promise<typeof import('../ToolRegistry.js')> {
  if (!toolRegistryModule) {
    toolRegistryModule = await import('../ToolRegistry.js');
  }
  return toolRegistryModule;
}

const MAX_OPERATIONS = 100;
const FORBIDDEN_TOOLS = ['batch_operations']; // Prevent recursive batch calls

export interface BatchOperation {
  tool: string;
  args: Record<string, unknown>;
  id?: string;
}

export interface BatchOperationsArgs extends ProjectToolArgs {
  operations: BatchOperation[];
  stopOnError?: boolean;
  maxOperations?: number;
}

export interface BatchOperationResult {
  index: number;
  tool: string;
  id?: string;
  success: boolean;
  result?: unknown;
  error?: string;
  durationMs: number;
}

export interface BatchOperationsResult {
  projectPath: string;
  totalOperations: number;
  successCount: number;
  failureCount: number;
  stoppedEarly: boolean;
  results: BatchOperationResult[];
}

export const batchOperationsDefinition: ToolDefinition = {
  name: 'batch_operations',
  description:
    'Execute multiple MCP tools in sequence with error handling. Useful for complex workflows like creating a scene with multiple nodes and scripts.',
  inputSchema: toMcpSchema(BatchOperationsSchema),
};

/**
 * Validate a single operation before execution
 */
async function validateOperation(
  operation: BatchOperation,
  index: number
): Promise<string | null> {
  if (!operation.tool || typeof operation.tool !== 'string') {
    return `Operation ${index}: 'tool' is required and must be a string`;
  }

  if (FORBIDDEN_TOOLS.includes(operation.tool)) {
    return `Operation ${index}: '${operation.tool}' cannot be called from batch_operations (recursive batch not allowed)`;
  }

  const registry = await getToolRegistry();
  if (!registry.isToolRegistered(operation.tool)) {
    return `Operation ${index}: Unknown tool '${operation.tool}'`;
  }

  if (
    !operation.args ||
    operation.args === null ||
    typeof operation.args !== 'object' ||
    Array.isArray(operation.args)
  ) {
    return `Operation ${index}: 'args' is required and must be a plain object (not an array)`;
  }

  return null;
}

/**
 * Execute a single operation and return result
 */
async function executeOperation(
  operation: BatchOperation,
  index: number,
  projectPath: string
): Promise<BatchOperationResult> {
  const startTime = Date.now();

  try {
    const registry = await getToolRegistry();
    const handler = registry.getToolHandler(operation.tool);
    if (!handler) {
      return {
        index,
        tool: operation.tool,
        id: operation.id,
        success: false,
        error: `Handler not found for tool '${operation.tool}'`,
        durationMs: Date.now() - startTime,
      };
    }

    // Inject projectPath into args if not provided
    const argsWithProject: BaseToolArgs = {
      ...operation.args,
      projectPath: operation.args.projectPath ?? projectPath,
    };

    logDebug(`Batch: Executing operation ${index} - ${operation.tool}`);
    const response = await handler(argsWithProject);

    // Use response.isError for reliable error detection
    const isError = response.isError === true;

    // Extract result from response
    let result: unknown = null;
    if (response.content.length > 0 && response.content[0].type === 'text') {
      try {
        result = JSON.parse(response.content[0].text);
      } catch {
        result = response.content[0].text;
      }
    }

    return {
      index,
      tool: operation.tool,
      id: operation.id,
      success: !isError,
      result,
      durationMs: Date.now() - startTime,
    };
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logError(`Batch: Operation ${index} (${operation.tool}) failed: ${errorMessage}`);

    return {
      index,
      tool: operation.tool,
      id: operation.id,
      success: false,
      error: errorMessage,
      durationMs: Date.now() - startTime,
    };
  }
}

export const handleBatchOperations = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  // Zod validation (replaces validateBasicArgs + array/empty checks)
  const validation = safeValidateInput(BatchOperationsSchema, preparedArgs);
  if (!validation.success) {
    return createErrorResponse(`Validation failed: ${validation.error}`, [
      'Provide a valid projectPath',
      'Provide an array of operations to execute (1-100 items)',
    ]);
  }

  const typedArgs: BatchOperationsInput = validation.data;

  // Business logic validation: max operations limit
  const maxOps = Math.min(typedArgs.maxOperations ?? MAX_OPERATIONS, MAX_OPERATIONS);
  if (typedArgs.operations.length > maxOps) {
    return createErrorResponse(
      `Too many operations: ${typedArgs.operations.length} exceeds limit of ${maxOps}`,
      [`Reduce the number of operations to ${maxOps} or fewer`]
    );
  }

  // Validate each operation before execution
  for (let i = 0; i < typedArgs.operations.length; i++) {
    const opValidationError = await validateOperation(typedArgs.operations[i], i);
    if (opValidationError) {
      return createErrorResponse(opValidationError, [
        'Check that all operation tool names are valid',
        'Ensure each operation has required args',
      ]);
    }
  }

  // Validate project path
  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  const stopOnError = typedArgs.stopOnError ?? true;
  const results: BatchOperationResult[] = [];
  let successCount = 0;
  let failureCount = 0;
  let stoppedEarly = false;

  logDebug(`Batch: Starting execution of ${typedArgs.operations.length} operations`);

  // Execute operations sequentially
  for (let i = 0; i < typedArgs.operations.length; i++) {
    const operation = typedArgs.operations[i];
    const result = await executeOperation(operation, i, typedArgs.projectPath);
    results.push(result);

    if (result.success) {
      successCount++;
    } else {
      failureCount++;
      if (stopOnError) {
        stoppedEarly = true;
        logDebug(`Batch: Stopping early due to error at operation ${i}`);
        break;
      }
    }
  }

  const batchResult: BatchOperationsResult = {
    projectPath: typedArgs.projectPath,
    totalOperations: typedArgs.operations.length,
    successCount,
    failureCount,
    stoppedEarly,
    results,
  };

  logDebug(
    `Batch: Completed - ${successCount}/${typedArgs.operations.length} successful` +
      (stoppedEarly ? ' (stopped early)' : '')
  );

  return createJsonResponse(batchResult);
};
