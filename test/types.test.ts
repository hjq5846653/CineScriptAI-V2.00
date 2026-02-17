import { describe, it, expect } from 'vitest';
import { AppState } from '../types';

describe('AppState', () => {
  it('should have correct enum values', () => {
    expect(AppState.IDLE).toBe(0);
    expect(AppState.GENERATING_SCRIPT).toBe(1);
    expect(AppState.GENERATING_IMAGES).toBe(2);
    expect(AppState.COMPLETE).toBe(3);
    expect(AppState.ERROR).toBe(4);
  });
});
