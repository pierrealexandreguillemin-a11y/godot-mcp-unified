/**
 * Tool Registry
 * Central registry for all available tools with their definitions and handlers
 */
import { ToolDefinition, ToolResponse } from '../server/types';
export interface ToolRegistration {
    definition: ToolDefinition;
    handler: (args: any) => Promise<ToolResponse>;
    readOnly: boolean;
}
/**
 * Registry of all available tools
 */
export declare const toolRegistry: Map<string, ToolRegistration>;
/**
 * Get all tool definitions for MCP server registration
 * Filters tools based on READ_ONLY_MODE
 */
export declare const getAllToolDefinitions: () => ToolDefinition[];
/**
 * Get a tool handler by name
 */
export declare const getToolHandler: (toolName: string) => ((args: any) => Promise<ToolResponse>) | undefined;
/**
 * Check if a tool is registered
 */
export declare const isToolRegistered: (toolName: string) => boolean;
/**
 * Get all registered tool names
 */
export declare const getRegisteredToolNames: () => string[];
//# sourceMappingURL=ToolRegistry.d.ts.map