/**
 * Configuration management for Godot MCP Server
 * Handles environment variables and configuration validation
 */
export interface GodotServerConfig {
    godotPath?: string;
    debugMode?: boolean;
    godotDebugMode?: boolean;
    strictPathValidation?: boolean;
    readOnlyMode?: boolean;
}
export interface ParameterMappings {
    [snakeCase: string]: string;
}
export declare const DEBUG_MODE: boolean;
export declare const GODOT_DEBUG_MODE = true;
export declare const READ_ONLY_MODE: boolean;
export declare const PARAMETER_MAPPINGS: ParameterMappings;
export declare const REVERSE_PARAMETER_MAPPINGS: ParameterMappings;
/**
 * Get the default configuration
 */
export declare const getDefaultConfig: () => GodotServerConfig;
/**
 * Merge user config with defaults
 */
export declare const mergeConfig: (userConfig?: Partial<GodotServerConfig>) => GodotServerConfig;
export declare const config: {
    godotPath?: string;
    debugMode?: boolean;
    godotDebugMode?: boolean;
    strictPathValidation?: boolean;
    readOnlyMode?: boolean;
    SERVER_NAME: string;
    SERVER_VERSION: string;
    DEBUG_MODE: boolean;
    GODOT_DEBUG_MODE: boolean;
    READ_ONLY_MODE: boolean;
};
//# sourceMappingURL=config.d.ts.map