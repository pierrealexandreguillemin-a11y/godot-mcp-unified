/**
 * Tests for TscnValueParser module
 * ISO/IEC 29119 compliant - comprehensive unit tests
 */

import {
  parseValue,
  parseArray,
  parseDictionary,
  parseArguments,
  splitTopLevel,
  findTopLevelChar,
  isFunctionCall,
} from './TscnValueParser.js';

describe('TscnValueParser', () => {
  describe('parseValue', () => {
    it('should parse null', () => {
      expect(parseValue('null')).toBe(null);
    });

    it('should parse true boolean', () => {
      expect(parseValue('true')).toBe(true);
    });

    it('should parse false boolean', () => {
      expect(parseValue('false')).toBe(false);
    });

    it('should parse integer', () => {
      expect(parseValue('42')).toBe(42);
    });

    it('should parse negative integer', () => {
      expect(parseValue('-42')).toBe(-42);
    });

    it('should parse float', () => {
      expect(parseValue('3.14')).toBe(3.14);
    });

    it('should parse negative float', () => {
      expect(parseValue('-3.14')).toBe(-3.14);
    });

    it('should parse quoted string', () => {
      expect(parseValue('"hello world"')).toBe('hello world');
    });

    it('should parse empty quoted string', () => {
      expect(parseValue('""')).toBe('');
    });

    it('should parse array', () => {
      expect(parseValue('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should parse empty array', () => {
      expect(parseValue('[]')).toEqual([]);
    });

    it('should parse dictionary', () => {
      expect(parseValue('{"key": "value"}')).toEqual({ key: 'value' });
    });

    it('should parse empty dictionary', () => {
      expect(parseValue('{}')).toEqual({});
    });

    it('should parse function call Vector2', () => {
      const result = parseValue('Vector2(100, 200)');
      expect(result).toEqual({
        name: 'Vector2',
        args: [100, 200],
      });
    });

    it('should parse function call Vector3', () => {
      const result = parseValue('Vector3(1.0, 2.0, 3.0)');
      expect(result).toEqual({
        name: 'Vector3',
        args: [1.0, 2.0, 3.0],
      });
    });

    it('should parse function call Color', () => {
      const result = parseValue('Color(1, 0.5, 0, 1)');
      expect(result).toEqual({
        name: 'Color',
        args: [1, 0.5, 0, 1],
      });
    });

    it('should parse function call ExtResource', () => {
      const result = parseValue('ExtResource("1_script")');
      expect(result).toEqual({
        name: 'ExtResource',
        args: ['1_script'],
      });
    });

    it('should parse function call SubResource', () => {
      const result = parseValue('SubResource("2_material")');
      expect(result).toEqual({
        name: 'SubResource',
        args: ['2_material'],
      });
    });

    it('should parse nested function call', () => {
      const result = parseValue('Transform2D(Vector2(1, 0), Vector2(0, 1), Vector2(0, 0))');
      expect(result).toEqual({
        name: 'Transform2D',
        args: [
          { name: 'Vector2', args: [1, 0] },
          { name: 'Vector2', args: [0, 1] },
          { name: 'Vector2', args: [0, 0] },
        ],
      });
    });

    it('should return raw string for unknown format', () => {
      expect(parseValue('something_unknown')).toBe('something_unknown');
    });

    it('should trim whitespace', () => {
      expect(parseValue('  42  ')).toBe(42);
    });
  });

  describe('parseArray', () => {
    it('should parse simple array', () => {
      expect(parseArray('[1, 2, 3]')).toEqual([1, 2, 3]);
    });

    it('should parse array of strings', () => {
      expect(parseArray('["a", "b", "c"]')).toEqual(['a', 'b', 'c']);
    });

    it('should parse mixed array', () => {
      expect(parseArray('[1, "two", true, null]')).toEqual([1, 'two', true, null]);
    });

    it('should parse nested array', () => {
      expect(parseArray('[[1, 2], [3, 4]]')).toEqual([[1, 2], [3, 4]]);
    });

    it('should parse array with function calls', () => {
      const result = parseArray('[Vector2(1, 2), Vector2(3, 4)]');
      expect(result).toEqual([
        { name: 'Vector2', args: [1, 2] },
        { name: 'Vector2', args: [3, 4] },
      ]);
    });

    it('should parse empty array', () => {
      expect(parseArray('[]')).toEqual([]);
    });

    it('should parse array with whitespace', () => {
      expect(parseArray('[  1  ,  2  ,  3  ]')).toEqual([1, 2, 3]);
    });
  });

  describe('parseDictionary', () => {
    it('should parse simple dictionary', () => {
      expect(parseDictionary('{"key": "value"}')).toEqual({ key: 'value' });
    });

    it('should parse dictionary with multiple keys', () => {
      expect(parseDictionary('{"a": 1, "b": 2}')).toEqual({ a: 1, b: 2 });
    });

    it('should parse dictionary with mixed values', () => {
      expect(parseDictionary('{"str": "hello", "num": 42, "bool": true}')).toEqual({
        str: 'hello',
        num: 42,
        bool: true,
      });
    });

    it('should parse nested dictionary', () => {
      expect(parseDictionary('{"outer": {"inner": "value"}}')).toEqual({
        outer: { inner: 'value' },
      });
    });

    it('should parse dictionary with function call values', () => {
      const result = parseDictionary('{"pos": Vector2(1, 2)}');
      expect(result).toEqual({
        pos: { name: 'Vector2', args: [1, 2] },
      });
    });

    it('should parse empty dictionary', () => {
      expect(parseDictionary('{}')).toEqual({});
    });
  });

  describe('parseArguments', () => {
    it('should parse simple arguments', () => {
      expect(parseArguments('1, 2, 3')).toEqual([1, 2, 3]);
    });

    it('should parse string arguments', () => {
      expect(parseArguments('"a", "b"')).toEqual(['a', 'b']);
    });

    it('should parse empty arguments', () => {
      expect(parseArguments('')).toEqual([]);
    });

    it('should parse whitespace-only arguments', () => {
      expect(parseArguments('   ')).toEqual([]);
    });

    it('should parse arguments with nested parentheses', () => {
      const result = parseArguments('Vector2(1, 2), 3');
      expect(result).toEqual([{ name: 'Vector2', args: [1, 2] }, 3]);
    });
  });

  describe('splitTopLevel', () => {
    it('should split by comma', () => {
      expect(splitTopLevel('a, b, c', ',')).toEqual(['a', ' b', ' c']);
    });

    it('should not split inside quotes', () => {
      expect(splitTopLevel('"a, b", c', ',')).toEqual(['"a, b"', ' c']);
    });

    it('should not split inside parentheses', () => {
      expect(splitTopLevel('f(a, b), c', ',')).toEqual(['f(a, b)', ' c']);
    });

    it('should not split inside brackets', () => {
      expect(splitTopLevel('[a, b], c', ',')).toEqual(['[a, b]', ' c']);
    });

    it('should not split inside braces', () => {
      expect(splitTopLevel('{a: b}, c', ',')).toEqual(['{a: b}', ' c']);
    });

    it('should handle nested brackets', () => {
      expect(splitTopLevel('[[a, b], [c, d]], e', ',')).toEqual(['[[a, b], [c, d]]', ' e']);
    });

    it('should return single element for no delimiter', () => {
      expect(splitTopLevel('abc', ',')).toEqual(['abc']);
    });

    it('should handle empty string', () => {
      expect(splitTopLevel('', ',')).toEqual([]);
    });
  });

  describe('findTopLevelChar', () => {
    it('should find character at top level', () => {
      expect(findTopLevelChar('a:b', ':')).toBe(1);
    });

    it('should not find character inside quotes', () => {
      expect(findTopLevelChar('"a:b":c', ':')).toBe(5);
    });

    it('should not find character inside parentheses', () => {
      expect(findTopLevelChar('(a:b):c', ':')).toBe(5);
    });

    it('should not find character inside brackets', () => {
      expect(findTopLevelChar('[a:b]:c', ':')).toBe(5);
    });

    it('should not find character inside braces', () => {
      expect(findTopLevelChar('{a:b}:c', ':')).toBe(5);
    });

    it('should return -1 if character not found', () => {
      expect(findTopLevelChar('abc', ':')).toBe(-1);
    });

    it('should handle nested structures', () => {
      expect(findTopLevelChar('[[a:b]]:c', ':')).toBe(7);
    });
  });

  describe('isFunctionCall', () => {
    it('should return true for function call', () => {
      expect(isFunctionCall({ name: 'Vector2', args: [1, 2] })).toBe(true);
    });

    it('should return false for null', () => {
      expect(isFunctionCall(null)).toBe(false);
    });

    it('should return false for number', () => {
      expect(isFunctionCall(42)).toBe(false);
    });

    it('should return false for string', () => {
      expect(isFunctionCall('hello')).toBe(false);
    });

    it('should return false for boolean', () => {
      expect(isFunctionCall(true)).toBe(false);
    });

    it('should return false for array', () => {
      expect(isFunctionCall([1, 2, 3])).toBe(false);
    });

    it('should return false for plain object', () => {
      expect(isFunctionCall({ key: 'value' })).toBe(false);
    });

    it('should return false for object with only name', () => {
      expect(isFunctionCall({ name: 'test' })).toBe(false);
    });

    it('should return false for object with only args', () => {
      expect(isFunctionCall({ args: [1, 2] })).toBe(false);
    });
  });
});
