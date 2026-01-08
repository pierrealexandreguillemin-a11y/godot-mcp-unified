/**
 * Debug Script Prompt
 * @module prompts/definitions/debug
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const debugScript: RegisteredPrompt = {
  definition: {
    name: 'debug_script',
    description: 'Help debug a GDScript file with errors',
    category: 'debug',
    arguments: [
      {
        name: 'scriptPath',
        description: 'Path to the script with errors',
        required: true,
      },
      {
        name: 'errorMessage',
        description: 'The error message from Godot',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Debug script ${args.scriptPath}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Help me debug the GDScript file at "${args.scriptPath}".

${args.errorMessage ? `Error message: ${args.errorMessage}` : 'Please check for any errors using get_script_errors.'}

Please:
1. Use read_script to examine the code
2. Use get_script_errors to get detailed error information
3. Identify the root cause of the issue
4. Provide a corrected version of the code
5. Explain what was wrong and how to avoid it in the future`,
        },
      },
    ],
  }),
};
