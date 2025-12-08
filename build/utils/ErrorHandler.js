/**
 * Error handling utilities
 * Provides standardized error response creation
 */
/**
 * Create a standardized error response with possible solutions
 */
export const createErrorResponse = (message, possibleSolutions = []) => {
    console.error(`[SERVER] Error response: ${message}`);
    if (possibleSolutions.length > 0) {
        console.error(`[SERVER] Possible solutions: ${possibleSolutions.join(', ')}`);
    }
    const response = {
        content: [
            {
                type: 'text',
                text: message,
            },
        ],
        isError: true,
    };
    if (possibleSolutions.length > 0) {
        response.content.push({
            type: 'text',
            text: 'Possible solutions:\n- ' + possibleSolutions.join('\n- '),
        });
    }
    return response;
};
//# sourceMappingURL=ErrorHandler.js.map