/**
 * Godot MCP Server
 * Full MCP implementation with Tools, Resources, and Prompts
 *
 * @see https://modelcontextprotocol.io/specification/2025-11-25
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
  CallToolResult,
  TextContent,
  LoggingLevel,
} from '@modelcontextprotocol/sdk/types.js';

import { config } from '../config/config';
import { detectGodotPath } from '../core/PathManager';
import { getAllToolDefinitions, getToolHandler, isToolRegistered } from '../tools/ToolRegistry';
import {
  listGodotResources,
  readGodotResource,
  getResourceTemplates,
  getTemplateContent,
} from '../resources/ResourcesHandler';
import {
  getAllPrompts,
  getPromptByName,
  generatePromptMessages,
} from '../prompts/PromptsHandler';

// Current project path (set via environment or tool calls)
let currentProjectPath: string = process.env.GODOT_PROJECT_PATH || '';

export class GodotMCPServer {
  private server: Server;
  private transport: StdioServerTransport;

  constructor() {
    this.server = new Server(
      {
        name: config.SERVER_NAME,
        version: config.SERVER_VERSION,
      },
      {
        capabilities: {
          tools: {},
          resources: {},
          prompts: {},
          logging: {},
        },
      },
    );

    this.transport = new StdioServerTransport();
    this.setupHandlers();
  }

  /**
   * Send log message via MCP protocol
   */
  private log(level: LoggingLevel, message: string, data?: unknown): void {
    this.server.sendLoggingMessage({
      level,
      logger: 'godot-mcp',
      data: data ? { message, ...data as object } : message,
    });
  }

  /**
   * Setup all server request handlers
   */
  private setupHandlers(): void {
    this.setupToolHandlers();
    this.setupResourceHandlers();
    this.setupPromptHandlers();
  }

  /**
   * Setup tool handlers
   */
  private setupToolHandlers(): void {
    // List tools handler
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      this.log('debug', 'Listing available tools');
      const tools = getAllToolDefinitions();
      this.log('debug', `Available tools: ${tools.length}`, { tools: tools.map((t) => t.name) });

      return { tools };
    });

    // Call tool handler
    this.server.setRequestHandler(CallToolRequestSchema, async (request): Promise<CallToolResult> => {
      const { name: toolName, arguments: args } = request.params;

      this.log('info', `Tool call: ${toolName}`, { args });

      if (!isToolRegistered(toolName)) {
        this.log('error', `Unknown tool: ${toolName}`);
        return this.createErrorResult(`Unknown tool: ${toolName}`, [
          'Use list_tools to see available tools',
        ]);
      }

      try {
        const handler = getToolHandler(toolName);
        if (!handler) {
          this.log('error', `No handler found for tool: ${toolName}`);
          return this.createErrorResult(`No handler found for tool: ${toolName}`, [
            'This appears to be a server configuration error',
          ]);
        }

        // Track project path from tool calls
        if (args && typeof args === 'object' && 'projectPath' in args) {
          currentProjectPath = args.projectPath as string;
        }

        const result = await handler(args || {});
        this.log('info', `Tool ${toolName} completed successfully`);
        return result;
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        this.log('error', `Tool ${toolName} failed: ${errorMessage}`);
        return this.createErrorResult(`Tool execution failed: ${errorMessage}`, [
          'Check the server logs for more details',
          'Ensure all required parameters are provided',
        ]);
      }
    });
  }

  /**
   * Setup resource handlers
   */
  private setupResourceHandlers(): void {
    // List resources handler
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      this.log('debug', 'Listing available resources');

      const resources = [];

      // Add project resources if project path is set
      if (currentProjectPath) {
        const projectResources = listGodotResources(currentProjectPath);
        resources.push(...projectResources);
      }

      // Add templates
      const templates = getResourceTemplates();
      resources.push(...templates);

      this.log('debug', `Found ${resources.length} resources`);
      return { resources };
    });

    // Read resource handler
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const { uri } = request.params;
      this.log('info', `Reading resource: ${uri}`);

      let content;

      // Check if it's a template
      if (uri.startsWith('godot-template://')) {
        content = getTemplateContent(uri);
      } else if (uri.startsWith('godot://') && currentProjectPath) {
        content = readGodotResource(currentProjectPath, uri);
      }

      if (!content) {
        throw new Error(`Resource not found: ${uri}`);
      }

      return {
        contents: [
          {
            uri: content.uri,
            mimeType: content.mimeType,
            text: content.text,
          },
        ],
      };
    });
  }

  /**
   * Setup prompt handlers
   */
  private setupPromptHandlers(): void {
    // List prompts handler
    this.server.setRequestHandler(ListPromptsRequestSchema, async () => {
      this.log('debug', 'Listing available prompts');
      const prompts = getAllPrompts();
      this.log('debug', `Found ${prompts.length} prompts`);
      return { prompts };
    });

    // Get prompt handler
    this.server.setRequestHandler(GetPromptRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      this.log('info', `Getting prompt: ${name}`, { args });

      const prompt = getPromptByName(name);
      if (!prompt) {
        throw new Error(`Prompt not found: ${name}`);
      }

      const result = generatePromptMessages(name, args || {});
      if (!result) {
        throw new Error(`Failed to generate prompt: ${name}`);
      }

      // Return GetPromptResult format
      return {
        description: result.description,
        messages: result.messages,
      };
    });
  }

  /**
   * Create an error result
   */
  private createErrorResult(message: string, suggestions: string[] = []): CallToolResult {
    const text = suggestions.length > 0
      ? `Error: ${message}\n\nSuggestions:\n${suggestions.map((s) => `- ${s}`).join('\n')}`
      : `Error: ${message}`;

    const content: TextContent = {
      type: 'text',
      text,
    };

    return {
      content: [content],
      isError: true,
    };
  }

  /**
   * Start the server
   */
  public async start(): Promise<void> {
    try {
      // Connect server to transport first (needed for logging)
      await this.server.connect(this.transport);

      this.log('info', 'Starting Godot MCP Server...');

      // Initialize Godot path detection
      this.log('debug', 'Detecting Godot installation...');
      const godotPath = await detectGodotPath();
      if (godotPath) {
        this.log('info', `Found Godot at: ${godotPath}`);
      } else {
        this.log('warning', 'Godot not found in standard locations. Set GODOT_PATH environment variable if needed.');
      }

      this.log('info', `Godot MCP Server started successfully (${config.SERVER_NAME} v${config.SERVER_VERSION})`);
      this.log('info', `Capabilities: tools, resources, prompts, logging`);
      this.log('debug', `Debug mode: ${config.DEBUG_MODE ? 'enabled' : 'disabled'}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      // Can't use MCP logging here as server might not be connected
      console.error(`[godot-mcp] Failed to start server: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * Stop the server
   */
  public async stop(): Promise<void> {
    try {
      this.log('info', 'Stopping Godot MCP Server...');
      await this.server.close();
      this.log('info', 'Godot MCP Server stopped');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error(`[godot-mcp] Error stopping server: ${errorMessage}`);
      throw error;
    }
  }
}
