import { config } from './config.js';
import { BilibiliScraper } from './scraper.js';
import fs from 'fs';
import path from 'path';

/**
 * Extracts the BV ID from a standard Bilibili URL
 * @param {string} url 
 * @returns {string}
 */
function extractBvId(url) {
  const match = url.match(/video\/(BV[a-zA-Z0-9]+)/i);
  if (match && match[1]) {
    return match[1];
  }
  return 'unknown_' + Math.random().toString(36).substring(2, 10);
}

/**
 * Ensures a directory exists
 * @param {string} dirPath 
 */
function ensureDirectoryExists(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

async function main() {
  const scraper = new BilibiliScraper();
  
  try {
    ensureDirectoryExists(config.outputDir);
    console.log(`Output directory verified: ${config.outputDir}`);

    const urls = config.urls || [];
    if (urls.length === 0) {
      console.log('No URLs configured in config.js. Exiting.');
      return;
    }

    console.log(`Starting scraper runner. Total URLs to scrape: ${urls.length}\n`);

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i];
      const bvId = extractBvId(url);
      
      console.log(`[${i + 1}/${urls.length}] Processing: ${url} (BVID: ${bvId})`);
      
      try {
        const result = await scraper.scrapeVideo(url);
        
        const outputPayload = {
          scrapedAt: new Date().toISOString(),
          sourceUrl: url,
          bvid: bvId,
          ...result
        };
        
        const outputFileName = `video_${bvId}.json`;
        const outputPath = path.join(config.outputDir, outputFileName);
        
        fs.writeFileSync(outputPath, JSON.stringify(outputPayload, null, 2), 'utf8');
        console.log(`Successfully saved scraped data to: ${outputPath}\n`);

      } catch (err) {
        console.error(`Failed to scrape URL ${url}:`, err.message);
      }

      // Add a cooling off period between scraping different videos if there's more than one
      if (i < urls.length - 1) {
        const coolingPeriod = 5000 + Math.floor(Math.random() * 5000); // 5 to 10 seconds
        console.log(`Waiting for ${Math.round(coolingPeriod / 1000)} seconds before next video to prevent IP flags...`);
        await new Promise(resolve => setTimeout(resolve, coolingPeriod));
      }
    }

  } catch (error) {
    console.error('An error occurred during execution:', error);
  } finally {
    await scraper.closeBrowser();
    console.log('Scraper runner finished execution.');
  }
}

main();
