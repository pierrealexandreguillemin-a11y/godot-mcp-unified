/**
 * Scaffold FPS Prompt
 * @module prompts/definitions/scaffolding
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const scaffoldFPS: RegisteredPrompt = {
  definition: {
    name: 'scaffold_fps',
    description: 'Generate a 3D first-person shooter project structure',
    category: 'scaffolding',
    arguments: [
      {
        name: 'projectName',
        description: 'Name of the FPS project',
        required: true,
      },
      {
        name: 'features',
        description: 'Features: weapons, enemies, pickups, multiplayer',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Scaffold 3D FPS: ${args.projectName}`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a complete 3D first-person shooter project structure for "${args.projectName}".

Features to include: ${args.features || 'weapons, enemies, pickups'}

Please create:
1. **Project Structure**
   - res://scenes/
     - main_menu.tscn
     - levels/
     - player/fps_player.tscn
     - weapons/
     - enemies/
     - ui/
   - res://scripts/
     - player/
     - weapons/
     - enemies/
     - managers/

2. **Core Systems**
   - FPS controller (CharacterBody3D)
   - Mouse look with sensitivity
   - Weapon manager
   - Health system

3. **FPS Features**
${args.features?.includes('weapons') ? '   - Weapon switching system\n   - Shooting with raycasts\n   - Recoil and spread' : ''}
${args.features?.includes('enemies') ? '   - Enemy AI with NavMesh\n   - Damage and death' : ''}
${args.features?.includes('pickups') ? '   - Ammo and health pickups\n   - Weapon pickups' : ''}
${args.features?.includes('multiplayer') ? '   - Multiplayer spawning\n   - Network sync' : ''}

Use tools: create_scene, add_node, write_script, setup_rigidbody, create_navigation_region`,
        },
      },
    ],
  }),
};
