/**
 * Config Parser Utility
 * Parse Godot configuration files (project.godot, export_presets.cfg)
 *
 * @module resources/utils/configParser
 */

/**
 * Parsed project setting
 */
export interface ProjectSetting {
  section: string;
  key: string;
  value: string;
  rawValue: string;
}

/**
 * Parsed project.godot result
 */
export interface ParsedProjectGodot {
  settings: ProjectSetting[];
  configVersion: number;
}

/**
 * Parse project.godot file into structured settings
 */
export function parseProjectGodot(content: string): ParsedProjectGodot {
  const lines = content.split(/\r?\n/);
  const settings: ProjectSetting[] = [];
  let currentSection = '';
  let configVersion = 5;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      continue;
    }

    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch) {
      const key = kvMatch[1].trim();
      const rawValue = kvMatch[2].trim();
      let value = rawValue;
      if (rawValue.startsWith('"') && rawValue.endsWith('"')) {
        value = rawValue.slice(1, -1);
      }
      if (currentSection === '' && key === 'config_version') {
        configVersion = parseInt(value, 10) || 5;
      }
      settings.push({
        section: currentSection || 'root',
        key: currentSection ? `${currentSection}/${key}` : key,
        value,
        rawValue,
      });
    }
  }

  return { settings, configVersion };
}

/**
 * Parse export_presets.cfg file
 */
export function parseExportPresets(content: string): Record<string, string>[] {
  const presets: Record<string, string>[] = [];
  const lines = content.split(/\r?\n/);
  let currentPreset: Record<string, string> | null = null;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith(';')) continue;

    if (trimmed.match(/^\[preset\.\d+\]$/)) {
      if (currentPreset) presets.push(currentPreset);
      currentPreset = {};
      continue;
    }

    if (currentPreset) {
      const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
      if (kvMatch) {
        const key = kvMatch[1].trim();
        let value = kvMatch[2].trim();
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.slice(1, -1);
        }
        currentPreset[key] = value;
      }
    }
  }

  if (currentPreset) presets.push(currentPreset);
  return presets;
}
