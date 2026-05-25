import { afterEach, describe, expect, it } from 'vitest';
import { webappPublicBaseUrl, webappSettingsUrl } from './webappConfig.js';

describe('webappConfig', () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it('derives public URL from WEBAPP_DOMAIN', () => {
    delete process.env.WEBAPP_PUBLIC_URL;
    process.env.WEBAPP_DOMAIN = 'bot.example.com';
    expect(webappPublicBaseUrl()).toBe('https://bot.example.com/webapp');
    expect(webappSettingsUrl()).toBe('https://bot.example.com/webapp/');
  });

  it('prefers explicit WEBAPP_PUBLIC_URL', () => {
    process.env = {
      ...env,
      WEBAPP_PUBLIC_URL: 'https://custom.example/app',
      WEBAPP_DOMAIN: 'ignored.example.com',
    };
    expect(webappPublicBaseUrl()).toBe('https://custom.example/app');
  });
});
