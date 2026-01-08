const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { getSession } = require('../../middleware/auth');
const { sanitizePath } = require('../../utils/helpers');
const { logActivity } = require('../../utils/logger');
const { scanBuffer } = require('../../services/malwareScanner');
const { scanFileClam } = require('../../services/clamav');

router.post('/scan-files', getSession, async (req, res) => {
    req.setTimeout(0); // Unlimited timeout
    let targetPaths = req.body.paths;
    if (!targetPaths) targetPaths = [req.body.path || '/'];
    if (!Array.isArray(targetPaths)) targetPaths = [targetPaths];
    let scannedCount = 0;
    let infectedFiles = [];
    let scannedFilesList = [];
    const MAX_FILES = 1000000; // Unlimited Mode

    async function scanDir(currentPath) {
        if (scannedCount >= MAX_FILES) return;

        try {
            const list = await req.sftp.list(currentPath);
            if (!list) return;

            for (const item of list) {
                if (scannedCount >= MAX_FILES) break;

                const fullPath = currentPath === '/' ? `/${item.name}` : `${currentPath}/${item.name}`;

                if (item.type === 'd' || item.type === 'directory') {
                    // Skip restricted folders
                    if (['.git', 'node_modules', '.trash_bin'].includes(item.name)) continue;
                    await scanDir(fullPath);
                } else {
                    scannedCount++; // Count visited files
                    scannedFilesList.push(fullPath);

                    // Optimized Scan: Scan scripts, executables, documents, archives
                    const ext = item.name.slice(((item.name.lastIndexOf(".") - 1) >>> 0) + 2).toLowerCase();
                    const scanExts = ['php', 'phtml', 'js', 'sh', 'pl', 'py', 'cgi', 'html', 'bat', 'vbs', 'ps1', 'cmd', 'txt', 'exe', 'dll', 'com', 'msi', 'scr', 'jar', 'zip', 'rar', 'doc', 'docx', 'xls', 'xlsx', 'pdf'];

                    if (scanExts.includes(ext)) {
                        try {
                            // Read first 512KB for signature scan
                            const stream = req.sftp.createReadStream(fullPath, { start: 0, end: 512 * 1024 });
                            const chunks = [];
                            for await (const chunk of stream) chunks.push(chunk);
                            const buffer = Buffer.concat(chunks);

                            let malware = scanBuffer(buffer, item.name);

                            // If clean internally, Use ClamAV (if available)
                            if (!malware) {
                                const clamRes = await scanFileClam(fullPath);
                                if (clamRes && clamRes.isInfected) {
                                    malware = `ClamAV: ${clamRes.viruses.join(', ')}`;
                                }
                            }

                            if (malware) {
                                infectedFiles.push({ path: fullPath, threat: malware });
                                logActivity(req.sessionData.userId, 'malware_blocked', `Manual Scan detected ${malware} in ${fullPath}`, req);
                            }
                        } catch (err) {
                            // Ignore read errors
                        }
                    }
                }
            }
        } catch (e) {
            console.error('Dir scan error:', e.message);
        }
    }

    try {
        for (const p of targetPaths) {
            await scanDir(sanitizePath(p));
        }
        // Write Scan Report to File
        const logDir = path.join(__dirname, '../../../temp_reports');
        if (!fs.existsSync(logDir)) fs.mkdirSync(logDir, { recursive: true });

        const logId = `scan_${req.sessionData.userId}_${Date.now()}.txt`;
        const logContent = `SCAN REPORT\nGenerated: ${new Date().toLocaleString()}\nFiles Scanned: ${scannedCount}\nThreats Found: ${infectedFiles.length}\nTarget Paths: ${targetPaths.join(', ')}\n----------------------------------------\n` + scannedFilesList.join('\n');

        fs.writeFileSync(path.join(logDir, logId), logContent);

        // Limit display to last 100 for UI, provide logId for full download
        const logDisplay = scannedFilesList.slice(-100);

        res.json({ success: true, scanned: scannedCount, infected: infectedFiles, scannedList: logDisplay, logId });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

router.get('/download-report/:id', getSession, (req, res) => {
    const logId = req.params.id;
    if (!/^[a-z0-9_]+\.txt$/i.test(logId)) return res.status(400).send('Invalid Filename');

    const filePath = path.join(__dirname, '../../../temp_reports', logId);
    if (fs.existsSync(filePath)) {
        res.download(filePath, 'ScanReport.txt');
    } else {
        res.status(404).send('Report not found');
    }
});

module.exports = router;
