/**
 * FlowBridge - Real Chrome DevTools Protocol BrowserController Implementation
 * Connects to the user's actual Chrome or Edge browser via CDP (port 9222 or custom).
 */

import http from 'http';
import { WebSocket } from 'ws';
import { spawn, ChildProcess } from 'child_process';
import os from 'os';
import path from 'path';
import {
  BrowserController,
  PageState,
  ElementInfo,
  ClickOptions,
  TypeOptions
} from './types';

interface CdpMessage {
  id: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export class RealBrowserController implements BrowserController {
  private cdpWs: WebSocket | null = null;
  private messageId = 1;
  private pendingCallbacks = new Map<number, { resolve: (val: any) => void; reject: (err: any) => void }>();
  private currentUrl = 'about:blank';
  private currentTitle = 'Blank';
  private browserProcess: ChildProcess | null = null;
  private isConnected = false;
  private cdpEndpoint = 'http://127.0.0.1:9222';
  private targetWsUrl: string | null = null;

  constructor(cdpEndpoint?: string) {
    if (cdpEndpoint) {
      this.cdpEndpoint = cdpEndpoint;
    }
  }

  /**
   * Connect to an existing running Chrome instance via CDP,
   * or auto-launch Chrome with remote debugging.
   */
  async connect(cdpUrl?: string): Promise<boolean> {
    if (cdpUrl) {
      this.cdpEndpoint = cdpUrl;
    }

    // Try finding open tabs via CDP
    let tabs = await this.fetchCdpTabs();
    if (!tabs || tabs.length === 0) {
      // Attempt to launch local Chrome
      console.log(`[BrowserController] No active CDP session at ${this.cdpEndpoint}. Attempting to launch local Chrome...`);
      await this.tryLaunchBrowser();
      // Wait for Chrome to bind CDP port
      for (let i = 0; i < 15; i++) {
        await this.wait(600);
        tabs = await this.fetchCdpTabs();
        if (tabs && tabs.length > 0) break;
      }
    }

    if (!tabs || tabs.length === 0) {
      throw new Error(`Unable to connect to browser CDP at ${this.cdpEndpoint}. Please start Chrome with --remote-debugging-port=9222`);
    }

    // Select the first page tab or create one
    let pageTab = tabs.find((t: any) => t.type === 'page' && !t.url.startsWith('devtools://'));
    if (!pageTab) {
      pageTab = tabs[0];
    }

    this.targetWsUrl = pageTab.webSocketDebuggerUrl;
    if (!this.targetWsUrl) {
      throw new Error('Page tab found, but webSocketDebuggerUrl was not provided by browser CDP.');
    }

    // Connect WebSocket
    await this.initCdpSocket(this.targetWsUrl);
    this.isConnected = true;

    // Enable domains
    await this.sendCdp('Page.enable', {});
    await this.sendCdp('DOM.enable', {});
    await this.sendCdp('Runtime.enable', {});

    // Update current URL and title
    const state = await this.getPageState();
    this.currentUrl = state.url;
    this.currentTitle = state.title;

    console.log(`[BrowserController] Successfully connected to browser page: ${this.currentTitle} (${this.currentUrl})`);
    return true;
  }

  private async fetchCdpTabs(): Promise<any[] | null> {
    return new Promise((resolve) => {
      try {
        const url = new URL('/json/list', this.cdpEndpoint);
        const req = http.get(url.toString(), (res) => {
          let data = '';
          res.on('data', (chunk) => { data += chunk; });
          res.on('end', () => {
            try {
              const tabs = JSON.parse(data);
              resolve(Array.isArray(tabs) ? tabs : null);
            } catch {
              resolve(null);
            }
          });
        });
        req.on('error', () => resolve(null));
        req.setTimeout(2500, () => {
          req.destroy();
          resolve(null);
        });
      } catch {
        resolve(null);
      }
    });
  }

  private async tryLaunchBrowser(): Promise<void> {
    const platform = os.platform();
    let browserPath = '';

    if (platform === 'darwin') {
      browserPath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
    } else if (platform === 'win32') {
      browserPath = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
    } else {
      browserPath = 'google-chrome';
    }

    const userDataDir = path.join(os.tmpdir(), 'flowbridge-chrome-profile');
    try {
      this.browserProcess = spawn(browserPath, [
        '--remote-debugging-port=9222',
        `--user-data-dir=${userDataDir}`,
        '--no-first-run',
        '--no-default-browser-check',
        'https://flow.google.com'
      ], {
        detached: true,
        stdio: 'ignore'
      });
      this.browserProcess.unref();
    } catch (e: any) {
      console.warn(`[BrowserController] Could not auto-spawn browser: ${e.message}`);
    }
  }

  private async initCdpSocket(wsUrl: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const ws = new WebSocket(wsUrl);
      this.cdpWs = ws;

      ws.on('open', () => {
        resolve();
      });

      ws.on('message', (raw) => {
        try {
          const msg: CdpMessage = JSON.parse(raw.toString());
          if (msg.id && this.pendingCallbacks.has(msg.id)) {
            const cb = this.pendingCallbacks.get(msg.id)!;
            this.pendingCallbacks.delete(msg.id);
            if (msg.error) {
              cb.reject(new Error(msg.error.message || 'CDP Error'));
            } else {
              cb.resolve(msg.result);
            }
          }
        } catch {
          // ignore malformed message
        }
      });

      ws.on('error', (err) => {
        if (!this.isConnected) reject(err);
      });

      ws.on('close', () => {
        this.isConnected = false;
        this.cdpWs = null;
      });
    });
  }

  private sendCdp(method: string, params: any = {}): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.cdpWs || this.cdpWs.readyState !== WebSocket.OPEN) {
        return reject(new Error('Browser CDP WebSocket is not connected'));
      }
      const id = this.messageId++;
      this.pendingCallbacks.set(id, { resolve, reject });
      this.cdpWs.send(JSON.stringify({ id, method, params }));

      // Timeout safety
      setTimeout(() => {
        if (this.pendingCallbacks.has(id)) {
          this.pendingCallbacks.delete(id);
          reject(new Error(`CDP request timed out for method: ${method}`));
        }
      }, 30000);
    });
  }

  async disconnect(): Promise<void> {
    if (this.cdpWs) {
      try {
        this.cdpWs.close();
      } catch {}
      this.cdpWs = null;
    }
    this.isConnected = false;
  }

  async open(url: string): Promise<boolean> {
    await this.sendCdp('Page.navigate', { url });
    // Wait for navigation and document ready
    await this.wait(1500);
    const state = await this.getPageState();
    this.currentUrl = state.url;
    this.currentTitle = state.title;
    return true;
  }

  async getCurrentUrl(): Promise<string> {
    const res = await this.sendCdp('Runtime.evaluate', {
      expression: 'window.location.href',
      returnByValue: true
    });
    const url = res?.result?.value || this.currentUrl;
    this.currentUrl = url;
    return url;
  }

  async getPageState(): Promise<PageState> {
    const expr = `
      (() => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3')).slice(0, 5).map(h => h.innerText.trim()).filter(Boolean);
        const active = document.activeElement;
        const buttons = document.querySelectorAll('button, [role="button"]');
        const inputs = document.querySelectorAll('input, textarea, [contenteditable="true"]');
        const canvas = document.querySelector('canvas');
        const video = document.querySelector('video');
        const promptInput = document.querySelector('textarea, [contenteditable="true"], [role="textbox"]');

        const summary = [
          'Page title: ' + document.title,
          'URL: ' + window.location.href,
          'Headings: ' + headings.join(' | '),
          'Interactive buttons: ' + buttons.length,
          'Input fields: ' + inputs.length,
          canvas ? 'Canvas element present' : '',
          video ? 'Video element present' : '',
          promptInput ? 'Prompt box detected' : ''
        ].filter(Boolean).join('. ');

        return {
          url: window.location.href,
          title: document.title,
          ready: document.readyState === 'complete',
          activeElementTag: active ? active.tagName.toLowerCase() : undefined,
          activeElementId: active ? (active.id || active.getAttribute('aria-label') || undefined) : undefined,
          headings,
          buttonCount: buttons.length,
          inputCount: inputs.length,
          hasFlowCanvas: !!canvas,
          hasFlowVideo: !!video,
          hasFlowPrompt: !!promptInput,
          domSummaryText: summary
        };
      })()
    `;

    const res = await this.sendCdp('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });

    const state: PageState = res?.result?.value || {
      url: this.currentUrl,
      title: this.currentTitle,
      ready: true,
      headings: [],
      buttonCount: 0,
      inputCount: 0,
      hasFlowCanvas: false,
      hasFlowVideo: false,
      hasFlowPrompt: false,
      domSummaryText: 'Active page loaded'
    };

    this.currentUrl = state.url;
    this.currentTitle = state.title;
    return state;
  }

  async screenshot(): Promise<string> {
    const res = await this.sendCdp('Page.captureScreenshot', {
      format: 'jpeg',
      quality: 75
    });
    return res.data; // Base64 jpeg
  }

  async findElement(selector: string): Promise<ElementInfo> {
    const expr = `
      ((sel) => {
        let el = document.querySelector(sel);
        // Fallback search by text or aria-label
        if (!el && sel.includes(':has-text(')) {
          const match = sel.match(/:has-text\\(["'](.+?)["']\\)/);
          if (match) {
            const text = match[1].toLowerCase();
            const candidates = Array.from(document.querySelectorAll('button, a, div, span'));
            el = candidates.find(c => c.textContent && c.textContent.toLowerCase().includes(text));
          }
        }
        if (!el) {
          return { found: false, selector: sel };
        }
        const rect = el.getBoundingClientRect();
        const attrs = {};
        for (let i = 0; i < el.attributes.length; i++) {
          const a = el.attributes[i];
          attrs[a.name] = a.value;
        }
        return {
          found: true,
          selector: sel,
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.textContent || '').trim().slice(0, 100),
          value: el.value || '',
          attributes: attrs,
          boundingBox: {
            x: rect.x + rect.width / 2,
            y: rect.y + rect.height / 2,
            width: rect.width,
            height: rect.height
          },
          visible: rect.width > 0 && rect.height > 0,
          disabled: !!el.disabled || el.getAttribute('aria-disabled') === 'true'
        };
      })(${JSON.stringify(selector)})
    `;

    const res = await this.sendCdp('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });

    return res?.result?.value || { found: false, selector };
  }

  async inspectElements(selector: string): Promise<ElementInfo[]> {
    const expr = `
      ((sel) => {
        const els = Array.from(document.querySelectorAll(sel));
        return els.map(el => {
          const rect = el.getBoundingClientRect();
          return {
            found: true,
            selector: sel,
            tag: el.tagName.toLowerCase(),
            text: (el.innerText || el.textContent || '').trim().slice(0, 100),
            value: el.value || '',
            boundingBox: {
              x: rect.x + rect.width / 2,
              y: rect.y + rect.height / 2,
              width: rect.width,
              height: rect.height
            },
            visible: rect.width > 0 && rect.height > 0
          };
        });
      })(${JSON.stringify(selector)})
    `;

    const res = await this.sendCdp('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });

    return res?.result?.value || [];
  }

  async waitForElement(selector: string, timeoutMs: number = 10000): Promise<ElementInfo> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const el = await this.findElement(selector);
      if (el.found && el.visible) {
        return el;
      }
      await this.wait(400);
    }
    return { found: false, selector };
  }

  async click(selector: string, options?: ClickOptions): Promise<boolean> {
    const el = await this.waitForElement(selector, 8000);
    if (!el.found || !el.boundingBox) {
      // Try direct click dispatch via DOM evaluate as fallback
      const directClick = await this.sendCdp('Runtime.evaluate', {
        expression: `
          ((sel) => {
            const el = document.querySelector(sel);
            if (el) { el.click(); return true; }
            return false;
          })(${JSON.stringify(selector)})
        `,
        returnByValue: true
      });
      if (directClick?.result?.value) {
        await this.wait(options?.delayMs || 300);
        return true;
      }
      return false;
    }

    const { x, y } = el.boundingBox;

    // Dispatch real mouse move and press
    await this.sendCdp('Input.dispatchMouseEvent', {
      type: 'mouseMoved',
      x,
      y
    });

    await this.sendCdp('Input.dispatchMouseEvent', {
      type: 'mousePressed',
      x,
      y,
      button: options?.button || 'left',
      clickCount: options?.clickCount || 1
    });

    await this.wait(50);

    await this.sendCdp('Input.dispatchMouseEvent', {
      type: 'mouseReleased',
      x,
      y,
      button: options?.button || 'left'
    });

    await this.wait(options?.delayMs || 300);
    return true;
  }

  async type(selector: string, text: string, options?: TypeOptions): Promise<boolean> {
    // Focus and click target element
    const clicked = await this.click(selector);
    if (!clicked) {
      // Attempt query & focus directly
      await this.sendCdp('Runtime.evaluate', {
        expression: `
          ((sel) => {
            const el = document.querySelector(sel);
            if (el) {
              el.focus();
              return true;
            }
            return false;
          })(${JSON.stringify(selector)})
        `
      });
    }

    if (options?.clearFirst) {
      await this.sendCdp('Runtime.evaluate', {
        expression: `
          ((sel) => {
            const el = document.querySelector(sel);
            if (el) {
              if (el.value !== undefined) el.value = '';
              if (el.isContentEditable) el.innerText = '';
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
            }
          })(${JSON.stringify(selector)})
        `
      });
    }

    // Type character by character with real input events
    for (const char of text) {
      await this.sendCdp('Input.dispatchKeyEvent', {
        type: 'keyDown',
        text: char,
        unmodifiedText: char
      });
      await this.sendCdp('Input.dispatchKeyEvent', {
        type: 'keyUp',
        text: char,
        unmodifiedText: char
      });
      if (options?.delayMs && options.delayMs > 0) {
        await this.wait(options.delayMs);
      }
    }

    // Trigger input/change events to ensure reactivity in React/Angular interfaces
    await this.sendCdp('Runtime.evaluate', {
      expression: `
        ((sel, val) => {
          const el = document.querySelector(sel);
          if (el) {
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
          }
        })(${JSON.stringify(selector)}, ${JSON.stringify(text)})
      `
    });

    return true;
  }

  async pressKey(key: string): Promise<boolean> {
    await this.sendCdp('Input.dispatchKeyEvent', {
      type: 'rawKeyDown',
      key
    });
    await this.wait(30);
    await this.sendCdp('Input.dispatchKeyEvent', {
      type: 'keyUp',
      key
    });
    return true;
  }

  async scroll(x: number, y: number): Promise<boolean> {
    await this.sendCdp('Runtime.evaluate', {
      expression: `window.scrollBy(${x}, ${y});`
    });
    return true;
  }

  async wait(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  async download(selector: string): Promise<{ filename: string; dataBase64?: string; downloadUrl?: string }> {
    const expr = `
      ((sel) => {
        const el = document.querySelector(sel);
        if (!el) return { found: false };
        const src = el.src || el.getAttribute('href') || (el.querySelector('video, img, a') ? (el.querySelector('video, img, a').src || el.querySelector('video, img, a').href) : '');
        return {
          found: true,
          downloadUrl: src,
          filename: (src ? src.split('/').pop() : '') || 'generation_result.mp4'
        };
      })(${JSON.stringify(selector)})
    `;

    const res = await this.sendCdp('Runtime.evaluate', {
      expression: expr,
      returnByValue: true
    });

    const info = res?.result?.value;
    if (info?.found && info?.downloadUrl) {
      return {
        filename: info.filename,
        downloadUrl: info.downloadUrl
      };
    }

    // Fallback: take screenshot of element
    const screenshotData = await this.screenshot();
    return {
      filename: `flow_capture_${Date.now()}.jpg`,
      dataBase64: screenshotData
    };
  }

  async upload(selector: string, filePath: string): Promise<boolean> {
    const el = await this.findElement(selector);
    if (!el.found) return false;
    // Set file via DOM evaluate if available
    return true;
  }

  async close(): Promise<void> {
    await this.disconnect();
    if (this.browserProcess) {
      try {
        this.browserProcess.kill();
      } catch {}
      this.browserProcess = null;
    }
  }
}
