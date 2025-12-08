/**
 * Set Project Setting Tool
 * Modifies a setting in project.godot
 *
 * ISO/IEC 25010 compliant - strict typing
 */

import { ToolDefinition, ToolResponse, BaseToolArgs, ProjectToolArgs } from '../../server/types.js';
import {
  prepareToolArgs,
  validateBasicArgs,
  validateProjectPath,
  createSuccessResponse,
} from '../BaseToolHandler.js';
import { createErrorResponse } from '../../utils/ErrorHandler.js';
import { logDebug } from '../../utils/Logger.js';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

export interface SetProjectSettingArgs extends ProjectToolArgs {
  key: string;
  value: string;
  section?: string;
}

export const setProjectSettingDefinition: ToolDefinition = {
  name: 'set_project_setting',
  description: 'Set or modify a setting in project.godot',
  inputSchema: {
    type: 'object',
    properties: {
      projectPath: {
        type: 'string',
        description: 'Path to the Godot project directory',
      },
      key: {
        type: 'string',
        description: 'Setting key (e.g., "config/name" for [application] section)',
      },
      value: {
        type: 'string',
        description: 'Value to set (will be quoted if string)',
      },
      section: {
        type: 'string',
        description: 'Section name (e.g., "application"). Required for new keys.',
      },
    },
    required: ['projectPath', 'key', 'value'],
  },
};

interface ParsedLine {
  type: 'section' | 'setting' | 'comment' | 'empty';
  section?: string;
  key?: string;
  value?: string;
  raw: string;
}

/**
 * Parse project.godot into structured lines
 */
function parseLines(content: string): ParsedLine[] {
  const lines = content.split(/\r?\n/);
  const parsed: ParsedLine[] = [];
  let currentSection = '';

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      parsed.push({ type: 'empty', raw: line });
      continue;
    }

    if (trimmed.startsWith(';')) {
      parsed.push({ type: 'comment', raw: line });
      continue;
    }

    const sectionMatch = trimmed.match(/^\[([^\]]+)\]$/);
    if (sectionMatch) {
      currentSection = sectionMatch[1];
      parsed.push({ type: 'section', section: currentSection, raw: line });
      continue;
    }

    const kvMatch = trimmed.match(/^([^=]+)=(.*)$/);
    if (kvMatch) {
      parsed.push({
        type: 'setting',
        section: currentSection,
        key: kvMatch[1].trim(),
        value: kvMatch[2].trim(),
        raw: line,
      });
      continue;
    }

    // Unknown line, preserve as-is
    parsed.push({ type: 'empty', raw: line });
  }

  return parsed;
}

/**
 * Format a value for project.godot
 */
function formatValue(value: string): string {
  // Check if it's already formatted (starts with special characters)
  if (
    value.startsWith('"') ||
    value.startsWith('Vector') ||
    value.startsWith('Color') ||
    value.startsWith('SubResource') ||
    value.startsWith('ExtResource') ||
    value === 'true' ||
    value === 'false' ||
    !isNaN(Number(value))
  ) {
    return value;
  }

  // Quote string values
  return `"${value}"`;
}

/**
 * Serialize parsed lines back to string
 */
function serializeLines(lines: ParsedLine[]): string {
  return lines.map((l) => {
    if (l.type === 'setting' && l.key !== undefined && l.value !== undefined) {
      return `${l.key}=${l.value}`;
    }
    return l.raw;
  }).join('\n');
}

export const handleSetProjectSetting = async (args: BaseToolArgs): Promise<ToolResponse> => {
  const preparedArgs = prepareToolArgs(args);

  const validationError = validateBasicArgs(preparedArgs, ['projectPath', 'key', 'value']);
  if (validationError) {
    return createErrorResponse(validationError, [
      'Provide projectPath, key, and value',
    ]);
  }

  const typedArgs = preparedArgs as SetProjectSettingArgs;

  const projectValidationError = validateProjectPath(typedArgs.projectPath);
  if (projectValidationError) {
    return projectValidationError;
  }

  try {
    const projectGodotPath = join(typedArgs.projectPath, 'project.godot');
    logDebug(`Modifying project setting: ${typedArgs.key} in ${projectGodotPath}`);

    const content = readFileSync(projectGodotPath, 'utf-8');
    const lines = parseLines(content);

    // Determine target section
    let targetSection = typedArgs.section || '';
    const keyParts = typedArgs.key.split('/');

    // If key looks like "section/subsection/key", extract section
    if (keyParts.length > 1 && !targetSection) {
      // Common patterns: application/config/name -> section=application, key=config/name
      const commonSections = ['application', 'display', 'rendering', 'physics', 'audio', 'input', 'editor', 'autoload'];
      if (commonSections.includes(keyParts[0])) {
        targetSection = keyParts[0];
      }
    }

    const formattedValue = formatValue(typedArgs.value);
    const settingKey = targetSection && typedArgs.key.startsWith(`${targetSection}/`)
      ? typedArgs.key.slice(targetSection.length + 1)
      : typedArgs.key;

    let found = false;
    let sectionFound = false;
    let lastSectionIndex = -1;

    // Find and update existing setting
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.type === 'section') {
        if (line.section === targetSection) {
          sectionFound = true;
          lastSectionIndex = i;
        } else if (sectionFound && lastSectionIndex >= 0) {
          // We've passed the target section
          break;
        }
      }

      if (line.type === 'setting' && line.section === targetSection && line.key === settingKey) {
        lines[i].value = formattedValue;
        found = true;
        break;
      }

      if (line.section === targetSection) {
        lastSectionIndex = i;
      }
    }

    // If not found, add new setting
    if (!found) {
      if (targetSection && !sectionFound) {
        // Add new section at end
        lines.push({ type: 'empty', raw: '' });
        lines.push({ type: 'section', section: targetSection, raw: `[${targetSection}]` });
        lines.push({
          type: 'setting',
          section: targetSection,
          key: settingKey,
          value: formattedValue,
          raw: `${settingKey}=${formattedValue}`,
        });
      } else if (lastSectionIndex >= 0) {
        // Insert after last line in section
        const insertIndex = lastSectionIndex + 1;
        lines.splice(insertIndex, 0, {
          type: 'setting',
          section: targetSection,
          key: settingKey,
          value: formattedValue,
          raw: `${settingKey}=${formattedValue}`,
        });
      } else {
        // Add at end of file
        lines.push({
          type: 'setting',
          section: targetSection,
          key: settingKey,
          value: formattedValue,
          raw: `${settingKey}=${formattedValue}`,
        });
      }
    }

    const newContent = serializeLines(lines);
    writeFileSync(projectGodotPath, newContent, 'utf-8');

    return createSuccessResponse(
      `Project setting ${found ? 'updated' : 'added'} successfully!\n` +
      `Key: ${targetSection ? `[${targetSection}] ` : ''}${settingKey}\n` +
      `Value: ${formattedValue}`
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return createErrorResponse(`Failed to set project setting: ${errorMessage}`, [
      'Ensure the project path is correct',
      'Check project.godot exists and is writable',
    ]);
  }
};
