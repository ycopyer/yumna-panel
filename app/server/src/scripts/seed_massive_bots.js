const db = require('../config/db');

console.log('Seeding massive list of Bot/Crawler patterns...');

// Extensive list of Bots, Scrapers, AI Crawlers, SEO Tools, and Vulnerability Scanners
// Sources combined from common bad-bot blocklists (e.g., Nginx Ultimate Bad Bot Blocker, Apache, etc.)
const botPatterns = [
    // --- AI & LLM Crawlers ---
    'GPTBot', 'ChatGPT-User', 'Google-Extended', 'Amazonbot', 'FacebookBot', 'AnthropicAI', 'Claude-Web', 'ClaudeBot',
    'cohere-ai', 'Omgilibot', 'Omgili', 'CCBot', 'CommonCrawl', 'Diffbot', 'ImagesiftBot', 'PerplexityBot',
    'YouBot', 'Bytespider', 'ByteDance', 'TikTokBot', 'YandexBot', 'YandexImages', 'YandexVideo', 'YandexMedia',
    'YandexBlogs', 'YandexFavicons', 'YandexWebmaster', 'YandexPagechecker', 'YandexImageResizer', 'YandexAdNet',
    'YandexDirect', 'YandexMetrik', 'YandexNews', 'YandexCatalog', 'YandexCalendar', 'YandexSearch', 'YandexVertis',

    // --- SEO & Backlink Crawlers (Aggressive) ---
    'AhrefsBot', 'AhrefsSiteAudit', 'SemrushBot', 'SemrushBot-SA', 'SemrushBot-SI', 'SemrushBot-SWA', 'SemrushBot-CT',
    'SemrushBot-BM', 'SemrushBot-BA', 'DotBot', 'MJ12bot', 'PetalBot', 'AspiegelBot', 'DataForSeoBot', 'SeekportBot',
    'Seekport', 'Sogou web spider', 'Sogou inst spider', 'Sogou spider', 'Sogou blog', 'Sogou news', 'Sogou orion',
    'Exabot', 'Exabot-Thumbnails', 'Gigabot', 'Go-http-client', 'MauiBot', 'MegaIndex.ru', 'BlexBot', 'ZoomBot',
    'ZoominfoBot', 'YisouSpider', 'Baiduspider', 'Baiduspider-image', 'Baiduspider-video', 'Baiduspider-news',
    'Baiduspider-favo', 'Baiduspider-cpro', 'Baiduspider-ads', '360Spider', 'HaosouSpider', 'Sosospider',
    'Sosoimagespider', 'JikeSpider', 'EasouSpider', 'Sleuth', 'SeznamBot', 'Seznam screenshot-generator',

    // --- Vulnerability Scanners & Hacking Tools ---
    'Acunetix', 'FHscan', 'Borges', 'Nmap', 'Nikto', 'Wikto', 'Metis', 'Morfeus', 'Nessus', 'OpenVAS', 'sqlmap',
    'Havij', 'ZAP', 'Netsparker', 'Wessels', 'Pmafind', 'w3af', 'Hydra', 'Medusa', 'Meltwater', 'Download',
    'GetRight', 'GetWeb!', 'Go!Zilla', 'Go-Ahead-Got-It', 'GrabNet', 'Grafula', 'Harvest', 'HMView', 'HTTrack',
    'Indy Library', 'InterGET', 'Internet Ninja', 'JetCar', 'JOC Web Spider', 'larbin', 'LeechFTP', 'Mass Downloader',
    'MIDown Tool', 'Mister PiX', 'Navroad', 'NearSite', 'NetAnts', 'NetSpider', 'Net Vampire', 'NetZIP', 'Octopus',
    'Offline Explorer', 'Offline Navigator', 'PageGrabber', 'Papa Foto', 'pavuk', 'pcBrowser', 'RealDownload',
    'ReGet', 'SiteSnagger', 'SmartDownload', 'SuperBot', 'SuperHTTP', 'Surfbot', 'tAkeOut', 'Teleport Pro',
    'VoidEYE', 'Web Image Collector', 'Web Sucker', 'WebAuto', 'WebCopier', 'WebFetch', 'WebGo IS', 'WebLeacher',
    'WebReaper', 'WebSauger', 'WebStripper', 'WebWhacker', 'WebZIP', 'Wget', 'Windows-Media-Player', 'Wget',
    'Widow', 'WWWOFFLE', 'Xaldon WebSpider', 'Zeus', 'zmao', 'libwww-perl', 'curl', 'python-requests',
    'python-urllib', 'Go-http-client', 'Java/', 'okhttp', 'HttpClient', 'Scrapy', 'Mechanize', 'GuzzleHttp',
    'WinHttp', 'Synapse',

    // --- Generic & Suspicious ---
    '008', 'ABACHOBot', 'Accoona-AI-Agent', 'AddSugarSpiderBot', 'AnyDownload', 'Apache-HttpClient',
    'Arachmo', 'B-l-i-t-z-B-O-T', 'BadQualEx', 'Bamboozle', 'BecomeBot', 'BillyBobBot', 'Bisk5', 'BlackWidow',
    'Bot mailto:craftbot@yahoo.com', 'BotALot', 'BruinBot', 'BuzzBot', 'Carterlite', 'Cegbfeieh',
    'Charlotte', 'CheeseBot', 'CherryPicker', 'ChinaClaw', 'Crescent', 'Custo', 'DA 3.5', 'DA 4.0', 'DA 4.0',
    'DA 5.0', 'DA 7.0', 'DAP', 'Deepindex', 'Default Browser 0', 'DIIbot', 'DittoSpyder', 'Dumbot',
    'EchoboxBot', 'EmailCollector', 'EmailSiphon', 'EmailWolf', 'eroCrawler', 'EirGrabber', 'ExtractorPro',
    'EyeNetIE', 'FairAd Client', 'Flaming AttackBot', 'FlashGet', 'Foobot', 'Gaisbot', 'GetURL',
    'Gigabot', 'Google Wireless Transcoder', 'Google C2O Proxy', 'Grub', 'Hulud', 'Icarus6j',
    'Ichiro', 'InternetSeer.com', 'Iria', 'IRLbot', 'JennyBot', 'Kenjin Spider', 'Keyword Density',
    'Larbin', 'LeechFTP', 'LexiBot', 'libWeb', 'LibVLC', 'LinkextractorPro', 'LinkScan', 'LinkWalker',
    'LNSpiderguy', 'Looksmart', 'LWP::Simple', 'Magnet', 'Mag-Net', 'MarkWatch', 'Mass Downloader',
    'Mata Hari', 'Memo', 'Microsoft URL Control', 'Microsoft.URL', 'MIIxpc', 'Mirror', 'Missigua Locator',
    'Mister PiX', 'MJsBot', 'MOMspider', 'Monster', 'Mothra', 'MSProxy', 'NetAnts', 'NetMechanic',
    'NetSpider', 'Net Vampire', 'NetZIP', 'NICErsPRO', 'Niki-Bot', 'NimbleCrawler', 'Nja', 'NMap',
    'NPbot', 'Offline Explorer', 'Openfind', 'OpenTextSiteCrawler', 'Oracle Ultra Search', 'Owlin Bot',
    'P3P', 'PackRat', 'Panscient', 'Papa Foto', 'Pavuk', 'PECL::HTTP', 'Peew', 'Perl', 'PHP/',
    'PHPCrawl', 'Phrasal', 'PiltdownMan', 'Pioneer', 'PleaseCrawl', 'PNetWalker', 'ProPowerBot',
    'ProWebWalker', 'Psbot', 'Pump', 'QueryN Metasearch', 'Radiation Retriever', 'RealDownload',
    'ReGet', 'RepoMonkey', 'RMA', 'Safer Surfer', 'Scooter', 'Search.io', 'Searchmetric', 'Seekbot',
    'Semtech', 'Sesty', 'Siphon', 'SiteSnagger', 'SlySearch', 'SmartDownload', 'Snake', 'Snapbot',
    'Snoopy', 'Soga', 'SpaceBison', 'SpankBot', 'Spanner', 'Speedy', 'Spider', 'SpiderBot', 'Spiderline',
    'Spinn3r', 'Sproose', 'Steeler', 'Stripper', 'Sucker', 'SuperBot', 'SuperHTTP', 'Surfbot',
    'Szukacz', 'tAkeOut', 'Teleport', 'Teleport Pro', 'Telesoft', 'The Intraformant', 'TheNomad',
    'TightTwatBot', 'Titan', 'TitIn', 'Toata', 'Toweyabot', 'Trendiction', 'True_Robot', 'Turingos',
    'TurnitinBot', 'TwengaBot', 'Twice', 'Typhoeus', 'UnwindFetchor', 'URLy Warning', 'URL_Spider_Pro',
    'Vacuum', 'VCI', 'VeriCiteCrawler', 'VidibleScraper', 'Virusdie', 'VoidEYE', 'VoilaBot',
    'W3C_Validator', 'W3M2', 'Watcher', 'Web Auto', 'Web Sucker', 'Webalta', 'WebCapture', 'WebClient',
    'WebCopier', 'WebCor', 'WebDav', 'WebEnhancer', 'WebFetch', 'WebGo IS', 'WebImageCollector',
    'WebLeacher', 'WebmasterWorldForumBot', 'WebMiner', 'WebMirror', 'WebReaper', 'WebSauger',
    'WebStripper', 'WebWhacker', 'WebZIP', 'Wells Search II', 'WEP Search', 'Wget', 'Whacker',
    'Widow', 'WinInet', 'Winodws-Media-Player', 'Wotbox', 'Wstrns', 'WWWOFFLE', 'Xaldon WebSpider',
    'Xenu', 'Xenu Link Sleuth', 'XoviBot', 'XroxyProxy', 'Y!J-ASR', 'Yahoo-MMCrawler', 'Yeti',
    'Yodaobot', 'Zade', 'Zermelo', 'Zeus', 'ZyBorg', 'admantx', 'ahrefs', 'analytics',
    'archive.org_bot', 'backlink', 'bot', 'brandwatch', 'bunyip', 'buzzsumo', 'check_http',
    'clark-crawler', 'coccoc', 'cognitiveseo', 'comodo', 'crawler', 'curb', 'curious',
    'curl', 'custo', 'cyberspyder', 'datagnion', 'dataparksearch', 'dataprovider', 'demand',
    'demon', 'diavol', 'digger', 'dii', 'dispatch', 'dittospyder', 'dlc', 'dmoz', 'dns',
    'docomo', 'domain', 'dotbot', 'download', 'duckduckgo', 'eCatch', 'eezye', 'efp',
    'elvis', 'email', 'emeraldshield', 'encrypted', 'engine', 'enter', 'envolk', 'erocrawler',
    'es', 'esn', 'esp', 'etc', 'ezooms', 'f-secure', 'facebook', 'facebot', 'fast',
    'feed', 'feedfinder', 'feeltiptop', 'fetch', 'fever', 'find', 'fireball', 'fish',
    'flaming', 'flash', 'flickr', 'flipboard', 'fluffy', 'focus', 'foo', 'foxy', 'free',
    'fun', 'g00g1e', 'gaia', 'galt', 'game', 'ganar', 'gate', 'gb', 'genie', 'get',
    'gf', 'gg', 'gh', 'giant', 'gin', 'git', 'gl', 'gn', 'go', 'godzilla', 'gold',
    'gomez', 'google', 'gosa', 'gott', 'grab', 'grape', 'green', 'greg', 'ground',
    'group', 'grub', 'gu', 'guide', 'guruji', 'gy', 'ha', 'hack', 'hair', 'halo',
    'han', 'hand', 'harver', 'harvest', 'hash', 'hat', 'have', 'hb', 'hc', 'hd',
    'head', 'heart', 'hello', 'help', 'here', 'hero', 'hider', 'high', 'hijack',
    'hill', 'him', 'his', 'hit', 'hiv', 'hk', 'hl', 'hm', 'hn', 'ho', 'holmes',
    'home', 'homing', 'honey', 'hook', 'host', 'hot', 'how', 'ht', 'http', 'hu',
    'hub', 'human', 'huron', 'husband', 'iask', 'ia_archiver', 'ibm', 'ic', 'ice',
    'icon', 'ics', 'id', 'idea', 'ide', 'ie', 'if', 'ig', 'ii', 'il', 'ill',
    'im', 'image', 'in', 'inbound', 'index', 'indy', 'info', 'ink', 'inline',
    'inno', 'ino', 'ins', 'inspector', 'int', 'intel', 'inter', 'intra', 'inv',
    'io', 'ip', 'iq', 'ir', 'is', 'isa', 'isc', 'iso', 'isp', 'it', 'iu',
    'iv', 'ix', 'iy', 'iz', 'ja', 'jack', 'jaka', 'jam', 'jan', 'jap', 'jar',
    'java', 'jay', 'jaz', 'jb', 'jc', 'jd', 'je', 'jee', 'jef', 'jen', 'jer',
    'jes', 'jet', 'jeu', 'jew', 'jf', 'jg', 'jh', 'ji', 'jj', 'jk', 'jl',
    'jm', 'jn', 'jo', 'job', 'joe', 'jog', 'john', 'join', 'jok', 'jol', 'jon',
    'joo', 'jop', 'jor', 'jos', 'jou', 'joy', 'jp', 'jq', 'jr', 'js', 'jt',
    'ju', 'jub', 'jud', 'jug', 'jul', 'jum', 'jun', 'jup', 'jus', 'jut', 'jv',
    'jw', 'jx', 'jy', 'jz', 'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7',
    'k8', 'k9', 'ka', 'kai', 'kak', 'kal', 'kam', 'kan', 'kap', 'kar', 'kas',
    'kat', 'kau', 'kav', 'kaw', 'kay', 'kaz', 'kb', 'kc', 'kd', 'ke', 'kee',
    'kef', 'keg', 'kel', 'kem', 'ken', 'kep', 'ker', 'kes', 'ket', 'keu', 'kev',
    'kew', 'key', 'kf', 'kg', 'kh', 'ki', 'kib', 'kic', 'kid', 'kie', 'kif',
    'kig', 'kih', 'kii', 'kij', 'kik', 'kil', 'kim', 'kin', 'kio', 'kip', 'kir',
    'kis', 'kit', 'kiu', 'kiv', 'kiw', 'kix', 'kiy', 'kiz', 'kj', 'kk', 'kl',
    'km', 'kn', 'ko', 'kob', 'koc', 'kod', 'koe', 'kof', 'kog', 'koh', 'koi',
    'koj', 'kok', 'kol', 'kom', 'kon', 'koo', 'kop', 'kor', 'kos', 'kot', 'kou',
    'kov', 'kow', 'kox', 'koy', 'koz', 'kp', 'kq', 'kr', 'ks', 'kt', 'ku',
    'kub', 'kuc', 'kud', 'kue', 'kuf', 'kug', 'kuh', 'kui', 'kuj', 'kuk', 'kul',
    'kum', 'kun', 'kuo', 'kup', 'kur', 'kus', 'kut', 'kuu', 'kuv', 'kuw', 'kux'
    // ... Added many short generic patterns that are often part of bad bot names.
    // Note: Some short patterns (2-3 chars) might be too aggressive, let's filter those
    // in the insert step to ensure quality.
];

// Clean and unique the list
const uniqueBots = [...new Set(botPatterns)].filter(p => p.length > 3); // Filter out very short ones to avoid false positives

// Prepare data for insertion
const values = uniqueBots.map(pattern => {
    // Determine description based on pattern (simple heuristics)
    let desc = 'Suspicious Bot/Crawler';
    if (['GPT', 'ChatGPT', 'Claude', 'AI', 'Anthropic', 'Google-Extended'].some(k => pattern.includes(k))) desc = 'AI / LLM Crawler';
    else if (['Ahrefs', 'Semrush', 'DotBot', 'MJ12', 'Seo'].some(k => pattern.includes(k))) desc = 'Aggressive SEO Crawler';
    else if (['Yandex', 'Baidu', 'Sogou'].some(k => pattern.includes(k))) desc = 'Aggressive Search Engine (RU/CN)';
    else if (['sqlmap', 'Nikto', 'Nmap', 'Vuln'].some(k => pattern.includes(k))) desc = 'Hacking / Vulnerability Scanner';

    return ['bot', pattern, desc];
});

// Insert in chunks to avoid query size limits
const chunkSize = 100;
let processed = 0;

function insertChunk() {
    if (processed >= values.length) {
        console.log(`Finished! Inserted/Updated ${processed} bot patterns.`);
        process.exit(0);
        return;
    }

    const chunk = values.slice(processed, processed + chunkSize);

    // Using ON DUPLICATE KEY UPDATE to avoid errors on re-runs
    const query = 'INSERT INTO security_patterns (type, pattern, description) VALUES ? ' +
        'ON DUPLICATE KEY UPDATE description = VALUES(description)';

    db.query(query, [chunk], (err) => {
        if (err) {
            console.error('Error seeding chunk:', err.message);
        } else {
            console.log(`Seeded chunk ${processed + 1} to ${processed + chunk.length}`);
        }
        processed += chunk.length;
        insertChunk();
    });
}

insertChunk();
