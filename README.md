# Bilibili Scraper

![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white)
![Puppeteer](https://img.shields.io/badge/Puppeteer-40B5A4?style=for-the-badge&logo=Puppeteer&logoColor=white)
![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge)

A robust, automated scraper for Bilibili built with Node.js and Puppeteer. It extracts comprehensive video metadata and deeply paginated comments, exporting the collected data as structured JSON.

> **Disclaimer:** Ensure your use of this project complies with Bilibili's Terms of Service and all applicable laws and regulations.

> **Security Notice:** This project downloads and executes a third-party userscript from GreasyFork during the pre-start phase. Review the userscript if you have security concerns, or pin a specific revision if you require a reproducible environment.

## Features

- **Automated Comment Collection** – Retrieves comments across multiple pages, including nested replies.
- **Stealth Browser Automation** – Uses `puppeteer-extra-plugin-stealth` to reduce automation detection.
- **Smart Pagination** – Automatically navigates comment pages until the configured extraction limit is reached.
- **API-Based Extraction** – Captures and parses Bilibili's internal `/x/v2/reply` API responses, avoiding fragile DOM scraping.
- **Structured Output** – Exports video metadata and comments as well-formatted JSON files.
- **Secure Architecture** – Designed with safe serialization and defensive data handling practices.

## Installation

Clone the repository:

```bash
git clone https://github.com/yashjainme/bilibili-scraper.git
cd bilibili-scraper
```

Install dependencies:

```bash
npm install
```

## Configuration

Edit `config.js` to specify the target video URLs and extraction settings.

```javascript
export const config = {
  urls: [
    "https://www.bilibili.com/video/BV1es411D7sW"
  ],
  maxComments: 200,
  headless: "new",
  // Additional options...
};
```

## Usage

Run the scraper:

```bash
npm start
```

## Output

The scraper generates JSON files in the `output/` directory containing:

- Video metadata
  - Title
  - Views
  - Likes
  - Uploader information
  - Additional metadata
- Comments
  - Top-level comments
  - Nested replies
  - User information
  - Timestamps
  - Engagement metrics

## Project Structure

```
.
├── output/         # Generated JSON files
├── config.js       # Scraper configuration
├── index.js        # Main execution script
├── scraper.js      # Core Puppeteer scraper logic
└── package.json
```

## Contributing

Contributions are welcome. If you encounter a bug or have a feature request, please open an issue or submit a pull request.

## License

This project is licensed under the MIT License.