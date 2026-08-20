import { afterEach, describe, expect, it } from 'vitest';

import { PUBLIC_ENV_VARIABLE_NAME } from '../constants';

import { getEnv } from './index';

type MutableGlobal = Record<string, unknown>;

function setPublicEnv(value: Record<string, unknown> | undefined): void {
  if (value === undefined) {
    delete (globalThis as MutableGlobal)[PUBLIC_ENV_VARIABLE_NAME];
  } else {
    (globalThis as MutableGlobal)[PUBLIC_ENV_VARIABLE_NAME] = value;
  }
}

afterEach(() => {
  setPublicEnv(undefined);
});

describe('getEnv', () => {
  it('returns the value when present', () => {
    setPublicEnv({
      api_url: 'https://api.example.com',
      analytics_enabled: true,
    });
    expect(getEnv('api_url')).toBe('https://api.example.com');
    expect(getEnv('analytics_enabled')).toBe(true);
  });

  it('returns null for an unset optional variable (no fallback)', () => {
    setPublicEnv({ analytics_enabled: null });
    expect(getEnv('analytics_enabled')).toBeNull();
  });

  it('throws when no public environment is available', () => {
    setPublicEnv(undefined);
    expect(() => getEnv('api_url')).toThrow(/no public environment/);
  });

  it('throws for an unknown key', () => {
    setPublicEnv({ api_url: 'x' });
    expect(() => getEnv('missing')).toThrow(
      /not a public environment variable/,
    );
  });

  describe('with a fallback', () => {
    it('returns the value when present (fallback ignored)', () => {
      setPublicEnv({ analytics_enabled: true });
      expect(getEnv('analytics_enabled', false)).toBe(true);
    });

    it('returns the fallback when the value is null (unset optional)', () => {
      setPublicEnv({ analytics_enabled: null });
      expect(getEnv('analytics_enabled', false)).toBe(false);
    });

    it('returns the fallback when no public environment is available', () => {
      setPublicEnv(undefined);
      expect(getEnv('api_url', 'https://default')).toBe('https://default');
    });

    it('returns the fallback for an unknown key', () => {
      setPublicEnv({ api_url: 'x' });
      expect(getEnv('missing', 'default')).toBe('default');
    });

    it('does not treat a falsy value as absent', () => {
      setPublicEnv({ count: 0, flag: false, name: '' });
      expect(getEnv('count', 42)).toBe(0);
      expect(getEnv('flag', true)).toBe(false);
      expect(getEnv('name', 'fallback')).toBe('');
    });
  });
});
