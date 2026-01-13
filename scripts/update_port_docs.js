const fs = require('fs');
const path = require('path');

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else if (file.endsWith('.md')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const docsDir = 'c:\\YumnaPanel\\docs';
const files = getAllFiles(docsDir);

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Replace port references for the panel
    // We target 3001 and replace with 3000
    // We use word boundaries to avoid affecting things like 30010
    content = content.replace(/\b3001\b/g, '3000');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated port 3001 -> 3000 in: ${file}`);
    }
});

// Also update README.md in root
const rootReadme = 'c:\\YumnaPanel\\README.md';
if (fs.existsSync(rootReadme)) {
    let content = fs.readFileSync(rootReadme, 'utf8');
    let original = content;
    content = content.replace(/\b3001\b/g, '3000');
    if (content !== original) {
        fs.writeFileSync(rootReadme, content);
        console.log(`Updated port 3001 -> 3000 in: ${rootReadme}`);
    }
}
