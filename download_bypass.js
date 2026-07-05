import https from 'https';
import fs from 'fs';

const DEPENDENCIES = [
  { name: 'viewer.js', url: 'https://update.greasyfork.org/scripts/510239/1454424/viewer.js' },
  { name: 'spark-md5.js', url: 'https://update.greasyfork.org/scripts/475332/1250588/spark-md5.js' },
  { name: 'comment-style.js', url: 'https://update.greasyfork.org/scripts/512574/1464548/inject-bilibili-comment-style.js' },
  { name: 'viewer-style.js', url: 'https://update.greasyfork.org/scripts/512576/1464552/inject-viewerjs-style.js' },
  { name: 'main-userscript.js', url: 'https://update.greasyfork.org/scripts/473498/Bilibili%20-%20%E5%9C%A8%E6%9C%AA%E7%99%BB%E5%BD%95%E7%9A%8F%E6%83%85%E5%86%B5%E4%B8%8B%E7%85%A7%E5%B8%B8%E5%8A%A0%E8%BD%BD%E8%AF%84%E8%AE%BA.user.js' }
];

const outputFile = './bilibili_bypass_compiled.js';

function fetchUrlContent(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        fetchUrlContent(response.headers.location).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url} (Status: ${response.statusCode})`));
        return;
      }
      let data = '';
      response.on('data', (chunk) => { data += chunk; });
      response.on('end', () => resolve(data));
    }).on('error', reject);
  });
}

async function compile() {
  try {
    console.log('Compiling Bilibili Login Bypass Script with Body-safety wrapper...');
    
    // 1. Write the Tampermonkey mock headers
    let compiledCode = `
// --- TAMPERMONKEY API MOCKS ---
window.unsafeWindow = window;
window.GM_getValue = function(key, defaultValue) {
  if (key === 'enableReplyPagination') return true; 
  if (key === 'enableLoadAllSubRepliesAtOnce') return true; 
  return defaultValue;
};
window.GM_setValue = function(key, value) {};
window.GM_registerMenuCommand = function(name, fn) {};
`;

    for (const dep of DEPENDENCIES) {
      console.log(`Fetching ${dep.name}...`);
      const content = await fetchUrlContent(dep.url);
      compiledCode += `\n\n// --- START OF ${dep.name} ---\n`;
      compiledCode += content;
      compiledCode += `\n// --- END OF ${dep.name} ---\n`;
    }

    // Wrap the compiled code in a body-safety execution closure
    const wrappedCode = `/**
 * Bilibili Comments Login Bypass - Compiled Standalone Script
 * Generated automatically with Body-safety wrapper.
 */
(function() {
  function runBypassScript() {
    try {
      ${compiledCode}
    } catch (e) {
      console.error('Error running compiled Bilibili bypass script:', e);
    }
  }

  if (document.body) {
    runBypassScript();
  } else {
    const timer = setInterval(() => {
      if (document.body) {
        clearInterval(timer);
        runBypassScript();
      }
    }, 1);
  }
})();
`;

    fs.writeFileSync(outputFile, wrappedCode, 'utf8');
    console.log(`Successfully compiled standalone bypass script to: ${outputFile}`);
    process.exit(0);
  } catch (error) {
    console.error('Compilation failed:', error);
    process.exit(1);
  }
}

compile();
