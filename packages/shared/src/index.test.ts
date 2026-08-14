import { describe, expect, it } from 'vitest';
import { packageName } from './index';

describe('packageName', () => {
  it('identifies this package', () => {
    expect(packageName).toBe('shared');
  });
});
