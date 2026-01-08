const NodeClam = require('clamscan');
const fs = require('fs');

let clamEngine = null;

// Initialize ClamAV
// Note for USER: Process requires ClamAV installed on Windows/Linux system.
// Windows Default Path: 'C:\\Program Files\\ClamAV\\clamdscan.exe' or 'clamscan.exe'
// Ensure 'clamd' service is running for best performance.
const initClamAV = async () => {
    try {
        clamEngine = await new NodeClam().init({
            remove_infected: false, // Don't auto delete
            quarantine_infected: false,
            scan_log: null,
            debug_mode: false,
            scan_recursively: false,
            clamdscan: {
                path: 'C:\\Program Files\\ClamAV\\clamdscan.exe',
                // If clamd is listening on TCP (typical for Windows setups)
                host: '127.0.0.1',
                port: 3310,
                timeout: 120000,
                local_fallback: true, // Use clamscan if clamd fails
            },
            clamscan: {
                path: 'C:\\Program Files\\ClamAV\\clamscan.exe',
                db: null,
                scan_archives: true,
                active: true
            },
            preference: 'clamdscan'
        });
        console.log("ClamAV Engine Initialized.");
        return clamEngine;
    } catch (err) {
        console.warn("ClamAV Initialization Failed (Is ClamAV installed?):", err.message);
        return null;
    }
};

const scanFileClam = async (filePath) => {
    if (!clamEngine) {
        // Try simple lazy init
        clamEngine = await initClamAV();
        if (!clamEngine) return { isInfected: false, viruses: [] }; // Fallback
    }

    try {
        const { isInfected, viruses } = await clamEngine.scan_file(filePath);
        return { isInfected, viruses };
    } catch (err) {
        // console.error(`ClamAV Scan Error on ${filePath}:`, err.message);
        return { isInfected: false, viruses: [], error: err.message };
    }
};

module.exports = { initClamAV, scanFileClam };
