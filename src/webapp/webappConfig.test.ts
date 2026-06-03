import { afterEach, describe, expect, it } from 'vitest';
import { webappPrivacyUrl, webappPublicBaseUrl, webappSettingsUrl } from './webappConfig.js';

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

  it('defaults privacy URL to in-app page under public base', () => {
    delete process.env.WEBAPP_PUBLIC_URL;
    delete process.env.WEBAPP_PRIVACY_URL;
    process.env.WEBAPP_DOMAIN = 'bot.example.com';
    expect(webappPrivacyUrl()).toBe('https://bot.example.com/webapp/privacy.html');
  });

  it('uses relative privacy path when public base is unknown', () => {
    delete process.env.WEBAPP_PUBLIC_URL;
    delete process.env.WEBAPP_DOMAIN;
    delete process.env.WEBAPP_PRIVACY_URL;
    expect(webappPrivacyUrl()).toBe('privacy.html');
  });

  it('respects WEBAPP_PRIVACY_URL override', () => {
    process.env.WEBAPP_PRIVACY_URL = 'https://example.com/custom-privacy';
    expect(webappPrivacyUrl()).toBe('https://example.com/custom-privacy');
  });
});
