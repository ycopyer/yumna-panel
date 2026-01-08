const fs = require('fs');
const path = require('path');

const getPHPBaseDir = () => {
    return 'C:\\YumnaPanel\\bin\\php';
};

const findPHPDir = (full_version) => {
    if (!full_version) return null;
    const standaloneDir = path.join('C:\\YumnaPanel\\bin\\php', full_version);
    // Check Standalone YumnaPanel directory
    if (fs.existsSync(standaloneDir)) return standaloneDir;

    // Check if the version string is just '8.2' but folder is 'php-8.2.x-...'
    const base = getPHPBaseDir();
    if (fs.existsSync(base)) {
        const dirs = fs.readdirSync(base);
        const match = dirs.find(d => d.includes(full_version));
        if (match) return path.join(base, match);
    }

    // Search only in YumnaPanel directories

    return null;
};

module.exports = {
    getPHPBaseDir,
    findPHPDir
};
