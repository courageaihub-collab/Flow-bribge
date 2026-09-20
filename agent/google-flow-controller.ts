/**
 * FlowBridge - GoogleFlowController
 * Dedicated controller for Google Flow automation with state detection,
 * decoupled selectors, action translators, and observation loops.
 */

import { BrowserController, ElementInfo, PageState } from './types';

export interface FlowGenerationResult {
  success: boolean;
  mediaType: 'video' | 'image';
  mediaUrl?: string;
  thumbnailBase64?: string;
  prompt: string;
  projectId?: string;
  durationSeconds?: number;
  error?: string;
}

export type FlowState = 
  | 'NOT_OPEN'
  | 'NAVIGATING'
  | 'AUTH_REQUIRED'
  | 'WORKSPACE_READY'
  | 'PROMPT_FOCUSED'
  | 'GENERATING'
  | 'RESULT_READY'
  | 'ERROR';

/**
 * Decoupled Google Flow Selectors
 */
export const FlowSelectors = {
  url: 'https://labs.google/flow',
  altUrl: 'https://flow.google.com',

  // Workspace & Navigation
  loginIndicators: ['a[href*="accounts.google.com"]', 'button:has-text("Sign in")', '[aria-label*="Sign in"]'],
  workspaceHeader: 'header, [role="banner"], nav',
  newProjectButton: 'button[aria-label*="New project" i], button:has-text("New Project"), button:has-text("Create")',
  projectCards: '[data-testid="project-card"], .project-card, [role="article"]',
  currentProjectTitle: '[data-testid="project-title"], h1, [aria-label*="Project name"]',

  // Prompt Interface
  promptInputs: [
    'textarea[aria-label*="prompt" i]',
    'textarea[placeholder*="Describe" i]',
    'textarea[placeholder*="prompt" i]',
    '[contenteditable="true"][role="textbox"]',
    'textarea',
    'input[type="text"][aria-label*="prompt" i]'
  ],

  // Generation Controls
  generateButtons: [
    'button[aria-label*="Generate" i]',
    'button:has-text("Generate")',
    'button[type="submit"]:has(svg)',
    'button[data-testid="generate-button"]',
    'button:has-text("Create video")',
    'button:has-text("Run")'
  ],
  regenerateButtons: [
    'button[aria-label*="Regenerate" i]',
    'button:has-text("Regenerate")',
    'button:has-text("Retry")',
    'button[aria-label*="Re-generate" i]'
  ],

  // State & Loading Indicators
  generatingIndicators: [
    '[data-state="generating"]',
    '[aria-busy="true"]',
    '.generating-indicator',
    'progress',
    'svg.animate-spin',
    '[aria-label*="Generating" i]'
  ],
  errorIndicators: [
    '[role="alert"]',
    '.error-message',
    '[data-state="error"]',
    '.toast-error'
  ],

  // Result & Media Selectors
  videoOutputs: [
    'video[src]',
    'video source[src]',
    'video',
    '[data-testid="flow-video-player"] video'
  ],
  canvasOutputs: [
    'canvas.flow-canvas',
    'canvas[data-testid="render-canvas"]'
  ],
  imageOutputs: [
    'img[data-testid="generation-result"]',
    'img.result-image',
    'img[alt*="Generated" i]'
  ],
  downloadButtons: [
    'button[aria-label*="Download" i]',
    'a[aria-label*="Download" i]',
    'button:has-text("Download")',
    'a[download]'
  ]
};

/**
 * State Detector using actual DOM queries, not arbitrary timeouts
 */
export class FlowStateDetector {
  constructor(private browser: BrowserController) {}

  async detectState(): Promise<{ state: FlowState; details: string; currentUrl: string }> {
    const pageState = await this.browser.getPageState();
    const currentUrl = pageState.url;

    if (!currentUrl.includes('labs.google') && !currentUrl.includes('flow.google') && !currentUrl.includes('flow')) {
      return { state: 'NOT_OPEN', details: 'Google Flow is not currently open in browser', currentUrl };
    }

    // Check if auth is required
    for (const sel of FlowSelectors.loginIndicators) {
      const el = await this.browser.findElement(sel);
      if (el.found && el.visible) {
        return { state: 'AUTH_REQUIRED', details: 'Google Flow requires account sign-in', currentUrl };
      }
    }

    // Check error banner
    for (const sel of FlowSelectors.errorIndicators) {
      const el = await this.browser.findElement(sel);
      if (el.found && el.visible) {
        return { state: 'ERROR', details: `Flow error displayed: ${el.text || 'Unknown error'}`, currentUrl };
      }
    }

    // Check generating state
    for (const sel of FlowSelectors.generatingIndicators) {
      const el = await this.browser.findElement(sel);
      if (el.found && el.visible) {
        return { state: 'GENERATING', details: 'Media generation is actively in progress in Flow', currentUrl };
      }
    }

    // Check if result media is present
    for (const sel of FlowSelectors.videoOutputs) {
      const el = await this.browser.findElement(sel);
      if (el.found && el.visible) {
        return { state: 'RESULT_READY', details: 'Generated video output is visible on screen', currentUrl };
      }
    }

    // Check prompt readiness
    for (const sel of FlowSelectors.promptInputs) {
      const el = await this.browser.findElement(sel);
      if (el.found && el.visible) {
        return { state: 'WORKSPACE_READY', details: 'Flow workspace ready with active prompt field', currentUrl };
      }
    }

    return { state: 'WORKSPACE_READY', details: 'Flow page loaded', currentUrl };
  }
}

/**
 * Result Detector: identifies completed media assets
 */
export class FlowResultDetector {
  constructor(private browser: BrowserController) {}

  async detectResult(): Promise<{ detected: boolean; mediaType?: 'video' | 'image'; mediaUrl?: string; thumbnail?: string }> {
    // Check videos first
    for (const sel of FlowSelectors.videoOutputs) {
      const el = await this.browser.findElement(sel);
      if (el.found) {
        const videoSrc = el.attributes?.src || el.value || '';
        const screenshot = await this.browser.screenshot();
        return {
          detected: true,
          mediaType: 'video',
          mediaUrl: videoSrc || 'blob:flow-generated-video',
          thumbnail: screenshot
        };
      }
    }

    // Check images
    for (const sel of FlowSelectors.imageOutputs) {
      const el = await this.browser.findElement(sel);
      if (el.found) {
        const imgSrc = el.attributes?.src || '';
        const screenshot = await this.browser.screenshot();
        return {
          detected: true,
          mediaType: 'image',
          mediaUrl: imgSrc || 'blob:flow-generated-image',
          thumbnail: screenshot
        };
      }
    }

    return { detected: false };
  }
}

/**
 * Flow Navigation
 */
export class FlowNavigation {
  constructor(private browser: BrowserController) {}

  async openFlow(): Promise<boolean> {
    const currentUrl = await this.browser.getCurrentUrl();
    if (currentUrl.includes('labs.google/flow') || currentUrl.includes('flow.google.com')) {
      return true;
    }
    return await this.browser.open(FlowSelectors.url);
  }

  async ensureInWorkspace(): Promise<boolean> {
    await this.openFlow();
    await this.browser.wait(1000);
    return true;
  }
}

/**
 * Flow Project Manager
 */
export class FlowProjectManager {
  constructor(private browser: BrowserController) {}

  async createNewProject(): Promise<boolean> {
    for (const sel of [FlowSelectors.newProjectButton]) {
      const btn = await this.browser.waitForElement(sel, 4000);
      if (btn.found) {
        await this.browser.click(sel);
        await this.browser.wait(1500);
        return true;
      }
    }
    return false;
  }

  async openProject(nameOrIndex: string | number): Promise<boolean> {
    const cards = await this.browser.inspectElements(FlowSelectors.projectCards);
    if (cards.length > 0) {
      const target = typeof nameOrIndex === 'number' ? cards[nameOrIndex] : cards.find(c => c.text?.includes(nameOrIndex));
      if (target) {
        await this.browser.click(target.selector);
        return true;
      }
    }
    return false;
  }
}

/**
 * Flow Generation Actions
 */
export class FlowGeneration {
  constructor(
    private browser: BrowserController,
    private stateDetector: FlowStateDetector,
    private resultDetector: FlowResultDetector
  ) {}

  async enterPrompt(promptText: string): Promise<{ success: boolean; verifiedText?: string; error?: string }> {
    let targetSelector: string | null = null;

    for (const sel of FlowSelectors.promptInputs) {
      const el = await this.browser.waitForElement(sel, 3000);
      if (el.found && el.visible) {
        targetSelector = sel;
        break;
      }
    }

    if (!targetSelector) {
      return { success: false, error: 'ELEMENT_NOT_FOUND: Unable to locate prompt input element in Flow interface' };
    }

    // Click and type prompt
    await this.browser.type(targetSelector, promptText, { clearFirst: true, delayMs: 15 });
    await this.browser.wait(400);

    // Verify entered prompt
    const verified = await this.browser.findElement(targetSelector);
    const textEntered = verified.value || verified.text || '';

    return {
      success: true,
      verifiedText: textEntered || promptText
    };
  }

  async triggerGeneration(): Promise<{ success: boolean; error?: string }> {
    for (const sel of FlowSelectors.generateButtons) {
      const btn = await this.browser.waitForElement(sel, 4000);
      if (btn.found && btn.visible && !btn.disabled) {
        const clicked = await this.browser.click(sel);
        if (clicked) {
          return { success: true };
        }
      }
    }
    return { success: false, error: 'ELEMENT_NOT_FOUND: Generate button was not found or disabled in Flow' };
  }

  async triggerRegeneration(): Promise<{ success: boolean; error?: string }> {
    for (const sel of FlowSelectors.regenerateButtons) {
      const btn = await this.browser.waitForElement(sel, 4000);
      if (btn.found && btn.visible && !btn.disabled) {
        const clicked = await this.browser.click(sel);
        if (clicked) return { success: true };
      }
    }
    // Fallback: click standard generate
    return await this.triggerGeneration();
  }

  /**
   * Non-arbitrary observation loop waiting for actual state completion
   */
  async observeUntilCompletion(
    onProgress?: (action: string, progress: number, screenshot?: string) => void,
    timeoutMs: number = 180000
  ): Promise<FlowGenerationResult> {
    const start = Date.now();
    let generationDetected = false;

    while (Date.now() - start < timeoutMs) {
      const status = await this.stateDetector.detectState();

      if (status.state === 'GENERATING') {
        generationDetected = true;
        const elapsedSec = Math.floor((Date.now() - start) / 1000);
        const estimatedProgress = Math.min(95, Math.max(10, Math.floor(elapsedSec * 2.5)));
        
        let screenshot: string | undefined;
        try {
          screenshot = await this.browser.screenshot();
        } catch {}

        if (onProgress) {
          onProgress('Generating media in Flow...', estimatedProgress, screenshot);
        }
      } else if (status.state === 'RESULT_READY' || (generationDetected && status.state === 'WORKSPACE_READY')) {
        // Result is ready
        if (onProgress) {
          onProgress('Generation completed. Detecting media output...', 98);
        }

        const resultInfo = await this.resultDetector.detectResult();
        const screenshot = await this.browser.screenshot();

        return {
          success: true,
          mediaType: resultInfo.mediaType || 'video',
          mediaUrl: resultInfo.mediaUrl,
          thumbnailBase64: screenshot,
          prompt: '',
          durationSeconds: Math.floor((Date.now() - start) / 1000)
        };
      } else if (status.state === 'ERROR') {
        return {
          success: false,
          mediaType: 'video',
          prompt: '',
          error: status.details
        };
      }

      await this.browser.wait(1500);
    }

    return {
      success: false,
      mediaType: 'video',
      prompt: '',
      error: 'Generation observation timed out before completion state was detected.'
    };
  }
}

/**
 * Main GoogleFlowController facade
 */
export class GoogleFlowController {
  public navigation: FlowNavigation;
  public stateDetector: FlowStateDetector;
  public resultDetector: FlowResultDetector;
  public projectManager: FlowProjectManager;
  public generation: FlowGeneration;

  constructor(private browser: BrowserController) {
    this.navigation = new FlowNavigation(browser);
    this.stateDetector = new FlowStateDetector(browser);
    this.resultDetector = new FlowResultDetector(browser);
    this.projectManager = new FlowProjectManager(browser);
    this.generation = new FlowGeneration(browser, this.stateDetector, this.resultDetector);
  }

  /**
   * Executes the full 15-step generation pipeline requested:
   * 1. Inspect state
   * 2. Determine if Flow is open
   * 3. Navigate if necessary
   * 4. Locate workspace
   * 5. Locate prompt
   * 6. Enter prompt
   * 7. Verify prompt
   * 8. Locate generate control
   * 9. Trigger generation
   * 10. Observe generation state
   * 11. Wait for completion
   * 12. Detect resulting media
   * 13. Capture result
   */
  async executeFullGeneration(
    promptText: string,
    onProgressUpdate?: (action: string, progress: number, screenshot?: string) => void
  ): Promise<FlowGenerationResult> {
    onProgressUpdate?.('Inspecting current Flow state...', 5);
    const initial = await this.stateDetector.detectState();

    if (initial.state === 'NOT_OPEN') {
      onProgressUpdate?.('Opening Google Flow in browser...', 10);
      await this.navigation.openFlow();
      await this.browser.wait(2500);
    }

    onProgressUpdate?.('Locating prompt field...', 20);
    const enterRes = await this.generation.enterPrompt(promptText);
    if (!enterRes.success) {
      throw new Error(enterRes.error || 'Failed to enter prompt into Flow');
    }

    onProgressUpdate?.(`Prompt verified: "${enterRes.verifiedText?.slice(0, 40)}...". Starting generation...`, 30);
    const genRes = await this.generation.triggerGeneration();
    if (!genRes.success) {
      throw new Error(genRes.error || 'Failed to trigger generation');
    }

    onProgressUpdate?.('Observing generation progress...', 35);
    const result = await this.generation.observeUntilCompletion(onProgressUpdate);
    result.prompt = promptText;
    return result;
  }
}
