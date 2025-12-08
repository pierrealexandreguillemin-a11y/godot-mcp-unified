/**
 * Error handling utilities
 * Provides standardized error response creation
 */
export interface ErrorResponse {
    content: Array<{
        type: 'text';
        text: string;
    }>;
    isError: true;
}
/**
 * Create a standardized error response with possible solutions
 */
export declare const createErrorResponse: (message: string, possibleSolutions?: string[]) => ErrorResponse;
//# sourceMappingURL=ErrorHandler.d.ts.map