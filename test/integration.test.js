import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import puppeteer from 'puppeteer';

const BASE_URL = process.env.TEST_URL || `http://localhost:${process.env.PORT || 5678}`;

async function openApp(page) {
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('gastown-onboarding-complete', 'true');
    localStorage.setItem('gastown-onboarding-skipped', 'true');
    localStorage.setItem('gastown-tutorial-complete', 'true');
  });
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForFunction(() => document.querySelectorAll('h1').length > 0, { timeout: 15000 });
}

async function goto(page, route) {
  await page.waitForSelector(`a[href="${route}"]`, { timeout: 5000 });
  await page.evaluate((targetRoute) => {
    const nodes = Array.from(document.querySelectorAll(`a[href="${targetRoute}"]`));
    const visible = nodes.find((el) => {
      const rect = el.getBoundingClientRect();
      const style = window.getComputedStyle(el);
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
    });
    if (!visible) throw new Error(`No visible nav link for ${targetRoute}`);
    visible.click();
  }, route);
  await page.waitForFunction(
    (target) => window.location.pathname === target || window.location.pathname.startsWith(`${target}/`),
    { timeout: 5000 },
    route,
  );
}

async function clickButtonByText(page, text) {
  await page.waitForFunction(
    (label) =>
      Array.from(document.querySelectorAll('button')).some(
        (button) => button.textContent?.trim() === label,
      ),
    { timeout: 5000 },
    text,
  );
  await page.evaluate((label) => {
    const button = Array.from(document.querySelectorAll('button')).find(
      (node) => node.textContent?.trim() === label,
    );
    if (!(button instanceof HTMLButtonElement)) {
      throw new Error(`No button found for ${label}`);
    }
    button.click();
  }, text);
}

describe('Comprehensive Integration Tests', () => {
  let browser;
  let page;

  beforeAll(async () => {
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
  });

  afterAll(async () => {
    if (browser) await browser.close();
  });

  beforeEach(async () => {
    page = await browser.newPage();
    await openApp(page);
  });

  afterEach(async () => {
    if (page) await page.close();
  });

  it('renders activity feed data from the mock bridge', async () => {
    await goto(page, '/activity');

    await page.waitForFunction(() => document.body.innerText.includes('Regression confirmed'), { timeout: 5000 });
    const hasEvent = await page.evaluate(() => document.body.innerText.includes('Regression confirmed'));
    expect(hasEvent).toBe(true);
  });

  it('opens the dispatch dialog from the work surface', async () => {
    await goto(page, '/work');

    await clickButtonByText(page, 'Dispatch');
    await page.waitForFunction(() => document.querySelector('[role="dialog"] h2')?.textContent === 'Dispatch work', { timeout: 5000 });

    const dialogTitle = await page.$eval('[role="dialog"] h2', (el) => el.textContent?.trim());
    expect(dialogTitle).toBe('Dispatch work');
  });

  it('submits dispatch requests with the bead id the operator entered', async () => {
    await goto(page, '/work');
    await clickButtonByText(page, 'Dispatch');
    await page.waitForSelector('[role="dialog"] input', { timeout: 5000 });

    const requestCapture = page.evaluate(() => {
      return new Promise((resolve) => {
        const originalFetch = window.fetch;
        window.fetch = async (url, opts) => {
          if (typeof url === 'string' && url === '/api/sling') {
            window.fetch = originalFetch;
            const body = opts?.body ? JSON.parse(String(opts.body)) : null;
            resolve({ url, method: opts?.method, body });
          }
          return originalFetch(url, opts);
        };
      });
    });

    await page.$eval('[role="dialog"] input', (input) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value')?.set;
      setter?.call(input, 'gg-luc');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.waitForFunction(() => {
      const button = document.querySelector('[role="dialog"] button:last-child');
      return button instanceof HTMLButtonElement && !button.disabled;
    }, { timeout: 5000 });
    await page.click('[role="dialog"] button:last-child');

    const request = await requestCapture;
    expect(request).toMatchObject({
      url: '/api/sling',
      method: 'POST',
      body: { bead: 'gg-luc' },
    });
  });

  it('submits ask-mayor requests from the operator dispatch surface', async () => {
    await goto(page, '/work');
    await page.waitForFunction(() => document.body.innerText.includes('Ask Mayor'), { timeout: 5000 });

    const requestCapture = page.evaluate(() => {
      return new Promise((resolve) => {
        const originalFetch = window.fetch;
        window.fetch = async (url, opts) => {
          if (typeof url === 'string' && url === '/api/mayor/requests') {
            window.fetch = originalFetch;
            const body = opts?.body ? JSON.parse(String(opts.body)) : null;
            resolve({ url, method: opts?.method, body });
          }
          return originalFetch(url, opts);
        };
      });
    });

    await page.$eval('textarea', (input) => {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value')?.set;
      setter?.call(input, 'Add a mayor workflow for operator-created dispatch.');
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    await page.evaluate(() => {
      const button = Array.from(document.querySelectorAll('button')).find((node) => node.textContent?.includes('Create And Sling'));
      if (!(button instanceof HTMLButtonElement)) throw new Error('Ask Mayor submit button not found');
      button.click();
    });

    const request = await requestCapture;
    expect(request).toMatchObject({
      url: '/api/mayor/requests',
      method: 'POST',
      body: { prompt: 'Add a mayor workflow for operator-created dispatch.', molecule: 'mol-polecat-work' },
    });
  });

  it('opens compose and posts mail through the React queue surface', async () => {
    await goto(page, '/mail');

    await page.click('main button');
    await page.waitForFunction(() => document.querySelector('[role="dialog"] h2')?.textContent === 'Compose', { timeout: 5000 });

    const requestCapture = page.evaluate(() => {
      return new Promise((resolve) => {
        const originalFetch = window.fetch;
        window.fetch = async (url, opts) => {
          if (typeof url === 'string' && url === '/api/mail' && opts?.method === 'POST') {
            window.fetch = originalFetch;
            const body = opts?.body ? JSON.parse(String(opts.body)) : null;
            resolve(body);
          }
          return originalFetch(url, opts);
        };
      });
    });

    const inputs = await page.$$('[role="dialog"] input');
    await inputs[0].type('gastown_gui/witness');
    await inputs[1].type('Need confirmation');
    await page.type('[role="dialog"] textarea', 'Please confirm the root e2e baseline fix.');
    await page.click('[role="dialog"] button:last-child');

    const requestBody = await requestCapture;
    expect(requestBody).toMatchObject({
      to: 'gastown_gui/witness',
      subject: 'Need confirmation',
      message: 'Please confirm the root e2e baseline fix.',
      priority: 'normal',
    });
  });
});
