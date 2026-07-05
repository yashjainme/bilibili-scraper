import puppeteer from 'puppeteer-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import { config } from './config.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Register the stealth plugin to avoid detection
puppeteer.use(StealthPlugin());

export class BilibiliScraper {
  constructor() {
    this.browser = null;
  }

  /**
   * Initializes the stealth browser instance
   */
  async initBrowser() {
    const launchOptions = {
      headless: config.headless === "new" ? "new" : config.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-blink-features=AutomationControlled',
        `--user-agent=${config.userAgent}`
      ],
      defaultViewport: {
        width: 1280,
        height: 800
      }
    };

    if (config.proxy) {
      launchOptions.args.push(`--proxy-server=${config.proxy}`);
    }

    this.browser = await puppeteer.launch(launchOptions);
    console.log('Stealth browser initialized successfully.');
  }

  /**
   * Scrapes a single Bilibili video URL
   * @param {string} url - Bilibili video URL
   */
  async scrapeVideo(url) {
    if (!this.browser) {
      await this.initBrowser();
    }

    console.log(`Starting extraction for URL: ${url}`);
    const page = await this.browser.newPage();

    // Listen to console and page errors for debugging
    page.on('console', msg => {
      console.log(`[Browser Console] [${msg.type().toUpperCase()}] ${msg.text()}`);
    });
    page.on('pageerror', err => {
      console.error(`[Browser PageError]`, err ? (err.stack || err.message || err) : 'Unknown PageError');
    });
    
    // Set extra headers to look authentic
    await page.setExtraHTTPHeaders({
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'Referer': 'https://www.bilibili.com/'
    });

    // Map to store comments by their unique reply ID (rpid) to prevent duplicates
    const commentsMap = new Map();
    let commentsLimitReached = false;

    // Listen to network responses to intercept raw comment API payloads
    page.on('response', async (response) => {
      const responseUrl = response.url();
      
      // Match Bilibili reply/comments endpoints (main lists and nested reply lists)
      if (responseUrl.includes('api.bilibili.com/x/v2/reply')) {
        try {
          const contentType = response.headers()['content-type'] || '';
          if (contentType.includes('application/json')) {
            const text = await response.text();
            if (!text || text.trim() === '') return;
            
            const json = JSON.parse(text);
            if (json.code === 0 && json.data) {
              const replies = json.data.replies || [];
              const topReplies = json.data.top_replies || [];
              const allReplies = [...topReplies, ...replies];
              
              let newCommentsAdded = 0;
              for (const reply of allReplies) {
                if (!commentsMap.has(reply.rpid)) {
                  // Format the comment structure
                  const formattedReply = {
                    id: reply.rpid,
                    user: reply.member ? reply.member.uname : 'Anonymous',
                    userMid: reply.member ? reply.member.mid : null,
                    avatar: reply.member ? reply.member.avatar : null,
                    content: reply.content ? reply.content.message : '',
                    likes: reply.like || 0,
                    time: reply.ctime ? new Date(reply.ctime * 1000).toISOString() : null,
                    repliesCount: reply.rcount || 0,
                    subReplies: (reply.replies || []).map(sub => ({
                      id: sub.rpid,
                      user: sub.member ? sub.member.uname : 'Anonymous',
                      userMid: sub.member ? sub.member.mid : null,
                      content: sub.content ? sub.content.message : '',
                      likes: sub.like || 0,
                      time: sub.ctime ? new Date(sub.ctime * 1000).toISOString() : null
                    }))
                  };
                  
                  commentsMap.set(reply.rpid, formattedReply);
                  newCommentsAdded++;
                  
                  // Check limit condition
                  if (config.maxComments > 0 && commentsMap.size >= config.maxComments) {
                    commentsLimitReached = true;
                  }
                }
              }
              if (newCommentsAdded > 0) {
                console.log(`Intercepted API: Captured ${newCommentsAdded} new comments. Total collected: ${commentsMap.size}`);
              }
            }
          }
        } catch (err) {
          // Silent catch for parsing errors (e.g. Empty replies, failed requests)
        }
      }
    });

    try {
      // Inject the compiled login bypass script before navigation
      try {
        const bypassScriptPath = path.join(__dirname, 'bilibili_bypass_compiled.js');
        if (fs.existsSync(bypassScriptPath)) {
          const bypassScriptCode = fs.readFileSync(bypassScriptPath, 'utf8');
          await page.evaluateOnNewDocument(bypassScriptCode);
          console.log('Login bypass userscript injected successfully.');
        } else {
          console.warn('Warning: Compiled login bypass script not found at', bypassScriptPath);
        }
      } catch (err) {
        console.error('Error injecting bypass script:', err);
      }

      // Navigate to the video page
      await page.goto(url, {
        waitUntil: 'domcontentloaded',
        timeout: config.pageTimeout
      });

      // Wait for a core element to load (video title or uploader name)
      try {
        await page.waitForSelector('h1.video-title, .video-title, h1', { timeout: 15000 });
      } catch (e) {
        console.warn('Warning: Video title selector did not load within timeout. Proceeding with DOM evaluation.');
      }

      // Add a small human-like delay
      await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 2000));

      // Extract metadata from window.__INITIAL_STATE__ with DOM fallbacks
      console.log('Extracting video metadata...');
      const metadata = await page.evaluate(() => {
        const state = window.__INITIAL_STATE__ || {};
        const videoData = state.videoData || {};
        
        const getDomText = (selector) => {
          const el = document.querySelector(selector);
          return el ? el.textContent.trim() : null;
        };

        const title = videoData.title || getDomText('h1.video-title') || getDomText('.tit') || getDomText('h1');
        const desc = videoData.desc || getDomText('.desc-info') || getDomText('.video-desc');
        const uploaderName = (videoData.owner && videoData.owner.name) || getDomText('.up-name') || getDomText('.up-info--item .name') || getDomText('a.name');
        const uploaderMid = (videoData.owner && videoData.owner.mid) || state.upInfo?.mid || state.videoInfo?.upMid;
        
        const views = videoData.stat?.view || getDomText('.view-text') || getDomText('.view');
        const likes = videoData.stat?.like || getDomText('.like') || getDomText('.video-like-info');
        const coins = videoData.stat?.coin || getDomText('.coin');
        const shares = videoData.stat?.share || getDomText('.share');
        const repliesCount = videoData.stat?.reply || getDomText('.reply');

        return {
          bvid: videoData.bvid || null,
          aid: videoData.aid || null,
          title,
          desc,
          pubdate: videoData.pubdate ? new Date(videoData.pubdate * 1000).toISOString() : null,
          uploader: {
            name: uploaderName,
            mid: uploaderMid,
            face: videoData.owner?.face || null
          },
          stats: {
            views,
            likes,
            coins,
            shares,
            repliesCount
          }
        };
      });

      // Scroll to trigger comment loads
      console.log('Scrolling down to locate comments section...');
      const commentSelector = '.comment-container, bili-comments, #comment';
      let commentsSectionFound = false;

      try {
        await page.evaluate((selector) => {
          const el = document.querySelector(selector);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth' });
            return true;
          }
          return false;
        }, commentSelector);
        commentsSectionFound = true;
      } catch (err) {
        // Fallback standard scroll down
        await page.evaluate(() => window.scrollBy(0, 1200));
      }

      // Human-like pause after scrolling to the comment section
      await new Promise(resolve => setTimeout(resolve, 3000 + Math.random() * 2000));

      // Scroll loop to fetch more comments dynamically
      let scrollAttempts = 0;
      let lastCommentsSize = 0;
      let noNewCommentsCount = 0;

      console.log('Loading comments iteratively via page clicks...');
      while (scrollAttempts < 50 && !commentsLimitReached) {
        // Wait a bit to ensure elements are updated
        await new Promise(resolve => setTimeout(resolve, 1500));

        // Check if we hit the limit
        if (config.maxComments > 0 && commentsMap.size >= config.maxComments) {
          console.log(`Reached requested max comments limit: ${config.maxComments}`);
          break;
        }

        // Try to find the next page button
        const nextButtonSelector = '.page-switcher-next-btn';
        let nextButton = await page.$(nextButtonSelector);
        
        if (!nextButton) {
          // If no next page button, let's scroll down to ensure the page switcher has mounted
          await page.evaluate(() => window.scrollBy(0, 800));
          await new Promise(resolve => setTimeout(resolve, config.scrollDelay));
          
          nextButton = await page.$(nextButtonSelector);
          if (!nextButton) {
            // Check if we've collected comments, if so, we might have hit the last page
            if (commentsMap.size > lastCommentsSize) {
              lastCommentsSize = commentsMap.size;
              noNewCommentsCount = 0;
            } else {
              noNewCommentsCount++;
              if (noNewCommentsCount >= 5) {
                console.log('No next page button found after multiple scrolls. Stopping pagination loop.');
                break;
              }
            }
            scrollAttempts++;
            continue;
          }
        }

        // Scroll the next button into view
        await page.evaluate((btnSel) => {
          const el = document.querySelector(btnSel);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        }, nextButtonSelector);

        // Human-like pause before clicking
        const humanDelay = 1500 + Math.floor(Math.random() * 1500);
        await new Promise(resolve => setTimeout(resolve, humanDelay));

        // Click the next page button
        try {
          await nextButton.click();
          console.log(`Clicked next page button. Total comments so far: ${commentsMap.size}`);
        } catch (clickErr) {
          console.warn('Failed to click next page button, trying fallback scroll:', clickErr.message);
          await page.evaluate(() => window.scrollBy(0, 500));
        }

        // Wait for page to fetch and render
        await new Promise(resolve => setTimeout(resolve, config.scrollDelay + Math.floor(Math.random() * 1000)));

        // Check if comments count has grown
        const currentCommentsSize = commentsMap.size;
        if (currentCommentsSize === lastCommentsSize) {
          noNewCommentsCount++;
          if (noNewCommentsCount >= 5) {
            console.log('Comments count has not grown after multiple page attempts. Stopping pagination loop.');
            break;
          }
        } else {
          noNewCommentsCount = 0; // Reset
        }

        lastCommentsSize = currentCommentsSize;
        scrollAttempts++;
      }

      console.log(`Extraction complete for video: "${metadata.title}"`);
      console.log(`Total comments extracted: ${commentsMap.size}`);

      return {
        metadata,
        comments: Array.from(commentsMap.values())
      };

    } catch (error) {
      console.error(`Error scraping URL ${url}:`, error);
      throw error;
    } finally {
      await page.close();
    }
  }

  /**
   * Closes the stealth browser instance
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      console.log('Stealth browser closed.');
    }
  }
}
