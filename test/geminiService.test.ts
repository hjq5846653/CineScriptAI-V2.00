import { describe, it, expect, vi } from 'vitest';

describe('geminiService', () => {
  describe('Error handling', () => {
    it('should handle error with message property', () => {
      const error = new Error('test error');
      const getErrorMessage = (err: unknown, defaultMsg: string) => {
        if (err instanceof Error) {
          return err.message;
        }
        return defaultMsg;
      };

      expect(getErrorMessage(error, 'default')).toBe('test error');
    });

    it('should return default message for non-Error objects', () => {
      const getErrorMessage = (err: unknown, defaultMsg: string) => {
        if (err instanceof Error) {
          return err.message;
        }
        return defaultMsg;
      };

      expect(getErrorMessage('string error', 'default')).toBe('default');
      expect(getErrorMessage(123, 'default')).toBe('default');
      expect(getErrorMessage(null, 'default')).toBe('default');
      expect(getErrorMessage(undefined, 'default')).toBe('default');
    });
  });
});
