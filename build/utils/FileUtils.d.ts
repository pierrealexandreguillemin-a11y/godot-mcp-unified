/**
 * File system utilities
 * Provides file and directory operations
 */
export interface GodotProject {
    path: string;
    name: string;
}
/**
 * Check if a directory is a valid Godot project
 */
export declare const isGodotProject: (projectPath: string) => boolean;
/**
 * Find Godot projects in a directory
 */
export declare const findGodotProjects: (directory: string, recursive: boolean) => GodotProject[];
/**
 * Get project structure with file counts
 */
export declare const getProjectStructure: (projectPath: string) => {
    scenes: number;
    scripts: number;
    assets: number;
    other: number;
};
//# sourceMappingURL=FileUtils.d.ts.map