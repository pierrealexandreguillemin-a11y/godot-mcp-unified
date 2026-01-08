/**
 * Create Projectile Prompt
 * @module prompts/definitions/gameplay
 */

import { RegisteredPrompt } from '../../domain/types.js';

export const createProjectile: RegisteredPrompt = {
  definition: {
    name: 'create_projectile',
    description: 'Generate a projectile scene with physics and damage',
    category: 'gameplay',
    arguments: [
      {
        name: 'projectileType',
        description: 'Type: bullet, rocket, arrow, magic, grenade',
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
    description: `Create ${args.projectileType} projectile`,
    messages: [
      {
        role: 'user',
        content: {
          type: 'text',
          text: `Create a ${args.projectileType} projectile for Godot 4.x (${args.is3D === 'true' ? '3D' : '2D'}).

Please create:
1. **Projectile Scene Structure**
   - ${args.is3D === 'true' ? 'Area3D' : 'Area2D'} or ${args.is3D === 'true' ? 'RigidBody3D' : 'RigidBody2D'} root
   - ${args.is3D === 'true' ? 'CollisionShape3D' : 'CollisionShape2D'}
   - ${args.is3D === 'true' ? 'MeshInstance3D' : 'Sprite2D'} for visuals
   - ${args.is3D === 'true' ? 'GPUParticles3D' : 'GPUParticles2D'} for trail

2. **Projectile Script**
   - @export speed, damage, lifetime
   - Movement in _physics_process
   - Collision detection
   - Damage application on hit
   - Auto-destroy after lifetime

3. **Projectile-Specific Behavior**
${args.projectileType === 'bullet' ? '   - Fast, straight trajectory\n   - Hitscan or physics-based\n   - Impact particles' : ''}
${args.projectileType === 'rocket' ? '   - Slower with area damage\n   - Explosion on impact\n   - Smoke trail' : ''}
${args.projectileType === 'arrow' ? '   - Arc trajectory (gravity)\n   - Stick on impact\n   - Quiver system' : ''}
${args.projectileType === 'magic' ? '   - Homing capability\n   - Particle effects\n   - Mana cost integration' : ''}
${args.projectileType === 'grenade' ? '   - Throw arc with physics\n   - Timed explosion\n   - Bounce behavior' : ''}

4. **Signals**
   - hit(target, damage)
   - expired()

Use tools: create_scene, add_node, write_script, setup_rigidbody, create_gpu_particles`,
        },
      },
    ],
  }),
};
