/**
 * Update Project UIDs Tool
 * Updates UID references in a Godot project by resaving resources (for Godot 4.4+)
 */
import { ToolDefinition, ToolResponse } from '../../server/types';
export interface UpdateProjectUidsArgs {
    projectPath: string;
}
export declare const updateProjectUidsDefinition: ToolDefinition;
/**
 * Handle the update_project_uids tool
 */
export declare const handleUpdateProjectUids: (args: any) => Promise<ToolResponse>;
//# sourceMappingURL=UpdateProjectUidsTool.d.ts.map