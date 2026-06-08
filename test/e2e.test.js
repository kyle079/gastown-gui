import { describe, it, beforeAll, afterAll, beforeEach, expect } from 'vitest';
import {
  launchBrowser,
  closeBrowser,
  createPage,
  navigateToApp,
  waitForConnection,
  switchView,
} from './setup.js';

async function headingText(page) {
  return page.$eval('main h1', (el) => el.textContent?.trim() ?? '');
}

describe('Gas Town GUI E2E Tests', () => {
  let page;

  beforeAll(async () => {
    await launchBrowser();
  });

  afterAll(async () => {
    await closeBrowser();
  });

  beforeEach(async () => {
    page = await createPage();
  });

  describe('Page Load', () => {
    it('loads the shipped React application', async () => {
      await navigateToApp(page);

      expect(await page.title()).toContain('Gas Town');
      expect(await headingText(page)).toBe('Test Town');
      expect(await page.$('aside')).not.toBeNull();
      expect(await page.evaluate(() => document.body.innerText.includes('east yard'))).toBe(true);
    });

    it('shows live activity state once the websocket opens', async () => {
      await navigateToApp(page);
      await waitForConnection(page);

      const hasLiveIndicator = await page.evaluate(() =>
        document.body.innerText.toLowerCase().includes('live'),
      );
      expect(hasLiveIndicator).toBe(true);
    });
  });

  describe('Navigation', () => {
    it('navigates to the work surface from the primary rail', async () => {
      await navigateToApp(page);
      await switchView(page, 'work');

      expect(await headingText(page)).toBe('Work');
      expect(await page.evaluate(() => window.location.pathname)).toBe('/work');
      expect(await page.evaluate(() => document.body.innerText.includes('Convoy board'))).toBe(true);
    });

    it('navigates to the mail queue from the primary rail', async () => {
      await navigateToApp(page);
      await switchView(page, 'mail');

      expect(await headingText(page)).toBe('Queue');
      expect(await page.evaluate(() => window.location.pathname)).toBe('/mail');
      expect(await page.evaluate(() => document.body.innerText.includes('Regression confirmed'))).toBe(true);
    });

    it('auto-selects a rig when opening the fleet surface', async () => {
      await navigateToApp(page);
      await switchView(page, 'rigs');

      await page.waitForFunction(() => window.location.pathname.startsWith('/rigs/'), { timeout: 5000 });
      expect(await headingText(page)).toBe('Fleet');
      expect(await page.evaluate(() => document.body.innerText.includes('gastown_gui'))).toBe(true);
    });
  });
});
