/**
 * Analyze Project Prompt
 * @module prompts/definitions/analysis
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const analyzeProject: RegisteredPrompt = {
  definition: {
    name: 'analyze_project',
    description: 'Analyze a Godot project and suggest improvements',
    category: 'analysis',
    arguments: [
      {
        name: 'projectPath',
        description: 'Path to the Godot project',
        required: true,
      },
      {
        name: 'focus',
        description: 'Focus area: performance, architecture, code-quality',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Analyze Godot project at ${args.projectPath}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Analyze the Godot project at "${args.projectPath}" and provide recommendations.

Focus area: ${args.focus || 'general'}

Please:
1. Use list_scripts to examine all GDScript files
2. Use list_scenes to review scene structure
3. Use get_project_settings to check configuration
4. Use get_script_errors to find any issues

Provide a detailed analysis covering:
- Project structure and organization
- Code quality and patterns used
- ${args.focus === 'performance' ? 'Performance bottlenecks and optimization opportunities' : ''}
- ${args.focus === 'architecture' ? 'Architecture patterns and improvements' : ''}
- ${args.focus === 'code-quality' ? 'Code style, naming conventions, and best practices' : ''}
- Specific recommendations with code examples`,
        },
      },
    ],
  }),
};
