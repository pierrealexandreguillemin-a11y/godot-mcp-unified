/**
 * Run Project Tool
 * Handles running Godot projects in debug mode
 */
import { ToolResponse, ToolDefinition } from '../../server/types';
export interface RunProjectArgs {
    projectPath: string;
    scene?: string;
}
export declare const runProjectDefinition: ToolDefinition;
/**
 * Handle the run_project tool
 */
export declare const handleRunProject: (args: any) => Promise<ToolResponse>;
//# sourceMappingURL=RunProjectTool.d.ts.map