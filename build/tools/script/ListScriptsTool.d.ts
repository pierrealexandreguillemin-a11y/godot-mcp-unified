/**
 * List Scripts Tool
 * Lists all GDScript files in a Godot project
 */
import { ToolDefinition, ToolResponse } from '../../server/types';
export interface ScriptInfo {
    path: string;
    name: string;
    size: number;
    modified: string;
}
export declare const listScriptsDefinition: ToolDefinition;
export declare const handleListScripts: (args: any) => Promise<ToolResponse>;
//# sourceMappingURL=ListScriptsTool.d.ts.map