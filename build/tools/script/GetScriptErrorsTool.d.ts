/**
 * Get Script Errors Tool
 * Validates GDScript files and returns compilation errors
 */
import { ToolDefinition, ToolResponse } from '../../server/types';
export interface ScriptError {
    file: string;
    line: number;
    column?: number;
    message: string;
    type: 'error' | 'warning';
}
export declare const getScriptErrorsDefinition: ToolDefinition;
export declare const handleGetScriptErrors: (args: any) => Promise<ToolResponse>;
//# sourceMappingURL=GetScriptErrorsTool.d.ts.map