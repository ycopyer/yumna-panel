const fs = require('fs');
const path = require('path');

function getAllMdFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    files.forEach(file => {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            if (file !== 'node_modules' && file !== '.git') {
                getAllMdFiles(filePath, fileList);
            }
        } else if (file.endsWith('.md')) {
            fileList.push(filePath);
        }
    });
    return fileList;
}

const mdFiles = getAllMdFiles('c:\\YumnaPanel');

mdFiles.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;
    // Replace versions
    content = content.replace(/v3\.0\.0/g, 'v3.1.0');
    content = content.replace(/v3\.0/g, 'v3.1');
    content = content.replace(/Version 3\.0\.0/g, 'Version 3.1.0');
    content = content.replace(/Version 3\.0/g, 'Version 3.1');

    if (content !== original) {
        fs.writeFileSync(file, content);
        console.log(`Updated: ${file}`);
    }
});
