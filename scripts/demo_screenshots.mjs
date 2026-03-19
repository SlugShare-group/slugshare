import { execFile } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { stdin as input, stdout as output } from 'node:process';
import readline from 'node:readline/promises';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { chromium } from 'playwright';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const baseURL = process.env.DEMO_BASE_URL || 'http://localhost:3000';
const outDir = path.join(repoRoot, 'output', 'playwright');
const keepOpen = process.env.DEMO_KEEP_OPEN === 'true';
const qrLoadWaitMs = Number(process.env.DEMO_QR_WAIT_MS || '20000');
const qrGifFrameCount = Number(process.env.DEMO_QR_GIF_FRAMES || '4');
const qrGifCaptureIntervalMs = Number(process.env.DEMO_QR_GIF_CAPTURE_INTERVAL_MS || '5050');
const qrGifPlaybackDelayMs = Number(process.env.DEMO_QR_GIF_PLAYBACK_DELAY_MS || '1000');

const execFileAsync = promisify(execFile);

const now = Date.now();
const requester = {
  name: 'Demo Requester',
  email: `requester+${now}@slugshare.demo`,
  password: 'password123',
};
const donor = {
  name: 'Demo Donor',
  email: `donor+${now}@slugshare.demo`,
  password: 'password123',
};

function logStep(message, extra) {
  const stamp = new Date().toISOString();
  if (extra === undefined) {
    console.log(`[demo ${stamp}] ${message}`);
    return;
  }
  console.log(`[demo ${stamp}] ${message}`, extra);
}

async function resolveValidatedGetUrl() {
  if (process.env.DEMO_GET_URL?.trim()) {
    return process.env.DEMO_GET_URL.trim();
  }

  if (!input.isTTY || !output.isTTY) {
    throw new Error('DEMO_GET_URL is required when not running interactively.');
  }

  const rl = readline.createInterface({ input, output });
  try {
    const answer = await rl.question('Enter a validated GET URL: ');
    const trimmed = answer.trim();
    if (!trimmed) {
      throw new Error('A validated GET URL is required.');
    }
    return trimmed;
  } finally {
    rl.close();
  }
}

async function hideDevTools(page) {
  await page.evaluate(() => {
    const buttons = Array.from(document.querySelectorAll('button'));
    for (const button of buttons) {
      if (button.textContent?.includes('Open Next.js Dev Tools')) {
        button.remove();
      }
    }
  });
}

async function safeScreenshot(page, name) {
  await hideDevTools(page);
  await page.screenshot({ path: path.join(outDir, name), fullPage: true });
  logStep(`saved screenshot ${name}`);
}

async function captureGif(
  page,
  baseName,
  frameCount = qrGifFrameCount,
  captureIntervalMs = qrGifCaptureIntervalMs,
  playbackDelayMs = qrGifPlaybackDelayMs,
) {
  const sanitizedFrameCount = Math.max(1, frameCount);
  const sanitizedCaptureIntervalMs = Math.max(50, captureIntervalMs);
  const sanitizedPlaybackDelayMs = Math.max(50, playbackDelayMs);
  const framePaths = [];

  for (let index = 0; index < sanitizedFrameCount; index += 1) {
    const frameName = `${baseName}-${String(index).padStart(2, '0')}.png`;
    const framePath = path.join(outDir, frameName);
    await hideDevTools(page);
    await page.screenshot({ path: framePath, fullPage: true });
    framePaths.push(framePath);

    if (index < sanitizedFrameCount - 1) {
      await page.waitForTimeout(sanitizedCaptureIntervalMs);
    }
  }

  const outputPath = path.join(outDir, `${baseName}.gif`);
  const delayTicks = Math.max(1, Math.round(sanitizedPlaybackDelayMs / 10));

  try {
    await execFileAsync('magick', ['-delay', String(delayTicks), '-loop', '0', ...framePaths, outputPath]);
    logStep(`saved gif ${path.basename(outputPath)}`);
  } catch (error) {
    logStep('failed to generate gif', error instanceof Error ? error.message : String(error));
  } finally {
    await Promise.all(framePaths.map((framePath) => fs.rm(framePath, { force: true })));
  }
}

async function waitForUi(page, ms = 1500) {
  await page.waitForLoadState('networkidle').catch(() => {});
  await page.waitForTimeout(ms);
}

async function pickLocation(page) {
  const categories = [
    'Dining Halls',
    'Markets',
    'Perks Coffee Bar',
    'Cafes and Restaurants',
  ];

  for (const category of categories) {
    const trigger = page.getByRole('button', { name: category });
    await trigger.click();
    await page.waitForTimeout(300);

    const picked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('form button[type="button"]'));
      const locationButtons = buttons.filter((button) => {
        if (!button.textContent) return false;
        const text = button.textContent;
        return text.includes('Open until') || text.includes('Currently Closed') || text.includes('end of service');
      });

      if (locationButtons.length === 0) return null;

      const target = locationButtons.find((button) => !button.hasAttribute('disabled')) || locationButtons[0];
      if (target.hasAttribute('disabled')) {
        target.removeAttribute('disabled');
      }
      target.click();
      return target.textContent?.trim() || null;
    });

    if (picked) return picked;
  }

  return null;
}

async function signup(page, user) {
  logStep(`signup start for ${user.email}`);
  await page.goto(`${baseURL}/auth/signup`, { waitUntil: 'domcontentloaded' });
  await waitForUi(page);
  await page.getByLabel('Name').fill(user.name);
  await page.getByLabel('Email').fill(user.email);
  await page.getByLabel('Password').fill(user.password);
  logStep(`submitting signup for ${user.email}`);
  await page.getByRole('button', { name: /Create account/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 30000 });
  await waitForUi(page);
  logStep(`signup complete for ${user.email}`);
}

async function connectGet(page, url) {
  logStep('navigating to GET page');
  await page.goto(`${baseURL}/get`, { waitUntil: 'domcontentloaded' });
  await page.getByText('Link Donor GET Device', { exact: true }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(1200);
  logStep('GET page ready');

  page.on('response', async (response) => {
    if (!response.url().includes('/api/get/connect')) return;
    let body = '<unable to read body>';
    try {
      body = await response.text();
    } catch {}
    logStep(`GET connect response ${response.status()}`, body);
  });

  const textarea = page.locator('textarea').first();
  await textarea.waitFor({ timeout: 30000 });
  logStep('GET textarea found');
  await textarea.click();
  await textarea.fill(url);
  await page.waitForTimeout(800);
  logStep('GET textarea filled', { length: url.length });

  const currentValue = await textarea.inputValue();
  logStep('GET textarea current value snapshot', {
    startsWith: currentValue.slice(0, 24),
    length: currentValue.length,
    matchesExpected: currentValue === url,
  });

  if (currentValue !== url) {
    logStep('GET textarea mismatch, applying DOM fallback');
    await textarea.evaluate((node, value) => {
      const element = node;
      element.value = value;
      element.dispatchEvent(new Event('input', { bubbles: true }));
      element.dispatchEvent(new Event('change', { bubbles: true }));
    }, url);
    await page.waitForTimeout(800);

    const fallbackValue = await textarea.inputValue();
    logStep('GET textarea after fallback', {
      startsWith: fallbackValue.slice(0, 24),
      length: fallbackValue.length,
      matchesExpected: fallbackValue === url,
    });
  }

  await safeScreenshot(page, '05-get-connect.png');
  logStep('clicking Connect GET');
  await page.getByRole('button', { name: 'Connect GET' }).click();

  logStep('waiting for GET linked success banner');
  await page.getByText(/GET linked \(\d+ account\(s\) validated\)\./).waitFor({ timeout: 45000 });
  await waitForUi(page, 2500);
  logStep('GET linked success banner found');
}

async function main() {
  await fs.mkdir(outDir, { recursive: true });
  const validatedGetUrl = await resolveValidatedGetUrl();
  logStep('starting demo run', { baseURL, outDir, keepOpen });

  const browser = await chromium.launch({ channel: 'chrome', headless: false, slowMo: 350 });

  const requesterContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const requesterPage = await requesterContext.newPage();
  requesterPage.on('dialog', (dialog) => dialog.accept());
  requesterPage.on('console', (msg) => logStep(`requester console ${msg.type()}`, msg.text()));
  requesterPage.on('pageerror', (error) => logStep('requester pageerror', error.message));

  await requesterPage.goto(`${baseURL}/auth/login`, { waitUntil: 'domcontentloaded' });
  await requesterPage.getByRole('heading', { name: 'Sign In to SlugShare' }).waitFor();
  await waitForUi(requesterPage);
  await safeScreenshot(requesterPage, '01-login.png');

  await signup(requesterPage, requester);
  await requesterPage.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await safeScreenshot(requesterPage, '02-dashboard.png');

  await requesterPage.getByRole('link', { name: 'Create Request' }).click();
  await requesterPage.getByRole('heading', { name: 'Create Request' }).waitFor();
  await waitForUi(requesterPage);

  const locationPicked = await pickLocation(requesterPage);
  if (!locationPicked) {
    throw new Error('Unable to select a location in the request form.');
  }

  await requesterPage.getByLabel('Message (Optional)').fill('Demo request for presentation screenshots.');
  await requesterPage.getByLabel('Receive QR code').check();
  await waitForUi(requesterPage, 1200);
  await safeScreenshot(requesterPage, '03-create-request.png');

  await requesterPage.getByRole('button', { name: /Create Request/i }).click();
  await requesterPage.waitForURL('**/requests', { timeout: 30000 });
  await requesterPage.getByRole('heading', { name: 'Requests' }).waitFor();
  await waitForUi(requesterPage, 2500);
  await safeScreenshot(requesterPage, '04-request-created.png');

  const donorContext = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const donorPage = await donorContext.newPage();
  donorPage.on('dialog', (dialog) => dialog.accept());
  donorPage.on('console', (msg) => logStep(`donor console ${msg.type()}`, msg.text()));
  donorPage.on('pageerror', (error) => logStep('donor pageerror', error.message));

  await signup(donorPage, donor);
  await donorPage.getByRole('heading', { name: 'Welcome back' }).waitFor();
  await connectGet(donorPage, validatedGetUrl);

  await donorPage.goto(`${baseURL}/requests`, { waitUntil: 'domcontentloaded' });
  await donorPage.getByRole('heading', { name: 'Requests' }).waitFor();
  await waitForUi(donorPage, 2500);

  const acceptButton = donorPage.getByRole('button', { name: 'Accept' }).first();
  await acceptButton.waitFor({ timeout: 30000 });
  await acceptButton.click();
  await waitForUi(donorPage, 1200);

  const qrButton = donorPage.getByRole('button', { name: /QR Code Flow/i });
  await qrButton.waitFor({ timeout: 30000 });
  await qrButton.click();

  await donorPage.getByText(/Accepted by .*QR mode/i).first().waitFor({ timeout: 45000 });
  await waitForUi(donorPage, 3000);
  await safeScreenshot(donorPage, '06-accept-request.png');

  await requesterPage.goto(`${baseURL}/requests`, { waitUntil: 'domcontentloaded' });
  await requesterPage.getByRole('heading', { name: 'Requests' }).waitFor();
  await requesterPage.getByRole('link', { name: /Open Scan Screen/i }).first().waitFor({ timeout: 45000 });
  await waitForUi(requesterPage, 3000);
  await safeScreenshot(requesterPage, '07-request-accepted.png');

  const scanLink = requesterPage.getByRole('link', { name: /Open Scan Screen/i }).first();
  await scanLink.waitFor({ timeout: 30000 });
  await scanLink.click();
  await requesterPage.waitForURL(/\/requests\/.*\/scan/, { timeout: 30000 });
  await requesterPage.getByRole('heading', { name: 'Scan and Complete' }).waitFor();
  await requesterPage.locator('canvas').first().waitFor({ timeout: 15000 }).catch(() => {});
  await waitForUi(requesterPage, qrLoadWaitMs);
  await captureGif(requesterPage, '08-qr-scan');
  await safeScreenshot(requesterPage, '08-qr-scan.png');

  await requesterPage.goto(`${baseURL}/inbox`, { waitUntil: 'domcontentloaded' });
  await requesterPage.getByRole('heading', { name: 'Notifications' }).waitFor();
  await waitForUi(requesterPage, 2500);
  await safeScreenshot(requesterPage, '09-notifications.png');

  console.log('Screenshots saved to', outDir);
  console.log('Requester:', requester.email);
  console.log('Donor:', donor.email);

  if (keepOpen) {
    logStep('demo finished, keeping browser windows open until interrupted');
    await new Promise(() => {});
  }

  await requesterContext.close();
  await donorContext.close();
  await browser.close();
}

main().catch(async (error) => {
  logStep('demo run failed', error instanceof Error ? error.stack || error.message : String(error));
  console.error(error);
  process.exit(1);
});
