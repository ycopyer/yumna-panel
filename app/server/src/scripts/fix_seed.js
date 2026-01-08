const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'seed_bots.js');
let content = fs.readFileSync(filePath, 'utf8');

// Replace standard backslash+backtick with backtick
content = content.replace(/\\`/g, '`');
// Replace backslash+${ with ${
content = content.replace(/\\\${/g, '${');

fs.writeFileSync(filePath, content);
console.log('Fixed seed_bots.js');
