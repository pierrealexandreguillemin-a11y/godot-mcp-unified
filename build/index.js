#!/usr/bin/env node
/**
 * Godot MCP Server - Main Entry Point
 *
 * Refactored server using modular architecture with functional programming patterns.
 * This replaces the original 2200+ line monolithic implementation with a clean,
 * maintainable, and extensible structure.
 */
import { GodotMCPServer } from './server/GodotMCPServer.js';
import { logInfo, logError } from './utils/Logger.js';
/**
 * Main function to start the server
 */
const main = async () => {
    try {
        const server = new GodotMCPServer();
        await server.start();
        // Handle graceful shutdown
        const handleShutdown = async (signal) => {
            logInfo(`Received ${signal}, shutting down gracefully...`);
            try {
                await server.stop();
                process.exit(0);
            }
            catch (error) {
                logError(`Error during shutdown: ${error}`);
                process.exit(1);
            }
        };
        process.on('SIGINT', () => handleShutdown('SIGINT'));
        process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    }
    catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        logError(`Failed to start Godot MCP Server: ${errorMessage}`);
        process.exit(1);
    }
};
// Start the server
main().catch((error) => {
    logError(`Unhandled error in main: ${error}`);
    process.exit(1);
});
//# sourceMappingURL=index.js.map