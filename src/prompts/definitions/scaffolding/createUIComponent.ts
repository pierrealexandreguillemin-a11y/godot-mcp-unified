/**
 * Create UI Component Prompt
 * @module prompts/definitions/scaffolding
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const createUIComponent: RegisteredPrompt = {
  definition: {
    name: 'create_ui_component',
    description: 'Generate a UI component with proper theming',
    category: 'scaffolding',
    arguments: [
      {
        name: 'componentType',
        description: 'Type: menu, hud, dialog, inventory, settings',
        required: true,
      },
      {
        name: 'style',
        description: 'Visual style: minimal, fantasy, sci-fi, pixel',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Create ${args.componentType} UI component`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a ${args.componentType} UI component for Godot 4.x with ${args.style || 'minimal'} style.

Requirements:
- Create both the scene (.tscn) and script (.gd)
- Use Control nodes and proper anchoring
- Include theme overrides for customization
- Add accessibility features (focus, navigation)
- Include animations for transitions
- Follow Godot UI best practices

Component type "${args.componentType}" should include:
${args.componentType === 'menu' ? '- Main menu with buttons\n- Settings submenu\n- Quit confirmation' : ''}
${args.componentType === 'hud' ? '- Health bar\n- Score display\n- Mini-map placeholder\n- Responsive layout' : ''}
${args.componentType === 'dialog' ? '- Text display with typewriter effect\n- Character portrait\n- Choice buttons\n- Skip functionality' : ''}
${args.componentType === 'inventory' ? '- Grid-based item slots\n- Drag and drop support\n- Item tooltips\n- Category filters' : ''}
${args.componentType === 'settings' ? '- Audio sliders\n- Graphics options\n- Key rebinding\n- Save/Load settings' : ''}

Please provide both the scene structure and the GDScript code.`,
        },
      },
    ],
  }),
};
