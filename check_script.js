import fs from 'fs';

const content = fs.readFileSync('./bilibili_bypass.js', 'utf8');
const lines = content.split('\n');

console.log('Searching for "Anchor"...');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('anchor')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});

console.log('Searching for scroll or load event...');
lines.forEach((line, index) => {
  if (line.toLowerCase().includes('scroll') || line.toLowerCase().includes('intersectionobserver')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
