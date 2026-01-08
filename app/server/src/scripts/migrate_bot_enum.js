const db = require('../config/db');

console.log('Migrating security_patterns to include BOT type...');

const alterQuery = "ALTER TABLE security_patterns MODIFY COLUMN type ENUM('sqli', 'xss', 'bot') NOT NULL";

db.query(alterQuery, (err) => {
    if (err) {
        console.error('Error altering table:', err.message);
        // Continue anyway in case it's already done or specific error
    } else {
        console.log('Table security_patterns altered successfully.');
    }

    // Seed some default Bot patterns
    const botRules = [
        // AI Bots
        { type: 'bot', pattern: 'GPTBot', description: 'OpenAI Crawler' },
        { type: 'bot', pattern: 'ChatGPT-User', description: 'ChatGPT User' },
        { type: 'bot', pattern: 'Google-Extended', description: 'Google Bard/Gemini' },
        { type: 'bot', pattern: 'CCBot', description: 'Common Crawl (AI Training)' },
        { type: 'bot', pattern: 'anthropic-ai', description: 'Claude AI' },
        { type: 'bot', pattern: 'ClaudeBot', description: 'Claude AI Crawler' },
        { type: 'bot', pattern: 'Omgilibot', description: 'Omgili AI Scraper' },
        { type: 'bot', pattern: 'FacebookBot', description: 'Facebook Crawler' },
        { type: 'bot', pattern: 'Bytespider', description: 'ByteDance/TikTok Spider' },

        // SEO/Backlink Bots (Often unwanted)
        { type: 'bot', pattern: 'AhrefsBot', description: 'Ahrefs SEO Tool' },
        { type: 'bot', pattern: 'SemrushBot', description: 'Semrush SEO Tool' },
        { type: 'bot', pattern: 'MJ12bot', description: 'Majestic SEO' },
        { type: 'bot', pattern: 'DotBot', description: 'Moz SEO' },
        { type: 'bot', pattern: 'PetalBot', description: 'Huawei Search' },

        // Suspicious / Fake
        { type: 'bot', pattern: '(LieBaoFast|Mb2345Browser|LieBao|Fast)', description: 'Suspicious Chinese Browsers/Bots' },
        { type: 'bot', pattern: 'Edg/', description: 'Possible Fake Edge (Check version if needed, simplified)' }, // Careful with this one, maybe too broad. Let's stick to obvious ones.
        { type: 'bot', pattern: 'python-requests', description: 'Python Script' },
        { type: 'bot', pattern: 'curl', description: 'Curl Tool' },
        { type: 'bot', pattern: 'wget', description: 'Wget Tool' }
    ];

    // Filter "Edg/" out to be safe for now, user can add it.
    const safeBots = botRules.filter(r => r.pattern !== 'Edg/');

    const values = safeBots.map(r => [r.type, r.pattern, r.description]);

    db.query('INSERT INTO security_patterns (type, pattern, description) VALUES ?', [values], (e) => {
        if (e) {
            console.error('Error seeding bot patterns:', e.message);
        } else {
            console.log(`Seeded ${values.length} bot patterns.`);
        }
        process.exit(0);
    });
});
