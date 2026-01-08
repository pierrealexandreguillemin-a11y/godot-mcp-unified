/**
 * Scene & Script Resource Provider
 * Provides MCP Resources for Godot scenes and scripts
 *
 * Resources:
 * - godot://scenes - List all scenes
 * - godot://scene/{path} - Scene content
 * - godot://scene/{path}/tree - Scene node tree
 * - godot://scripts - List all scripts
 * - godot://script/{path} - Script content
 * - godot://script/errors - Script compilation errors
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname, relative } from 'path';
import { ResourceProvider, GodotResource, ResourceContent, RESOURCE_URIS, getMimeType, validateSceneUri, validateScriptUri, validatePathWithinProject } from '../types.js';
import { isGodotProject } from '../../utils/FileUtils.js';
import { parseTscn, TscnNode } from '../../core/TscnParser.js';

/**
 * Recursively find files with specific extensions
 */
function findFiles(dir: string, extensions: string[], maxDepth = 10): string[] {
  const files: string[] = [];

  function scan(currentDir: string, depth: number): void {
    if (depth > maxDepth) return;

    try {
      const entries = readdirSync(currentDir);
      for (const entry of entries) {
        if (entry.startsWith('.') || entry === 'addons' || entry === '.godot') continue;

        const fullPath = join(currentDir, entry);
        const stat = statSync(fullPath);

        if (stat.isDirectory()) {
          scan(fullPath, depth + 1);
        } else if (extensions.includes(extname(entry).toLowerCase())) {
          files.push(fullPath);
        }
      }
    } catch {
      // Ignore permission errors
    }
  }

  scan(dir, 0);
  return files;
}

export class SceneScriptResourceProvider implements ResourceProvider {
  prefix = 'scene-script';

  handlesUri(uri: string): boolean {
    return (
      uri === RESOURCE_URIS.SCENES ||
      uri.startsWith(RESOURCE_URIS.SCENE) ||
      uri === RESOURCE_URIS.SCRIPTS ||
      uri.startsWith(RESOURCE_URIS.SCRIPT) ||
      uri === RESOURCE_URIS.SCRIPT_ERRORS
    );
  }

  async listResources(projectPath: string): Promise<GodotResource[]> {
    const resources: GodotResource[] = [
      {
        uri: RESOURCE_URIS.SCENES,
        name: 'All Scenes',
        description: 'List of all .tscn scene files in the project',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.SCRIPTS,
        name: 'All Scripts',
        description: 'List of all .gd script files in the project',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.SCRIPT_ERRORS,
        name: 'Script Errors',
        description: 'GDScript compilation errors (requires running Godot)',
        mimeType: 'application/json',
      },
    ];

    if (!projectPath || !isGodotProject(projectPath)) {
      return resources;
    }

    // Add individual scene resources
    const sceneFiles = findFiles(projectPath, ['.tscn']);
    for (const scenePath of sceneFiles.slice(0, 50)) {
      // Limit to 50 scenes
      const relativePath = relative(projectPath, scenePath).replace(/\\/g, '/');
      resources.push({
        uri: `${RESOURCE_URIS.SCENE}${relativePath}`,
        name: relativePath,
        description: 'Godot scene file',
        mimeType: 'text/x-godot-scene',
      });
      resources.push({
        uri: `${RESOURCE_URIS.SCENE}${relativePath}/tree`,
        name: `${relativePath} (tree)`,
        description: 'Scene node hierarchy',
        mimeType: 'application/json',
      });
    }

    // Add individual script resources
    const scriptFiles = findFiles(projectPath, ['.gd']);
    for (const scriptPath of scriptFiles.slice(0, 50)) {
      // Limit to 50 scripts
      const relativePath = relative(projectPath, scriptPath).replace(/\\/g, '/');
      resources.push({
        uri: `${RESOURCE_URIS.SCRIPT}${relativePath}`,
        name: relativePath,
        description: 'GDScript file',
        mimeType: 'text/x-gdscript',
      });
    }

    return resources;
  }

  async readResource(projectPath: string, uri: string): Promise<ResourceContent | null> {
    if (uri === RESOURCE_URIS.SCENES) {
      return this.listAllScenes(projectPath);
    }

    if (uri === RESOURCE_URIS.SCRIPTS) {
      return this.listAllScripts(projectPath);
    }

    if (uri === RESOURCE_URIS.SCRIPT_ERRORS) {
      return this.getScriptErrors(projectPath);
    }

    // Scene: validate and extract path with security check
    if (uri.startsWith(RESOURCE_URIS.SCENE)) {
      const validation = validateSceneUri(uri);
      if (!validation.valid) {
        return this.createErrorContent(uri, validation.error);
      }
      if (validation.isTree) {
        return this.readSceneTree(projectPath, validation.path);
      }
      return this.readSceneContent(projectPath, validation.path);
    }

    // Script: validate and extract path with security check
    if (uri.startsWith(RESOURCE_URIS.SCRIPT) && uri !== RESOURCE_URIS.SCRIPT_ERRORS) {
      const validation = validateScriptUri(uri);
      if (!validation.valid) {
        return this.createErrorContent(uri, validation.error);
      }
      return this.readScriptContent(projectPath, validation.path);
    }

    return null;
  }

  private createErrorContent(uri: string, error: string): ResourceContent {
    return {
      uri,
      mimeType: 'application/json',
      text: JSON.stringify({ error, uri }, null, 2),
    };
  }

  private async listAllScenes(projectPath: string): Promise<ResourceContent | null> {
    if (!projectPath || !isGodotProject(projectPath)) {
      return {
        uri: RESOURCE_URIS.SCENES,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'No project loaded', scenes: [] }, null, 2),
      };
    }

    const sceneFiles = findFiles(projectPath, ['.tscn']);
    const scenes = sceneFiles.map((fullPath) => {
      const relativePath = relative(projectPath, fullPath).replace(/\\/g, '/');
      const stat = statSync(fullPath);
      return {
        path: `res://${relativePath}`,
        relativePath,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });

    return {
      uri: RESOURCE_URIS.SCENES,
      mimeType: 'application/json',
      text: JSON.stringify({ count: scenes.length, scenes }, null, 2),
    };
  }

  private async listAllScripts(projectPath: string): Promise<ResourceContent | null> {
    if (!projectPath || !isGodotProject(projectPath)) {
      return {
        uri: RESOURCE_URIS.SCRIPTS,
        mimeType: 'application/json',
        text: JSON.stringify({ error: 'No project loaded', scripts: [] }, null, 2),
      };
    }

    const scriptFiles = findFiles(projectPath, ['.gd']);
    const scripts = scriptFiles.map((fullPath) => {
      const relativePath = relative(projectPath, fullPath).replace(/\\/g, '/');
      const stat = statSync(fullPath);

      // Try to extract class_name
      let className: string | null = null;
      let extendsClass: string | null = null;
      try {
        const content = readFileSync(fullPath, 'utf-8');
        const classMatch = content.match(/^class_name\s+(\w+)/m);
        if (classMatch) className = classMatch[1];
        const extendsMatch = content.match(/^extends\s+(\w+)/m);
        if (extendsMatch) extendsClass = extendsMatch[1];
      } catch {
        // Ignore read errors
      }

      return {
        path: `res://${relativePath}`,
        relativePath,
        className,
        extends: extendsClass,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      };
    });

    return {
      uri: RESOURCE_URIS.SCRIPTS,
      mimeType: 'application/json',
      text: JSON.stringify({ count: scripts.length, scripts }, null, 2),
    };
  }

  private async readSceneContent(
    projectPath: string,
    scenePath: string
  ): Promise<ResourceContent | null> {
    // Security: validate path is within project
    const fullPath = validatePathWithinProject(projectPath, scenePath);
    if (!fullPath) {
      return this.createErrorContent(`${RESOURCE_URIS.SCENE}${scenePath}`, 'Path traversal detected');
    }
    if (!existsSync(fullPath)) {
      return null;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      return {
        uri: `${RESOURCE_URIS.SCENE}${scenePath}`,
        mimeType: 'text/x-godot-scene',
        text: content,
      };
    } catch {
      return null;
    }
  }

  private async readSceneTree(
    projectPath: string,
    scenePath: string
  ): Promise<ResourceContent | null> {
    // Security: validate path is within project
    const fullPath = validatePathWithinProject(projectPath, scenePath);
    if (!fullPath) {
      return this.createErrorContent(`${RESOURCE_URIS.SCENE}${scenePath}/tree`, 'Path traversal detected');
    }
    if (!existsSync(fullPath)) {
      return null;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      const doc = parseTscn(content);
      const nodes = doc.nodes;

      // Build hierarchical structure
      interface TreeNode {
        name: string;
        type: string;
        path: string;
        script?: string;
        children: TreeNode[];
      }

      const buildTree = (nodeList: TscnNode[], parentPath = ''): TreeNode[] => {
        return nodeList
          .filter((n: TscnNode) => {
            const nodePath = n.parent ? `${n.parent}/${n.name}` : n.name;
            const nodeParent = nodePath.includes('/') ? nodePath.substring(0, nodePath.lastIndexOf('/')) : '';
            return nodeParent === parentPath || (!parentPath && !n.parent);
          })
          .map((n: TscnNode) => {
            const nodePath = n.parent ? `${n.parent}/${n.name}` : n.name;
            return {
              name: n.name,
              type: n.type || 'Node',
              path: nodePath,
              script: n.script,
              children: buildTree(nodeList, nodePath),
            };
          });
      };

      const hierarchy = buildTree(nodes);

      return {
        uri: `${RESOURCE_URIS.SCENE}${scenePath}/tree`,
        mimeType: 'application/json',
        text: JSON.stringify(
          {
            scenePath,
            nodeCount: nodes.length,
            tree: hierarchy,
            flatList: nodes,
          },
          null,
          2
        ),
      };
    } catch (error) {
      return {
        uri: `${RESOURCE_URIS.SCENE}${scenePath}/tree`,
        mimeType: 'application/json',
        text: JSON.stringify({ error: String(error), scenePath }, null, 2),
      };
    }
  }

  private async readScriptContent(
    projectPath: string,
    scriptPath: string
  ): Promise<ResourceContent | null> {
    // Security: validate path is within project
    const fullPath = validatePathWithinProject(projectPath, scriptPath);
    if (!fullPath) {
      return this.createErrorContent(`${RESOURCE_URIS.SCRIPT}${scriptPath}`, 'Path traversal detected');
    }
    if (!existsSync(fullPath)) {
      return null;
    }

    try {
      const content = readFileSync(fullPath, 'utf-8');
      return {
        uri: `${RESOURCE_URIS.SCRIPT}${scriptPath}`,
        mimeType: getMimeType(scriptPath),
        text: content,
      };
    } catch {
      return null;
    }
  }

  private async getScriptErrors(_projectPath: string): Promise<ResourceContent | null> {
    // Script errors require running Godot with --check-only
    // This is a placeholder that returns empty errors
    // Real implementation would call Godot process

    return {
      uri: RESOURCE_URIS.SCRIPT_ERRORS,
      mimeType: 'application/json',
      text: JSON.stringify(
        {
          note: 'Run Godot with --check-only for actual errors',
          errors: [],
          warnings: [],
        },
        null,
        2
      ),
    };
  }
}
