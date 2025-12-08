/**
 * Error handling utilities
 * Provides standardized error response creation
 */

export interface ErrorResponseContent {
  type: 'text';
  text: string;
  [key: string]: unknown;
}

export interface ErrorResponse {
  content: ErrorResponseContent[];
  isError: true;
  [key: string]: unknown;
}

/**
 * Create a standardized error response with possible solutions
 */
export const createErrorResponse = (
  message: string,
  possibleSolutions: string[] = [],
): ErrorResponse => {
  console.error(`[SERVER] Error response: ${message}`);
  if (possibleSolutions.length > 0) {
    console.error(`[SERVER] Possible solutions: ${possibleSolutions.join(', ')}`);
  }

  const response: ErrorResponse = {
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
