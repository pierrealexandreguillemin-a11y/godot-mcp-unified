/**
 * Configuration management for Godot MCP Server
 * Handles environment variables and configuration validation
 */
// Global configuration constants
export const DEBUG_MODE = process.env.DEBUG === 'true';
export const GODOT_DEBUG_MODE = true; // Always use GODOT DEBUG MODE
export const READ_ONLY_MODE = process.env.READ_ONLY_MODE === 'true';
// Parameter name mappings between snake_case and camelCase
export const PARAMETER_MAPPINGS = {
    project_path: 'projectPath',
    scene_path: 'scenePath',
    root_node_type: 'rootNodeType',
    parent_node_path: 'parentNodePath',
    node_type: 'nodeType',
    node_name: 'nodeName',
    texture_path: 'texturePath',
    node_path: 'nodePath',
    output_path: 'outputPath',
    mesh_item_names: 'meshItemNames',
    new_path: 'newPath',
    file_path: 'filePath',
    directory: 'directory',
    recursive: 'recursive',
    scene: 'scene',
};
// Reverse mapping from camelCase to snake_case
export const REVERSE_PARAMETER_MAPPINGS = (() => {
    const reverse = {};
    Object.entries(PARAMETER_MAPPINGS).forEach(([snakeCase, camelCase]) => {
        reverse[camelCase] = snakeCase;
    });
    return reverse;
})();
/**
 * Get the default configuration
 */
export const getDefaultConfig = () => ({
    godotPath: process.env.GODOT_PATH,
    debugMode: DEBUG_MODE,
    godotDebugMode: GODOT_DEBUG_MODE,
    strictPathValidation: false,
    readOnlyMode: READ_ONLY_MODE,
});
/**
 * Merge user config with defaults
 */
export const mergeConfig = (userConfig) => ({
    ...getDefaultConfig(),
    ...userConfig,
});
// Default configuration instance
export const config = {
    SERVER_NAME: 'godot-mcp-server',
    SERVER_VERSION: '0.1.0',
    DEBUG_MODE,
    GODOT_DEBUG_MODE,
    READ_ONLY_MODE,
    ...getDefaultConfig(),
};
//# sourceMappingURL=config.js.map