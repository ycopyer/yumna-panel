const captchaStore = new Map();
const twoFactorStore = new Map();
const lastSentStore = new Map(); // Tracks when the last 2FA was sent to a user
const previewTokenStore = new Map();

// Helper for cleaning up stores
setInterval(() => {
    const now = Date.now();
    for (const [id, data] of captchaStore.entries()) {
        // Increased to 20 minutes for better UX
        if (data.expiresAt < now) captchaStore.delete(id);
    }
    for (const [id, data] of twoFactorStore.entries()) {
        // Increased to 30 minutes
        if (data.expiresAt < now) twoFactorStore.delete(id);
    }
    for (const [id, time] of lastSentStore.entries()) {
        if (now - time > 15 * 60 * 1000) lastSentStore.delete(id);
    }
    for (const [id, data] of previewTokenStore.entries()) {
        if (data.expiresAt < now) previewTokenStore.delete(id);
    }
}, 30000);

module.exports = {
    captchaStore,
    twoFactorStore,
    lastSentStore,
    previewTokenStore
};
