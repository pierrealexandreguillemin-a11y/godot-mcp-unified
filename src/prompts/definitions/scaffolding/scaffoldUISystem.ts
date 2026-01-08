/**
 * Scaffold UI System Prompt
 * @module prompts/definitions/scaffolding
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const scaffoldUISystem: RegisteredPrompt = {
  definition: {
    name: 'scaffold_ui_system',
    description: 'Generate a complete UI system with menus, HUD, and transitions',
    category: 'scaffolding',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the project',
        required: true,
      },
      {
        name: 'components',
        description: 'Components: main_menu, pause_menu, hud, settings, loading',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Scaffold UI system: ${args.projectName}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a complete UI system for "${args.projectName}".

Components to include: ${args.components || 'main_menu, pause_menu, hud, settings'}

Please create:
1. **UI Structure**
   - res://scenes/ui/
     - main_menu.tscn
     - pause_menu.tscn
     - hud.tscn
     - settings_menu.tscn
     - loading_screen.tscn
   - res://scripts/ui/
     - UIManager.gd (autoload)
     - BaseMenu.gd (base class)

2. **UI Manager Autoload**
   - Scene stack for navigation
   - Transition animations
   - Input mode switching
   - Pause handling

3. **Components**
${args.components?.includes('main_menu') ? '   - Main menu with Play, Settings, Quit\n   - Button hover/click effects\n   - Background animation' : ''}
${args.components?.includes('pause_menu') ? '   - Pause overlay with blur\n   - Resume, Settings, Main Menu\n   - Time scale handling' : ''}
${args.components?.includes('hud') ? '   - Health/mana bars\n   - Score/currency display\n   - Minimap placeholder\n   - Responsive anchoring' : ''}
${args.components?.includes('settings') ? '   - Audio volume sliders\n   - Graphics quality options\n   - Key rebinding\n   - Settings persistence' : ''}
${args.components?.includes('loading') ? '   - Progress bar\n   - Loading tips\n   - Async scene loading' : ''}

4. **Theme System**
   - Base theme resource
   - Consistent styling
   - Font configuration

Use tools: create_scene, add_node, write_script, create_ui_container, create_control`,
        },
      },
    ],
  }),
};
