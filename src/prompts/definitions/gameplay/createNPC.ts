/**
 * Create NPC Prompt
 * @module prompts/definitions/gameplay
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const createNPC: RegisteredPrompt = {
  definition: {
    name: 'create_npc',
    description: 'Generate an interactive NPC with dialogue and behavior',
    category: 'gameplay',
    arguments: [
      {
        name: 'npcType',
        description: 'Type: shopkeeper, quest_giver, villager, guard',
        required: true,
      },
      {
        name: 'is3D',
        description: 'true for 3D, false for 2D',
        required: false,
      },
    ],
  },
  generator: (args) => ({
    description: `Create ${args.npcType} NPC`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create an interactive ${args.npcType} NPC for Godot 4.x (${args.is3D === 'true' ? '3D' : '2D'}).

Please create:
1. **NPC Scene Structure**
   - ${args.is3D === 'true' ? 'CharacterBody3D' : 'CharacterBody2D'} root
   - ${args.is3D === 'true' ? 'CollisionShape3D' : 'CollisionShape2D'}
   - ${args.is3D === 'true' ? 'MeshInstance3D' : 'Sprite2D'} for visuals
   - ${args.is3D === 'true' ? 'Area3D' : 'Area2D'} for interaction detection
   - Label for name display

2. **NPC Script with**
   - Interaction detection (player in range)
   - Dialogue trigger
   - @export variables for customization
   - State machine (idle, talking, busy)

3. **Behavior for "${args.npcType}"**
${args.npcType === 'shopkeeper' ? '   - Shop inventory display\n   - Buy/sell transactions\n   - Price display\n   - Currency check' : ''}
${args.npcType === 'quest_giver' ? '   - Quest offering\n   - Quest status check\n   - Reward giving\n   - Multiple quest support' : ''}
${args.npcType === 'villager' ? '   - Random idle dialogue\n   - Day/night schedule\n   - Wander behavior' : ''}
${args.npcType === 'guard' ? '   - Patrol route\n   - Player detection\n   - Alert state\n   - Block passage' : ''}

4. **Signals**
   - interaction_started
   - interaction_ended
   - dialogue_finished

Use tools: create_scene, add_node, write_script, attach_script, connect_signal`,
        },
      },
    ],
  }),
};
