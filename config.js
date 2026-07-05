export const config = {
  // Add Bilibili video URLs here

  // Unleash the avatar
  urls: [
    "https://www.bilibili.com/video/BV1zSbPziELZ/",
    "https://www.bilibili.com/video/BV1Vk7M6tEgx/",
    "https://www.bilibili.com/video/BV1oM2iB1EvK/",

  ],
  
  // Scraper Options
  maxComments: 200,       // Stop loading comments once we have at least this number (0 for all)
  headless: "new",        // "new" (headless) or false (headful)
  scrollDelay: 2000,      // Delay in ms between scroll actions (adds human-like pauses)
  pageTimeout: 60000,     // Timeout in ms for loading a video page
  
  // Anti-Detection & Proxy
  proxy: null,            // Proxy server URL e.g. "http://username:password@ip:port" (null if not using)
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  
  // Output Configuration
  outputDir: "./output",  // Directory to save the scraped JSON results
};
