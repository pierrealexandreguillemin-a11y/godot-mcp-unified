/**
 * Godot MCP Server
 * Simplified server implementation using modular architecture
 */
export declare class GodotMCPServer {
    private server;
    private transport;
    constructor();
    /**
     * Setup all server request handlers
     */
    private setupHandlers;
    /**
     * Start the server
     */
    start(): Promise<void>;
    /**
     * Stop the server
     */
    stop(): Promise<void>;
}
//# sourceMappingURL=GodotMCPServer.d.ts.map