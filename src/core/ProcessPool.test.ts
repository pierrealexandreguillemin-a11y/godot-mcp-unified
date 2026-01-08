/**
 * ProcessPool Tests
 * ISO/IEC 29119 compliant test structure
 * Focus on security validation (OWASP A01:2021)
 */

import { validateCommandSecurity } from './ProcessPool.js';

describe('ProcessPool', () => {
  describe('validateCommandSecurity', () => {
    describe('valid commands', () => {
      it('should accept simple command', () => {
        expect(() => validateCommandSecurity('godot', ['--version'])).not.toThrow();
      });

      it('should accept Windows path with backslashes', () => {
        expect(() =>
          validateCommandSecurity('C:\\Program Files\\Godot\\godot.exe', ['--version'])
        ).not.toThrow();
      });

      it('should accept Unix path with forward slashes', () => {
        expect(() =>
          validateCommandSecurity('/usr/bin/godot', ['--version'])
        ).not.toThrow();
      });

      it('should accept paths with spaces', () => {
        expect(() =>
          validateCommandSecurity('C:\\Program Files\\Godot 4\\godot.exe', ['--project', 'C:\\My Projects\\game'])
        ).not.toThrow();
      });

      it('should accept valid arguments', () => {
        expect(() =>
          validateCommandSecurity('godot', ['--headless', '--path', '/home/user/project', '--export', 'Windows'])
        ).not.toThrow();
      });

      it('should accept arguments with equals sign', () => {
        expect(() =>
          validateCommandSecurity('godot', ['--resolution=1920x1080'])
        ).not.toThrow();
      });

      it('should accept arguments with dashes', () => {
        expect(() =>
          validateCommandSecurity('godot', ['--export-debug', '--verbose'])
        ).not.toThrow();
      });
    });

    describe('shell metacharacter injection', () => {
      it('should reject semicolon in command', () => {
        expect(() => validateCommandSecurity('godot; rm -rf /', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject pipe in command', () => {
        expect(() => validateCommandSecurity('godot | cat', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject ampersand in command', () => {
        expect(() => validateCommandSecurity('godot & malware', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject backtick in command', () => {
        expect(() => validateCommandSecurity('godot`whoami`', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject dollar sign in command', () => {
        expect(() => validateCommandSecurity('godot$PATH', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject parentheses in command', () => {
        expect(() => validateCommandSecurity('godot()', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject curly braces in command', () => {
        expect(() => validateCommandSecurity('godot{test}', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject square brackets in command', () => {
        expect(() => validateCommandSecurity('godot[0]', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject less than in command', () => {
        expect(() => validateCommandSecurity('godot < input.txt', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject greater than in command', () => {
        expect(() => validateCommandSecurity('godot > output.txt', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject exclamation in command', () => {
        expect(() => validateCommandSecurity('godot!', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject asterisk in command', () => {
        expect(() => validateCommandSecurity('godot*', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject question mark in command', () => {
        expect(() => validateCommandSecurity('godot?', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject hash in command', () => {
        expect(() => validateCommandSecurity('godot#comment', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject tilde in command', () => {
        expect(() => validateCommandSecurity('~/godot', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject newline in command', () => {
        expect(() => validateCommandSecurity('godot\nmalware', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });

      it('should reject carriage return in command', () => {
        expect(() => validateCommandSecurity('godot\rmalware', [])).toThrow(
          'Invalid command: contains shell metacharacters'
        );
      });
    });

    describe('argument injection', () => {
      it('should reject semicolon in argument', () => {
        expect(() => validateCommandSecurity('godot', ['--version; rm -rf /'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject pipe in argument', () => {
        expect(() => validateCommandSecurity('godot', ['| cat /etc/passwd'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject double pipe (OR) in argument', () => {
        // | is caught by SHELL_METACHARACTERS first
        expect(() => validateCommandSecurity('godot', ['test || malware'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject double ampersand (AND) in argument', () => {
        // & is caught by SHELL_METACHARACTERS first
        expect(() => validateCommandSecurity('godot', ['test && malware'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject output redirection in argument', () => {
        // > is caught by SHELL_METACHARACTERS
        expect(() => validateCommandSecurity('godot', ['> /etc/passwd'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject append redirection in argument', () => {
        // > is caught by SHELL_METACHARACTERS
        expect(() => validateCommandSecurity('godot', ['>> /etc/passwd'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject input redirection in argument', () => {
        // < is caught by SHELL_METACHARACTERS
        expect(() => validateCommandSecurity('godot', ['< /etc/passwd'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject heredoc in argument', () => {
        // < is caught by SHELL_METACHARACTERS
        expect(() => validateCommandSecurity('godot', ['<< EOF'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });

      it('should reject file descriptor redirection in argument', () => {
        // > is caught by SHELL_METACHARACTERS
        expect(() => validateCommandSecurity('godot', ['2>&1'])).toThrow(
          'Invalid argument: contains shell metacharacters'
        );
      });
    });

    describe('path traversal', () => {
      it('should reject path traversal in command', () => {
        expect(() => validateCommandSecurity('../../../bin/sh', [])).toThrow(
          'Invalid command: path traversal detected'
        );
      });

      it('should reject path traversal in Windows command', () => {
        expect(() => validateCommandSecurity('..\\..\\windows\\system32\\cmd.exe', [])).toThrow(
          'Invalid command: path traversal detected'
        );
      });

      it('should allow relative paths in arguments', () => {
        // Arguments can contain .. for legitimate relative paths
        expect(() => validateCommandSecurity('godot', ['--path', '../other-project'])).not.toThrow();
      });
    });

    describe('edge cases', () => {
      it('should handle empty command', () => {
        expect(() => validateCommandSecurity('', [])).not.toThrow();
      });

      it('should handle empty arguments', () => {
        expect(() => validateCommandSecurity('godot', [])).not.toThrow();
      });

      it('should handle empty string argument', () => {
        expect(() => validateCommandSecurity('godot', [''])).not.toThrow();
      });

      it('should handle multiple valid arguments', () => {
        expect(() =>
          validateCommandSecurity('godot', [
            '--headless',
            '--path',
            '/project',
            '--export',
            'Linux',
            '--verbose',
          ])
        ).not.toThrow();
      });

      it('should detect injection in any argument position', () => {
        expect(() =>
          validateCommandSecurity('godot', ['--valid', '--also-valid', '; malware'])
        ).toThrow('Invalid argument: contains shell metacharacters');
      });
    });
  });
});
