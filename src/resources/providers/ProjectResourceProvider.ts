/**
 * Project Resource Provider
 * Provides MCP Resources for Godot project information
 *
 * Resources:
 * - godot://project/info - Project metadata
 * - godot://project/settings - All project settings
 * - godot://project/settings/{section} - Settings by section
 * - godot://export/presets - Export presets
 * - godot://system/version - Godot version
 */

import { readFileSync as _readFileSync, existsSync as _existsSync } from 'fs';
import { join, basename } from 'path';
import {
  ResourceProvider,
  GodotResource,
  ResourceContent,
  RESOURCE_URIS,
  validateSectionName,
} from '../types.js';
import { isGodotProject as _isGodotProject, getProjectStructure as _getProjectStructure } from '../../utils/FileUtils.js';
import { detectGodotPath as _detectGodotPath } from '../../core/PathManager.js';
import { getGodotPool as _getGodotPool } from '../../core/ProcessPool.js';
import { parseProjectGodot, parseExportPresets } from '../utils/configParser.js';

export interface ProjectResourceDeps {
  readFileSync: (path: string, encoding: BufferEncoding) => string;
  existsSync: (path: string) => boolean;
  isGodotProject: (path: string) => boolean;
  getProjectStructure: (projectPath: string) => { scenes: number; scripts: number; assets: number; other: number };
  detectGodotPath: (customPath?: string, strictPathValidation?: boolean) => Promise<string | null>;
  getGodotPool: () => { execute: (cmd: string, args: string[], opts?: Record<string, unknown>) => Promise<{ stdout: string; stderr: string; exitCode: number | null }> };
}

const defaultProjectResourceDeps: ProjectResourceDeps = {
  readFileSync: (path: string, encoding: BufferEncoding) => _readFileSync(path, encoding) as string,
  existsSync: _existsSync,
  isGodotProject: _isGodotProject,
  getProjectStructure: _getProjectStructure,
  detectGodotPath: _detectGodotPath,
  getGodotPool: _getGodotPool,
};

export class ProjectResourceProvider implements ResourceProvider {
  prefix = 'project';

  constructor(private deps: ProjectResourceDeps = defaultProjectResourceDeps) {}

  handlesUri(uri: string): boolean {
    return (
      uri === RESOURCE_URIS.PROJECT_INFO ||
      uri === RESOURCE_URIS.PROJECT_SETTINGS ||
      uri.startsWith(RESOURCE_URIS.PROJECT_SETTINGS) ||
      uri === RESOURCE_URIS.EXPORT_PRESETS ||
      uri === RESOURCE_URIS.SYSTEM_VERSION
    );
  }

  async listResources(projectPath: string): Promise<GodotResource[]> {
    const resources: GodotResource[] = [
      {
        uri: RESOURCE_URIS.PROJECT_INFO,
        name: 'Project Info',
        description: 'Godot project metadata and structure',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.PROJECT_SETTINGS,
        name: 'Project Settings',
        description: 'All project.godot settings',
        mimeType: 'application/json',
      },
      {
        uri: RESOURCE_URIS.SYSTEM_VERSION,
        name: 'Godot Version',
        description: 'Installed Godot version',
        mimeType: 'application/json',
      },
    ];

    // Add export presets if file exists
    const exportPresetsPath = join(projectPath, 'export_presets.cfg');
    if (this.deps.existsSync(exportPresetsPath)) {
      resources.push({
        uri: RESOURCE_URIS.EXPORT_PRESETS,
        name: 'Export Presets',
        description: 'Project export configurations',
        mimeType: 'application/json',
      });
    }

    // Add section-specific resources
    if (projectPath && this.deps.isGodotProject(projectPath)) {
      try {
        const content = this.deps.readFileSync(join(projectPath, 'project.godot'), 'utf-8');
        const { settings } = parseProjectGodot(content);
        const sections = [...new Set(settings.map((s) => s.section))];

        for (const section of sections) {
          if (section !== 'root') {
            resources.push({
              uri: `${RESOURCE_URIS.PROJECT_SETTINGS}${section}`,
              name: `Settings: ${section}`,
              description: `Project settings for [${section}] section`,
              mimeType: 'application/json',
            });
          }
        }
      } catch {
        // Ignore parse errors
      }
    }

    return resources;
  }

  async readResource(projectPath: string, uri: string): Promise<ResourceContent | null> {
    if (uri === RESOURCE_URIS.PROJECT_INFO) {
      return this.readProjectInfo(projectPath);
    }

    if (uri === RESOURCE_URIS.PROJECT_SETTINGS) {
      return this.readProjectSettings(projectPath);
    }

    // Section: validate with Zod schema
    if (uri.startsWith(RESOURCE_URIS.PROJECT_SETTINGS) && uri !== RESOURCE_URIS.PROJECT_SETTINGS) {
      const rawSection = uri.replace(RESOURCE_URIS.PROJECT_SETTINGS, '');
      const validation = validateSectionName(rawSection);
      if (!validation.valid) {
        return this.createErrorContent(uri, validation.error);
      }
      return this.readProjectSettings(projectPath, validation.section);
    }

    if (uri === RESOURCE_URIS.EXPORT_PRESETS) {
      return this.readExportPresets(projectPath);
    }

    if (uri === RESOURCE_URIS.SYSTEM_VERSION) {
      return this.readGodotVersion();
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

  private async readProjectInfo(projectPath: string): Promise<ResourceContent | null> {
    if (!projectPath || !this.deps.isGodotProject(projectPath)) {
      return null;
    }

    try {
      let projectName = basename(projectPath);
      const projectFile = join(projectPath, 'project.godot');
      const content = this.deps.readFileSync(projectFile, 'utf-8');
      const nameMatch = content.match(/config\/name="([^"]+)"/);
      if (nameMatch) projectName = nameMatch[1];

      const structure = this.deps.getProjectStructure(projectPath);
      const { configVersion } = parseProjectGodot(content);

      // Extract main scene
      const mainSceneMatch = content.match(/run\/main_scene="([^"]+)"/);
      const mainScene = mainSceneMatch ? mainSceneMatch[1] : null;

      // Extract features
      const featuresMatch = content.match(/config\/features=PackedStringArray\(([^)]+)\)/);
      const features = featuresMatch
        ? featuresMatch[1].split(',').map((f) => f.trim().replace(/"/g, ''))
        : [];

      const info = { name: projectName, path: projectPath, configVersion, mainScene, features, structure };

      return {
        uri: RESOURCE_URIS.PROJECT_INFO,
        mimeType: 'application/json',
        text: JSON.stringify(info, null, 2),
      };
    } catch {
      return null;
    }
  }

  private async readProjectSettings(
    projectPath: string,
    section?: string
  ): Promise<ResourceContent | null> {
    if (!projectPath || !this.deps.isGodotProject(projectPath)) {
      return null;
    }

    try {
      const content = this.deps.readFileSync(join(projectPath, 'project.godot'), 'utf-8');
      const { settings, configVersion } = parseProjectGodot(content);

      let filteredSettings = settings;
      if (section) {
        filteredSettings = settings.filter(
          (s) => s.section === section || s.key.startsWith(`${section}/`)
        );
      }

      const sections = [...new Set(settings.map((s) => s.section))];

      const result = {
        projectPath,
        configVersion,
        section: section || 'all',
        settings: filteredSettings,
        availableSections: sections,
      };

      return {
        uri: section ? `${RESOURCE_URIS.PROJECT_SETTINGS}${section}` : RESOURCE_URIS.PROJECT_SETTINGS,
        mimeType: 'application/json',
        text: JSON.stringify(result, null, 2),
      };
    } catch {
      return null;
    }
  }

  private async readExportPresets(projectPath: string): Promise<ResourceContent | null> {
    const presetsPath = join(projectPath, 'export_presets.cfg');
    if (!this.deps.existsSync(presetsPath)) {
      return null;
    }

    try {
      const content = this.deps.readFileSync(presetsPath, 'utf-8');
      const presets = parseExportPresets(content);

      return {
        uri: RESOURCE_URIS.EXPORT_PRESETS,
        mimeType: 'application/json',
        text: JSON.stringify({ presets, count: presets.length }, null, 2),
      };
    } catch {
      return null;
    }
  }

  private async readGodotVersion(): Promise<ResourceContent | null> {
    try {
      const godotPath = await this.deps.detectGodotPath();
      if (!godotPath) {
        return {
          uri: RESOURCE_URIS.SYSTEM_VERSION,
          mimeType: 'application/json',
          text: JSON.stringify({ error: 'Godot not found', version: null }, null, 2),
        };
      }

      const pool = this.deps.getGodotPool();
      const result = await pool.execute(godotPath, ['--version'], { timeout: 10000 });

      return {
        uri: RESOURCE_URIS.SYSTEM_VERSION,
        mimeType: 'application/json',
        text: JSON.stringify({ version: result.stdout.trim(), path: godotPath }, null, 2),
      };
    } catch {
      return null;
    }
  }
}
