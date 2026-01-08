/**
 * Create Collectible Prompt
 * @module prompts/definitions/gameplay
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const createCollectible: RegisteredPrompt = {
  definition: {
    name: 'create_collectible',
    description: 'Generate a collectible item with pickup mechanics',
    category: 'gameplay',
    arguments: [
      {
        name: 'itemType',
        description: 'Type: coin, health, powerup, key, ammo',
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
    description: `Create ${args.itemType} collectible`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a ${args.itemType} collectible item for Godot 4.x (${args.is3D === 'true' ? '3D' : '2D'}).

Please create:
1. **Collectible Scene Structure**
   - ${args.is3D === 'true' ? 'Area3D' : 'Area2D'} root (for overlap detection)
   - ${args.is3D === 'true' ? 'CollisionShape3D' : 'CollisionShape2D'}
   - ${args.is3D === 'true' ? 'MeshInstance3D' : 'Sprite2D'} for visuals
   - AnimationPlayer for effects

2. **Visual Effects**
   - Floating/bobbing animation
   - Rotation (for 3D)
   - Sparkle particles
   - Collection animation

3. **Collectible Script**
   - @export value (amount, type)
   - On body entered → collect
   - Play collection effect
   - Queue free after delay

4. **Item-Specific Behavior**
${args.itemType === 'coin' ? '   - Add to score/currency\n   - Coin sound effect\n   - Value display' : ''}
${args.itemType === 'health' ? '   - Heal player\n   - Heal amount variable\n   - Only collect if not full' : ''}
${args.itemType === 'powerup' ? '   - Temporary effect\n   - Duration timer\n   - Effect indicator' : ''}
${args.itemType === 'key' ? '   - Add to inventory\n   - Unique key ID\n   - Check for door unlock' : ''}
${args.itemType === 'ammo' ? '   - Add to weapon ammo\n   - Ammo type selection\n   - Max ammo check' : ''}

5. **Signals**
   - collected(collector, value)

Use tools: create_scene, add_node, write_script, create_gpu_particles`,
        },
      },
    ],
  }),
};
