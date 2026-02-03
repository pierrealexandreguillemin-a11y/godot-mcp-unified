/**
 * Config Parser Unit Tests
 * ISO/IEC 29119 compliant test structure
 * Tests for parseProjectGodot and parseExportPresets
 */

import {
  parseProjectGodot,
  parseExportPresets,
  type ProjectSetting,
  type ParsedProjectGodot,
} from './configParser.js';

describe('configParser', () => {
  describe('parseProjectGodot', () => {
    it('should parse empty content', () => {
      const result = parseProjectGodot('');

      expect(result.settings).toEqual([]);
      expect(result.configVersion).toBe(5);
    });

    it('should parse content with only whitespace and blank lines', () => {
      const result = parseProjectGodot('  \n\n  \n');

      expect(result.settings).toEqual([]);
      expect(result.configVersion).toBe(5);
    });

    it('should skip comment lines starting with semicolon', () => {
      const content = `; This is a comment
; Another comment
[application]
name="Test"`;

      const result = parseProjectGodot(content);

      expect(result.settings).toHaveLength(1);
      expect(result.settings[0].key).toBe('application/name');
    });

    it('should parse config_version from root section', () => {
      const content = `config_version=4

[application]
name="MyGame"`;

      const result = parseProjectGodot(content);

      expect(result.configVersion).toBe(4);
    });

    it('should default configVersion to 5 when not present', () => {
      const content = `[application]
name="MyGame"`;

      const result = parseProjectGodot(content);

      expect(result.configVersion).toBe(5);
    });

    it('should default configVersion to 5 when parsing fails', () => {
      const content = `config_version=notanumber`;

      const result = parseProjectGodot(content);

      // parseInt("notanumber", 10) returns NaN, || 5 fallback
      expect(result.configVersion).toBe(5);
    });

    it('should parse section headers', () => {
      const content = `[application]
name="MyGame"

[display]
width=1920`;

      const result = parseProjectGodot(content);

      expect(result.settings).toHaveLength(2);
      expect(result.settings[0].section).toBe('application');
      expect(result.settings[1].section).toBe('display');
    });

    it('should parse key-value pairs within sections', () => {
      const content = `[application]
config/name="My Godot Game"
run/main_scene="res://main.tscn"`;

      const result = parseProjectGodot(content);

      expect(result.settings).toHaveLength(2);
      expect(result.settings[0].key).toBe('application/config/name');
      expect(result.settings[0].value).toBe('My Godot Game');
      expect(result.settings[1].key).toBe('application/run/main_scene');
      expect(result.settings[1].value).toBe('res://main.tscn');
    });

    it('should strip quotes from string values', () => {
      const content = `[application]
name="Quoted Value"`;

      const result = parseProjectGodot(content);

      expect(result.settings[0].value).toBe('Quoted Value');
      expect(result.settings[0].rawValue).toBe('"Quoted Value"');
    });

    it('should preserve non-quoted values as-is', () => {
      const content = `[display]
width=1920
fullscreen=true`;

      const result = parseProjectGodot(content);

      expect(result.settings[0].value).toBe('1920');
      expect(result.settings[0].rawValue).toBe('1920');
      expect(result.settings[1].value).toBe('true');
    });

    it('should assign root section key without prefix for root settings', () => {
      const content = `config_version=5
some_setting="value"`;

      const result = parseProjectGodot(content);

      expect(result.settings[0].section).toBe('root');
      expect(result.settings[0].key).toBe('config_version');
      expect(result.settings[1].section).toBe('root');
      expect(result.settings[1].key).toBe('some_setting');
    });

    it('should handle Windows-style line endings (CRLF)', () => {
      const content = `[application]\r\nname="Test"\r\nversion="1.0"`;

      const result = parseProjectGodot(content);

      expect(result.settings).toHaveLength(2);
      expect(result.settings[0].value).toBe('Test');
      expect(result.settings[1].value).toBe('1.0');
    });

    it('should handle multiple sections in a full project.godot file', () => {
      const content = `; Engine configuration file
config_version=5

[application]
config/name="Platformer"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.2", "Forward Plus")

[display]
window/size/viewport_width=1280
window/size/viewport_height=720

[input]
jump={"deadzone": 0.5, "events": []}`;

      const result = parseProjectGodot(content);

      expect(result.configVersion).toBe(5);
      // config_version + 3 application + 2 display + 1 input = 7
      expect(result.settings).toHaveLength(7);
      expect(result.settings.find(s => s.key === 'application/config/name')?.value).toBe('Platformer');
      expect(result.settings.find(s => s.key === 'display/window/size/viewport_width')?.value).toBe('1280');
    });

    it('should handle values containing equals signs', () => {
      const content = `[application]
config/features=PackedStringArray("key=value")`;

      const result = parseProjectGodot(content);

      expect(result.settings[0].key).toBe('application/config/features');
      // The value is everything after the first =
      expect(result.settings[0].rawValue).toBe('PackedStringArray("key=value")');
    });

    it('should handle empty section with no key-value pairs', () => {
      const content = `[empty_section]

[filled_section]
key=value`;

      const result = parseProjectGodot(content);

      expect(result.settings).toHaveLength(1);
      expect(result.settings[0].section).toBe('filled_section');
    });

    it('should handle value that starts with quote but does not end with one', () => {
      const content = `[test]
key="partial`;

      const result = parseProjectGodot(content);

      // Should NOT strip quotes since it doesn't end with a quote
      expect(result.settings[0].value).toBe('"partial');
      expect(result.settings[0].rawValue).toBe('"partial');
    });

    it('should handle value that is just double quotes (empty string)', () => {
      const content = `[test]
key=""`;

      const result = parseProjectGodot(content);

      expect(result.settings[0].value).toBe('');
      expect(result.settings[0].rawValue).toBe('""');
    });
  });

  describe('parseExportPresets', () => {
    it('should return empty array for empty content', () => {
      const result = parseExportPresets('');

      expect(result).toEqual([]);
    });

    it('should return empty array for content with only comments', () => {
      const result = parseExportPresets('; Just a comment\n; Another comment');

      expect(result).toEqual([]);
    });

    it('should parse a single preset', () => {
      const content = `[preset.0]
name="Windows Desktop"
platform="Windows Desktop"
custom_features=""
export_filter="all_resources"`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(1);
      expect(result[0]['name']).toBe('Windows Desktop');
      expect(result[0]['platform']).toBe('Windows Desktop');
      expect(result[0]['custom_features']).toBe('');
      expect(result[0]['export_filter']).toBe('all_resources');
    });

    it('should parse multiple presets', () => {
      const content = `[preset.0]
name="Windows"
platform="Windows Desktop"

[preset.1]
name="Linux"
platform="Linux/X11"

[preset.2]
name="macOS"
platform="macOS"`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(3);
      expect(result[0]['name']).toBe('Windows');
      expect(result[1]['name']).toBe('Linux');
      expect(result[2]['name']).toBe('macOS');
    });

    it('should strip quotes from preset values', () => {
      const content = `[preset.0]
name="Quoted Name"
runnable=true`;

      const result = parseExportPresets(content);

      expect(result[0]['name']).toBe('Quoted Name');
      expect(result[0]['runnable']).toBe('true');
    });

    it('should skip comment lines within presets', () => {
      const content = `[preset.0]
; This is a comment
name="Test"
; Another comment
platform="Windows"`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(1);
      expect(result[0]['name']).toBe('Test');
      expect(result[0]['platform']).toBe('Windows');
    });

    it('should skip blank lines within presets', () => {
      const content = `[preset.0]

name="Test"

platform="Windows"
`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(1);
      expect(result[0]['name']).toBe('Test');
    });

    it('should handle key-value pairs with equals in value', () => {
      const content = `[preset.0]
custom_features="key=value"`;

      const result = parseExportPresets(content);

      expect(result[0]['custom_features']).toBe('key=value');
    });

    it('should ignore key-value pairs before any preset header', () => {
      const content = `orphan_key="value"
[preset.0]
name="First Preset"`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(1);
      expect(result[0]['name']).toBe('First Preset');
      expect(result[0]['orphan_key']).toBeUndefined();
    });

    it('should handle last preset without trailing content', () => {
      const content = `[preset.0]
name="Only Preset"`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(1);
      expect(result[0]['name']).toBe('Only Preset');
    });

    it('should handle Windows-style line endings (CRLF)', () => {
      const content = `[preset.0]\r\nname="Test"\r\nplatform="Windows"`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(1);
      expect(result[0]['name']).toBe('Test');
    });

    it('should handle value that starts with quote but does not end with one', () => {
      const content = `[preset.0]
name="partial`;

      const result = parseExportPresets(content);

      expect(result[0]['name']).toBe('"partial');
    });

    it('should handle empty preset with no key-value pairs', () => {
      const content = `[preset.0]

[preset.1]
name="Second"`;

      const result = parseExportPresets(content);

      expect(result).toHaveLength(2);
      expect(Object.keys(result[0])).toHaveLength(0);
      expect(result[1]['name']).toBe('Second');
    });

    it('should ignore non-preset section headers', () => {
      const content = `[some_other_section]
key=value
[preset.0]
name="Preset"`;

      const result = parseExportPresets(content);

      // The [some_other_section] doesn't match [preset.N] so it's ignored
      expect(result).toHaveLength(1);
      expect(result[0]['name']).toBe('Preset');
    });
  });
});
