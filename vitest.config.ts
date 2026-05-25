import { defineConfig } from 'vitest/config';

/**
 * Исключения из coverage: точки входа, Telegraf, доставка в Telegram, сырой OpenRouter.
 * Пороги — на тестируемую бизнес-логику; доставка и деплой не меняются.
 */
const COVERAGE_EXCLUDE = [
  'src/**/*.test.ts',
  'src/bot.ts',
  'src/handlers/**',
  'src/dayPushScheduler.ts',
  'src/cardOfDayDelivery.ts',
  'src/readingChunksDelivery.ts',
  'src/typingIndicator.ts',
  'src/openRouterChat.ts',
  'src/ai.ts',
  'src/prompts.ts',
  'src/deepReading/deepReadingDelivery.ts',
  'src/deepReading/prompts.ts',
  'src/db/migrateLegacyDayDraw.ts',
  'src/db/seedAdmins.ts',
  'src/webapp/webappServer.ts',
  'src/webapp/webappConfig.ts',
  'src/webapp/settingsSnapshot.ts',
  'src/sessionRecoveryCopy.ts',
];

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts'],
      exclude: COVERAGE_EXCLUDE,
      reporter: ['text', 'text-summary'],
      thresholds: {
        lines: 65,
        branches: 55,
        functions: 62,
        statements: 63,
      },
    },
  },
});
