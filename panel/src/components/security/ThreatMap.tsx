import React, { useEffect, useState, useMemo, useRef } from 'react';
import {
    Activity, Globe, ShieldAlert, Target, Zap, Server, Skull, X, Crosshair,
    ShieldCheck, ShieldX, BarChart3, Download,
    Volume2, VolumeX, Filter, Map as MapIcon, Flame, Monitor, User, Laptop,
    TrendingUp, Plus, Minus, RefreshCw
} from 'lucide-react';
import axios from 'axios';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    LineChart, Line, Cell
} from 'recharts';
import {
    MapContainer, TileLayer, Marker, Popup, Polyline, useMap,
    CircleMarker
} from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet marker icons using CDN to avoid local module resolution issues
const markerIcon = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png';
const markerShadow = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom Attacker Icon
const createHackerIcon = () => L.divIcon({
    html: `
        <div class="attacker-marker" style="width: 38px; height: 38px; background: rgba(239, 68, 68, 0.1); border: 2px solid #ef4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); animation: pulse-red 2s infinite;">
            <img src="/hacker.png" style="width: 24px; height: 24px; object-fit: contain;" />
        </div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
});

// Custom User Icon
const createUserIcon = () => L.divIcon({
    html: `
        <div class="user-marker" style="width: 38px; height: 38px; background: rgba(6, 182, 212, 0.1); border: 2px solid #06b6d4; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 15px rgba(6, 182, 212, 0.3); animation: pulse-cyan 2s infinite;">
            <img src="/user.png" style="width: 24px; height: 24px; object-fit: contain;" />
        </div>`,
    className: '',
    iconSize: [38, 38],
    iconAnchor: [19, 19]
});

// Custom Server Icon
const createServerIcon = () => L.divIcon({
    html: `
        <div class="server-marker" style="width: 52px; height: 52px; background: rgba(34, 197, 94, 0.15); border: 2px solid #22c55e; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 20px rgba(34, 197, 94, 0.4); animation: pulse-green 3s infinite;">
            <img src="/server.png" style="width: 32px; height: 32px; object-fit: contain;" />
        </div>`,
    className: '',
    iconSize: [52, 52],
    iconAnchor: [26, 26]
});

const hackerIcon = createHackerIcon();
const userIcon = createUserIcon();
const serverIcon = createServerIcon();

interface ThreatMapProps {
    stats: {
        byCountry: Array<{ country: string | null; count: number }>;
        recent: Array<{ target: string; country?: string | null; lat?: number; lon?: number; createdAt: string; type: string; reason?: string; success?: boolean }>;
        total: number;
        active: number;
        serverGeo?: {
            country: string;
            lat: number;
            lon: number;
            ip: string;
        } | null;
    };
    handleAction?: (type: 'whitelist' | 'block' | 'geoblock', data: any) => void;
}

const COUNTRY_COORDINATES: Record<string, [number, number]> = {
    "Afghanistan": [33.9391, 67.7100], "Albania": [41.1533, 20.1683], "Algeria": [28.0339, 1.6596], "Andorra": [42.5462, 1.6016], "Angola": [-11.2027, 17.8739],
    "Argentina": [-38.4161, -63.6167], "Australia": [-25.2744, 133.7751], "Austria": [47.5162, 14.5501], "Brazil": [-14.2350, -51.9253], "Canada": [56.1304, -106.3468],
    "China": [35.8617, 104.1954], "Egypt": [26.8206, 30.8025], "France": [46.2276, 2.2137], "Germany": [51.1657, 10.4515], "India": [20.5937, 78.9629],
    "Indonesia": [-0.7893, 113.9213], "Iran": [32.4279, 53.6880], "Iraq": [33.2232, 43.6793], "Italy": [41.8719, 12.5674],
    "Japan": [36.2048, 138.2529], "Mexico": [23.6345, -102.5528], "Netherlands": [52.1326, 5.2913], "Nigeria": [9.0820, 8.6753], "Pakistan": [30.3753, 69.3451],
    "Philippines": [12.8797, 121.7740], "Poland": [51.9194, 19.1451], "Russia": [61.5240, 105.3188], "Saudi Arabia": [23.8859, 45.0792], "Singapore": [1.3521, 103.8198],
    "South Africa": [-30.5595, 22.9375], "South Korea": [35.9078, 127.7669], "Spain": [40.4637, -3.7492], "Switzerland": [46.8182, 8.2275], "Taiwan": [23.6978, 120.9605],
    "Thailand": [15.8700, 100.9925], "Turkey": [38.9637, 35.2433], "Ukraine": [48.3794, 31.1656], "United Arab Emirates": [23.4241, 53.8478],
    "United Kingdom": [55.3781, -3.4360], "United States": [37.0902, -95.7129], "Vietnam": [14.0583, 108.2772],
    "Local": [-0.7893, 113.9213], "Neutral Zone": [-0.7893, 113.9213], "Unknown": [-0.7893, 113.9213]
};

const COUNTRY_CODES: Record<string, string> = {
    "Afghanistan": "af", "Albania": "al", "Algeria": "dz", "Andorra": "ad", "Angola": "ao", "Argentina": "ar", "Australia": "au", "Austria": "at",
    "Brazil": "br", "Canada": "ca", "China": "cn", "Egypt": "eg", "France": "fr", "Germany": "de", "India": "in", "Indonesia": "id", "Iran": "ir", "Iraq": "iq", "Italy": "it",
    "Japan": "jp", "Mexico": "mx", "Netherlands": "nl", "Nigeria": "ng", "Pakistan": "pk", "Philippines": "ph", "Poland": "pl", "Russia": "ru",
    "Saudi Arabia": "sa", "Singapore": "sg", "South Africa": "za", "South Korea": "kr", "Spain": "es", "Switzerland": "ch", "Taiwan": "tw",
    "Thailand": "th", "Turkey": "tr", "Ukraine": "ua", "United Arab Emirates": "ae", "United Kingdom": "gb", "United States": "us", "Vietnam": "vn",
    "Local": "id", "Neutral Zone": "id", "Unknown": "id"
};

const getFlagUrl = (countryName: string | null | undefined) => {
    if (!countryName) return null;
    let code = COUNTRY_CODES[countryName];
    if (!code) {
        const key = Object.keys(COUNTRY_CODES).find(k => countryName.includes(k));
        if (key) code = COUNTRY_CODES[key];
    }
    return code ? `https://flagcdn.com/w80/${code.toLowerCase()}.png` : null;
}

const getCoordinates = (countryName: string | null | undefined, lat?: number, lon?: number): [number, number] | null => {
    if (typeof lat === 'number' && typeof lon === 'number' && !isNaN(lat) && !isNaN(lon)) {
        if (lat !== 0 || lon !== 0) return [lat, lon];
    }
    if (!countryName) return null;
    let coords = COUNTRY_COORDINATES[countryName];
    if (!coords) {
        const key = Object.keys(COUNTRY_COORDINATES).find(k => countryName.includes(k));
        if (key) coords = COUNTRY_COORDINATES[key];
    }
    return coords || null;
};

// Component to handle map view reset
const MapController = ({ center, zoom }: { center: [number, number], zoom: number }) => {
    const map = useMap();
    useEffect(() => {
        map.setView(center, zoom);
    }, [center, zoom, map]);
    return null;
};

const calculateDistance = (p1: [number, number], p2: [number, number]) => {
    return Math.sqrt(Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2));
};

const MovingMissile = ({
    from, to, color, iconType = 'missile', speed = 1, loop = false
}: {
    from: [number, number], to: [number, number], color: string, iconType?: 'missile' | 'document', speed?: number, loop?: boolean
}) => {
    const [pos, setPos] = useState<[number, number]>(from);
    const [isExploded, setIsExploded] = useState(false);
    const [key, setKey] = useState(0);

    const duration = useMemo(() => {
        const dist = calculateDistance(from, to);
        return Math.max(1500, (dist * 70) / speed);
    }, [from, to, speed]);

    useEffect(() => {
        let frame: number;
        let startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const lat = from[0] + (to[0] - from[0]) * progress;
            const lon = from[1] + (to[1] - from[1]) * progress;

            if (progress < 1) {
                setPos([lat, lon]);
                frame = requestAnimationFrame(animate);
            } else {
                setPos(to);
                if (iconType === 'missile') {
                    setIsExploded(true);
                }

                if (loop) {
                    setTimeout(() => {
                        setIsExploded(false);
                        setPos(from);
                        setKey(prev => prev + 1);
                    }, iconType === 'missile' ? 3000 : 500);
                }
            }
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [from, to, duration, loop, key, iconType]);

    const angle = useMemo(() => {
        const dy = to[0] - from[0];
        const dx = to[1] - from[1];
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }, [from, to]);

    const missileIcon = useMemo(() => L.divIcon({
        html: `
            <div style="transform: rotate(${90 - angle}deg); filter: drop-shadow(0 0 8px ${color});">
                <img src="${iconType === 'missile' ? '/rudal.png' : '/document.png'}" style="width: 24px; height: 24px; object-fit: contain;" />
            </div>
        `,
        className: '',
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    }), [angle, color, iconType]);

    const explosionIcon = useMemo(() => L.divIcon({
        html: `
            <div class="explosion-container" style="width: 50px; height: 50px; display: flex; align-items: center; justify-content: center; animation: fade-out 1s forwards;">
                <img src="/mushroom.png" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 10px #ff4d00);" />
            </div>
        `,
        className: '',
        iconSize: [50, 50],
        iconAnchor: [25, 25]
    }), []);

    return <Marker position={isExploded ? to : pos} icon={isExploded ? explosionIcon : missileIcon} interactive={false} />;
};

const ClashingMissiles = ({
    from, to, color, speed = 1, loop = false
}: {
    from: [number, number], to: [number, number], color: string, speed?: number, loop?: boolean
}) => {
    const midPoint: [number, number] = useMemo(() => [
        (from[0] + to[0]) / 2,
        (from[1] + to[1]) / 2
    ], [from, to]);

    const [pos1, setPos1] = useState<[number, number]>(from);
    const [pos2, setPos2] = useState<[number, number]>(to);
    const [isExploded, setIsExploded] = useState(false);
    const [key, setKey] = useState(0);

    const duration = useMemo(() => {
        const dist = calculateDistance(from, midPoint);
        return Math.max(1000, (dist * 70) / speed);
    }, [from, midPoint, speed]);

    useEffect(() => {
        let frame: number;
        let startTime = Date.now();

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / duration, 1);

            const lat1 = from[0] + (midPoint[0] - from[0]) * progress;
            const lon1 = from[1] + (midPoint[1] - from[1]) * progress;
            const lat2 = to[0] + (midPoint[0] - to[0]) * progress;
            const lon2 = to[1] + (midPoint[1] - to[1]) * progress;

            if (progress < 1) {
                setPos1([lat1, lon1]);
                setPos2([lat2, lon2]);
                frame = requestAnimationFrame(animate);
            } else {
                setPos1(midPoint);
                setPos2(midPoint);
                setIsExploded(true);

                if (loop) {
                    setTimeout(() => {
                        setIsExploded(false);
                        setPos1(from);
                        setPos2(to);
                        setKey(prev => prev + 1);
                    }, 3000);
                }
            }
        };

        frame = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(frame);
    }, [from, to, midPoint, duration, loop, key]);

    const angle1 = useMemo(() => {
        const dy = midPoint[0] - from[0];
        const dx = midPoint[1] - from[1];
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }, [from, midPoint]);

    const angle2 = useMemo(() => {
        const dy = midPoint[0] - to[0];
        const dx = midPoint[1] - to[1];
        return Math.atan2(dy, dx) * (180 / Math.PI);
    }, [to, midPoint]);

    const missileIcon1 = useMemo(() => L.divIcon({
        html: `<div style="transform: rotate(${90 - angle1}deg); filter: drop-shadow(0 0 8px ${color}); transition: all 0.1s;"><img src="/rudal.png" style="width: 24px; height: 24px; object-fit: contain;" /></div>`,
        className: '', iconSize: [24, 24], iconAnchor: [12, 12]
    }), [angle1, color]);

    const missileIcon2 = useMemo(() => L.divIcon({
        html: `<div style="transform: rotate(${90 - angle2}deg); filter: drop-shadow(0 0 8px #22c55e); transition: all 0.1s;"><img src="/rudal.png" style="width: 24px; height: 24px; object-fit: contain;" /></div>`,
        className: '', iconSize: [24, 24], iconAnchor: [12, 12]
    }), [angle2]);

    const explosionIcon = useMemo(() => L.divIcon({
        html: `<div class="explosion-container" style="width: 60px; height: 60px; display: flex; align-items: center; justify-content: center; animation: fade-out 1s forwards;"><img src="/mushroom.png" style="width: 100%; height: 100%; object-fit: contain; filter: drop-shadow(0 0 15px #ff4d00);" /></div>`,
        className: '', iconSize: [60, 60], iconAnchor: [30, 30]
    }), []);

    return (
        <>
            {!isExploded && <Marker position={pos1} icon={missileIcon1} interactive={false} />}
            {!isExploded && <Marker position={pos2} icon={missileIcon2} interactive={false} />}
            {isExploded && <Marker position={midPoint} icon={explosionIcon} interactive={false} />}
        </>
    );
};

const ThreatMap: React.FC<ThreatMapProps> = ({ stats, handleAction }) => {
    const [attacks, setAttacks] = useState<any[]>([]);
    const [selectedIP, setSelectedIP] = useState<string | null>(null);
    const [ipDetails, setIpDetails] = useState<any>(null);
    const [reputation, setReputation] = useState<any>(null);
    const [fullAbuseDetails, setFullAbuseDetails] = useState<any>(null);
    const [showAbuseReport, setShowAbuseReport] = useState(false);
    const [isLoadingDetails, setIsLoadingDetails] = useState(false);
    const [isLoadingFullReport, setIsLoadingFullReport] = useState(false);
    const [ipActivity, setIpActivity] = useState<any>(null);

    const [mapMode, setMapMode] = useState<'realtime' | 'archive'>('realtime');
    const [advancedStats, setAdvancedStats] = useState<any>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [showStats, setShowStats] = useState(false);
    const [isReporting, setIsReporting] = useState(false);
    const [reportStatus, setReportStatus] = useState<{ type: 'success' | 'error', msg: string } | null>(null);

    const [mapCenter] = useState<[number, number]>([-0.7893, 113.9213]); // Indonesia
    const [zoom] = useState(3);

    const audioContextRef = useRef<AudioContext | null>(null);

    const playAlertSound = (isAttack: boolean) => {
        if (isMuted) return;
        try {
            if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            const ctx = audioContextRef.current;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(isAttack ? 440 : 880, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(110, ctx.currentTime + 0.1);
            gain.gain.setValueAtTime(0.05, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
            osc.connect(gain); gain.connect(ctx.destination);
            osc.start(); osc.stop(ctx.currentTime + 0.1);
        } catch (e) { }
    };

    const serverCoords = useMemo((): [number, number] => {
        if (stats.serverGeo &&
            typeof stats.serverGeo.lat === 'number' &&
            typeof stats.serverGeo.lon === 'number' &&
            !isNaN(stats.serverGeo.lat) &&
            !isNaN(stats.serverGeo.lon) &&
            (stats.serverGeo.lat !== 0 || stats.serverGeo.lon !== 0)) {
            return [stats.serverGeo.lat, stats.serverGeo.lon];
        }
        return [-6.2, 106.8]; // Default Jakarta fallback
    }, [stats.serverGeo]);

    const lastProcessedId = useRef<number>(0);
    const isFetchingRef = useRef<boolean>(false);

    const fetchAdvancedData = async (isInitial = false) => {
        if (isFetchingRef.current) return;
        isFetchingRef.current = true;
        try {
            const res = await axios.get(`/api/security/advanced-stats?mode=${(mapMode === 'archive' && isInitial) ? 'archive' : 'realtime'}`);
            setAdvancedStats((prev: any) => {
                if (mapMode === 'archive' && !isInitial) return { ...res.data, archive: prev?.archive || [] };
                return res.data;
            });

            if (res.data.history) {
                const history = res.data.history;
                // Capture more history on first load for a lively map
                let newEvents = lastProcessedId.current === 0 ? history.slice(-15) : history.filter((h: any) => h.id > lastProcessedId.current);

                if (newEvents.length > 0) {
                    newEvents.forEach((event: any, index: number) => {
                        setTimeout(() => {
                            const coords = getCoordinates(event.country, event.lat, event.lon);
                            if (coords) {
                                const animId = `anim-rt-${event.id}-${Date.now()}`;
                                setAttacks(prev => [...prev, {
                                    id: animId,
                                    originalId: event.id,
                                    coords,
                                    ip: event.ip || event.target,
                                    ...event
                                }]);
                                playAlertSound(!event.success);
                                // Increase timeout to 30s to allow for very long distance travel + explosion + loop
                                setTimeout(() => setAttacks(prev => prev.filter(a => a.id !== animId)), 30000);
                            }
                        }, index * 400); // Slightly more staggered for clarity
                    });
                    lastProcessedId.current = Math.max(...history.map((h: any) => h.id));
                }
            }

            // Playback archive data when switching to Archive Mode
            if (isInitial && mapMode === 'archive' && res.data.archive && res.data.archive.length > 0) {
                const playbackItems = res.data.archive.slice(0, 30); // Play top 30 archived threats
                playbackItems.forEach((event: any, index: number) => {
                    setTimeout(() => {
                        const coords = getCoordinates(event.country, event.lat, event.lon);
                        if (coords) {
                            const animId = `anim-archive-${event.id}-${Date.now()}`;
                            setAttacks(prev => [...prev, {
                                id: animId,
                                coords,
                                ip: event.ip || event.target,
                                success: false, // Archive items are blocked attacks
                                ...event
                            }]);
                        }
                    }, index * 150); // Staggered entry
                });
            }
        } catch (err) { } finally { isFetchingRef.current = false; }
    };

    useEffect(() => {
        // Clear old animations and reset tracking when switching modes
        setAttacks([]);
        lastProcessedId.current = 0;

        fetchAdvancedData(true);
        const interval = setInterval(() => fetchAdvancedData(false), 5000);
        return () => clearInterval(interval);
    }, [mapMode]);

    const handleLookup = async (ip: string) => {
        setSelectedIP(ip); setIsLoadingDetails(true);
        setShowAbuseReport(false);
        setIpActivity(null);
        try {
            const [geo, rep, act] = await Promise.all([
                axios.get(`/api/firewall/lookup?ip=${ip}`),
                axios.get(`/api/reputation/${ip}`),
                axios.get(`/api/analytics/ip-details/${ip}`)
            ]);
            setIpDetails(geo.data);
            setReputation(rep.data);
            setIpActivity(act.data);
        } catch (err) { } finally { setIsLoadingDetails(false); }
    };

    const handleFullAbuseReport = async (ip: string) => {
        setIsLoadingFullReport(true);
        setShowAbuseReport(true);
        setReportStatus(null);
        try {
            const res = await axios.get(`/api/security/ip-details?ip=${ip}`);
            setFullAbuseDetails(res.data);
        } catch (err) {
            console.error('Failed to fetch full abuse report', err);
        } finally {
            setIsLoadingFullReport(false);
        }
    };

    const handleReportIP = async (ip: string) => {
        if (!window.confirm(`Report specialized threat intelligence for IP ${ip} to AbuseIPDB?`)) return;

        setIsReporting(true);
        setReportStatus(null);
        try {
            await axios.post('/api/reputation/report', {
                ip,
                categories: [18, 21], // SSH Brute Force & Web Spam
                comment: 'Automated threat detection: Malicious activity identified via Cloud Security Suite.'
            });
            setReportStatus({ type: 'success', msg: 'INTEL SUBMITTED SUCCESSFULLY' });
            setTimeout(() => setReportStatus(null), 5000);
        } catch (err: any) {
            const errorMsg = err.response?.data?.error || 'REPORT SUBMISSION FAILED';
            setReportStatus({ type: 'error', msg: errorMsg });
        } finally {
            setIsReporting(false);
        }
    };

    const executeAction = async (type: 'whitelist' | 'block' | 'geoblock', data: any) => {
        try {
            if (type === 'whitelist') await axios.post('/api/whitelist', { ip: data.ip, description: 'Via Map' });
            else if (type === 'block') await axios.post('/api/firewall', { type: 'ip', target: data.ip, reason: 'Via Map' });
            else if (type === 'geoblock') await axios.post('/api/geoblock', { country_code: data.countryCode, country_name: data.country });
            alert('Action Executed Successfully');
        } catch (e) { alert('Action Failed'); }
    };

    const isSystemUnderAttack = useMemo(() => {
        // Truly real-time: System is under attack only if failed attempt animations are currently active on the map
        // This clears the status as soon as the attack animations finish/timeout
        return attacks.some(a => !a.success);
    }, [attacks]);

    return (
        <div className="flex flex-col h-full bg-[#050810] text-cyan-500 rounded-[32px] overflow-hidden font-mono border border-cyan-500/30 shadow-[0_0_60px_rgba(6,182,212,0.1)] relative">
            {/* Top Bar Stats */}
            <div className="flex border-b border-cyan-500/20 bg-black/60 shrink-0 select-none">
                <div className="flex-1 grid grid-cols-4">
                    <div
                        className="p-4 border-r border-cyan-500/20 text-center bg-gradient-to-b from-red-500/5 to-transparent cursor-pointer hover:bg-white/5 transition-all group"
                        onClick={() => setShowStats(true)}
                        title="Click to view detailed attack logs"
                    >
                        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-800 font-black mb-1 group-hover:text-cyan-400 transition-colors">Defense Status</p>
                        <p className={`text-2xl font-black ${isSystemUnderAttack ? 'text-red-500 animate-pulse' : 'text-green-500'} tracking-tighter`}>
                            {isSystemUnderAttack ? 'UNDER ATTACK' : 'ALL CLEAR'}
                        </p>
                    </div>
                    <div className="p-4 border-r border-cyan-500/20 text-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-800 font-black mb-1">Active Blocks</p>
                        <p className="text-2xl font-black text-white">{stats.active}</p>
                    </div>
                    <div className="p-4 border-r border-cyan-500/20 text-center">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-800 font-black mb-1">Total Threats</p>
                        <p className="text-2xl font-black text-white">{stats.total}</p>
                    </div>
                    <div className="p-4 text-center bg-gradient-to-b from-indigo-500/5 to-transparent">
                        <p className="text-[10px] uppercase tracking-[0.2em] text-cyan-800 font-black mb-1">Top Region</p>
                        <div className="flex items-center justify-center gap-2">
                            {getFlagUrl(stats.byCountry[0]?.country) && <img src={getFlagUrl(stats.byCountry[0]?.country)!} className="w-5 h-3.5 object-cover rounded-sm border border-white/10" />}
                            <p className="text-xl font-black text-yellow-500 uppercase truncate max-w-[100px]">{stats.byCountry[0]?.country || 'NONE'}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="flex flex-1 overflow-hidden">
                <div className="flex-1 relative overflow-hidden bg-[#0A0F1D]">
                    <MapContainer
                        center={mapCenter}
                        zoom={zoom}
                        style={{ height: '100%', width: '100%', background: '#050810' }}
                        zoomControl={false}
                        attributionControl={false}
                    >
                        {/* Dark Matter Tiles for Cyber Feel */}
                        <TileLayer
                            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
                            subdomains="abcd"
                        />

                        {/* Animation Layer - Always Active */}
                        {attacks.filter(a => a.coords && Array.isArray(a.coords) && a.coords.length === 2 && !isNaN(a.coords[0]) && !isNaN(a.coords[1])).map(a => (
                            <React.Fragment key={a.id}>
                                {a.success ? (
                                    /* Bidirectional Document Transfer for Authorized Access - ONLY in Real-time Mode */
                                    mapMode === 'realtime' && (
                                        <>
                                            <MovingMissile
                                                from={a.coords}
                                                to={serverCoords}
                                                color="#06b6d4"
                                                iconType="document"
                                                speed={1.2}
                                                loop={true}
                                            />
                                            <MovingMissile
                                                from={serverCoords}
                                                to={a.coords}
                                                color="#06b6d4"
                                                iconType="document"
                                                speed={1.2}
                                                loop={true}
                                            />
                                        </>
                                    )
                                ) : (
                                    /* Clashing Missiles for Archive mode, Single for Real-time */
                                    mapMode === 'archive' ? (
                                        <ClashingMissiles
                                            from={a.coords}
                                            to={serverCoords}
                                            color="#ef4444"
                                            speed={1.2}
                                            loop={true}
                                        />
                                    ) : (
                                        <MovingMissile
                                            from={a.coords}
                                            to={serverCoords}
                                            color="#ef4444"
                                            iconType="missile"
                                            speed={1.5}
                                            loop={true}
                                        />
                                    )
                                )}
                                {mapMode === 'realtime' && (
                                    <Marker
                                        position={a.coords}
                                        icon={a.success ? userIcon : hackerIcon}
                                        eventHandlers={{
                                            click: () => handleLookup(a.ip || a.target),
                                            contextmenu: (e: any) => {
                                                L.DomEvent.stopPropagation(e);
                                                handleLookup(a.ip || a.target);
                                            }
                                        }}
                                    >
                                        <Popup className="cyber-popup">
                                            <div className="p-2 font-mono">
                                                <p className={`text-xs font-black ${a.success ? 'text-cyan-400' : 'text-red-400'} mb-1`}>{a.ip || a.target}</p>
                                                <p className="text-[8px] text-white/60 mb-2">{a.country} • {a.username}</p>
                                                <button onClick={() => handleLookup(a.ip || a.target)} className="text-[8px] text-white bg-cyan-500/20 px-2 py-1 rounded">ANALYZE</button>
                                            </div>
                                        </Popup>
                                    </Marker>
                                )}
                            </React.Fragment>
                        ))}

                        {/* Archive Static Markers */}
                        {mapMode === 'archive' && (advancedStats?.archive || []).slice(0, 100).map((h: any, idx: number) => {
                            const coords = getCoordinates(h.country, h.lat, h.lon);
                            if (!coords) return null;
                            return (
                                <Marker
                                    key={`archive-${h.id}-${idx}`}
                                    position={coords}
                                    icon={hackerIcon}
                                    eventHandlers={{
                                        click: () => handleLookup(h.ip || h.target || h.username),
                                        contextmenu: (e: any) => {
                                            L.DomEvent.stopPropagation(e);
                                            handleLookup(h.ip || h.target || h.username);
                                        }
                                    }}
                                >
                                    <Popup className="cyber-popup">
                                        <div className="p-2 font-mono">
                                            <p className="text-xs font-black text-red-400 mb-1">{h.ip || h.target || 'N/A'}</p>
                                            <p className="text-[8px] text-white/60">{h.country} • {h.reason}</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            );
                        })}

                        {/* Master Server Node */}
                        <Marker position={serverCoords} icon={serverIcon}>
                            <Popup className="cyber-popup">
                                <div className="p-2 font-mono text-center">
                                    <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Master Secure Node</p>
                                    <p className="text-xs font-bold text-white mt-1">{stats.serverGeo?.ip}</p>
                                </div>
                            </Popup>
                        </Marker>

                    </MapContainer>

                    {/* Hud Overlays */}
                    <div className="absolute top-6 left-6 flex bg-black/80 backdrop-blur-xl border border-cyan-500/20 p-1.5 rounded-2xl shadow-2xl z-[1000] pointer-events-auto">
                        <button onClick={() => setMapMode('realtime')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mapMode === 'realtime' ? 'bg-cyan-500 text-black shadow-[0_0_15px_rgba(6,182,212,0.5)]' : 'text-cyan-500 hover:bg-cyan-500/10'}`}>
                            ⚡ Real-time
                        </button>
                        <button onClick={() => setMapMode('archive')} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${mapMode === 'archive' ? 'bg-red-500 text-black shadow-[0_0_15px_rgba(239,68,68,0.5)]' : 'text-red-500 hover:bg-red-500/10'}`}>
                            💀 All Attackers
                        </button>
                    </div>

                    <div className="absolute top-6 right-6 flex flex-col gap-2 z-[1000]">
                        <button onClick={() => setShowStats(!showStats)} className="p-2.5 rounded-xl bg-black/60 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all backdrop-blur-md" title="Show Analytics"><BarChart3 size={20} /></button>
                        <button onClick={() => setIsMuted(!isMuted)} className="p-2.5 rounded-xl bg-black/60 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all backdrop-blur-md" title="Mute/Unmute">{isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}</button>
                    </div>
                </div>

                <div className="w-80 border-l border-cyan-500/10 bg-black/40 flex flex-col shrink-0 backdrop-blur-xl">
                    <div className="p-6 border-b border-cyan-500/10">
                        <h3 className="text-xs font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                            <Activity size={14} className="text-red-500 animate-pulse" /> Threat Protocol
                        </h3>
                    </div>

                    <div className="flex-1 overflow-y-auto no-scrollbar p-5 space-y-4">
                        {stats.serverGeo && (
                            <div className="bg-green-500/5 p-4 rounded-2xl border border-green-500/20 group/server cursor-pointer" onClick={() => handleLookup(stats.serverGeo?.ip || '')}>
                                <div className="flex justify-between items-start mb-3">
                                    <span className="text-[9px] font-black bg-green-500/20 text-green-500 px-2 py-0.5 rounded border border-green-500/30">MASTER NODE</span>
                                    {getFlagUrl(stats.serverGeo.country) && <img src={getFlagUrl(stats.serverGeo.country)!} className="w-5 h-3 rounded shadow" />}
                                </div>
                                <p className="text-sm font-black text-white font-mono">{stats.serverGeo.ip}</p>
                                <p className="text-[10px] text-green-500/40 font-bold uppercase mt-1">{stats.serverGeo.country}</p>
                            </div>
                        )}

                        <div className="space-y-2">
                            {(mapMode === 'realtime' ? (advancedStats?.history || []).slice(-30).reverse() : (advancedStats?.archive || [])).map((log: any, i: number) => {
                                const isAttack = !log.success;
                                return (
                                    <div key={`${mapMode}-${log.id}-${i}`} className={`group p-3 rounded-xl border transition-all cursor-pointer animate-in slide-in-from-right fade-in ${isAttack ? 'bg-red-500/5 border-red-500/10 hover:bg-red-500/10' : 'bg-cyan-500/5 border-cyan-500/10 hover:bg-cyan-500/10'}`} onClick={() => handleLookup(log.ip || log.target)}>
                                        <div className="flex justify-between items-center mb-1.5">
                                            <div className="flex items-center gap-1.5">
                                                {isAttack ? <Skull size={10} className="text-red-500" /> : <User size={10} className="text-cyan-400" />}
                                                <span className={`text-[8px] font-black uppercase tracking-widest ${isAttack ? 'text-red-500' : 'text-cyan-400'}`}>
                                                    {mapMode === 'realtime' ? (isAttack ? 'Intrusion' : 'Authorized') : 'BLACKLISTED'}
                                                </span>
                                            </div>
                                            <span className="text-[8px] text-white/20 font-bold">
                                                {mapMode === 'realtime' ? 'LIVE' : 'PERMANENT'}
                                            </span>
                                        </div>
                                        <p className="text-xs font-black text-white font-mono truncate">{log.ip || log.target || log.username}</p>
                                        <div className="flex items-center gap-2 mt-2">
                                            {getFlagUrl(log.country) && <img src={getFlagUrl(log.country)!} className="w-3.5 h-2 rounded-xs opacity-60" />}
                                            <span className="text-[8px] font-bold text-white/30 uppercase truncate">{log.country || 'Neutral Zone'}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>


                    </div>
                </div>
            </div>


            {/* Statistics Overlay */}
            {showStats && advancedStats && (
                <div className="absolute inset-0 z-[1500] bg-[#050810]/95 backdrop-blur-3xl p-10 overflow-y-auto animate-in fade-in zoom-in duration-300">
                    <div className="flex justify-between items-center mb-10 pb-6 border-b border-cyan-500/10">
                        <div>
                            <h3 className="text-2xl font-black text-white tracking-widest flex items-center gap-3">
                                <TrendingUp className="text-cyan-500" /> THREAT ANALYTICS
                            </h3>
                        </div>
                        <button onClick={() => setShowStats(false)} className="p-3 bg-white/5 hover:bg-white/10 rounded-full transition-all border border-white/10 text-white"><X /></button>
                    </div>
                    <div className="space-y-10">
                        <div className="bg-black/40 border border-white/5 p-8 rounded-[32px] shadow-2xl">
                            <h4 className="text-xs font-black text-white/30 uppercase tracking-[0.3em] mb-8">Comprehensive Event Logs (firewall & login_attempts) - Latest 100</h4>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-white/10">
                                            <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Timestamp</th>
                                            <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Source IP</th>
                                            <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Country</th>
                                            <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Identity / Reason</th>
                                            <th className="py-4 text-[10px] font-black text-white/40 uppercase tracking-widest">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-white/5">
                                        {[...(advancedStats.history || []), ...(advancedStats.archive || [])]
                                            .sort((a, b) => new Date(b.attempted_at).getTime() - new Date(a.attempted_at).getTime())
                                            .slice(0, 100)
                                            .map((log, idx) => (
                                                <tr key={`full-log-${idx}`} className="hover:bg-white/5 transition-colors group cursor-pointer" onClick={() => handleLookup(log.ip || log.target)}>
                                                    <td className="py-4 text-[11px] font-bold text-white/60 font-mono">
                                                        {new Date(log.attempted_at).toLocaleString()}
                                                    </td>
                                                    <td className="py-4 text-xs font-black text-cyan-400 font-mono group-hover:text-white">
                                                        {log.ip || log.target || 'N/A'}
                                                    </td>
                                                    <td className="py-4">
                                                        <div className="flex items-center gap-2">
                                                            {getFlagUrl(log.country) && <img src={getFlagUrl(log.country)!} className="w-4 h-2.5 rounded-sm opacity-60" />}
                                                            <span className="text-[10px] font-black text-white/40 uppercase">{log.country || 'Unknown'}</span>
                                                        </div>
                                                    </td>
                                                    <td className="py-4 text-[10px] font-black text-white">
                                                        <span className="opacity-40">{log.username || log.reason || 'ANONYMOUS'}</span>
                                                    </td>
                                                    <td className="py-4">
                                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black tracking-widest uppercase border ${!log.success ? 'bg-red-500/10 border-red-500/30 text-red-500' : 'bg-green-500/10 border-green-500/30 text-green-500'}`}>
                                                            {!log.success ? 'BLOCKED' : 'AUTHORIZED'}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* IP Intelligence Modal - Centered Style */}
            {selectedIP && (
                <div className="fixed inset-0 z-[9999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                    <div className="bg-black/60 backdrop-blur-2xl border border-cyan-500/40 rounded-[24px] w-full max-w-md shadow-[0_0_80px_rgba(6,182,212,0.4)] overflow-hidden animate-in zoom-in-95 duration-200">
                        <div className="p-3 border-b border-cyan-500/10 flex justify-between items-center bg-cyan-500/10">
                            <h3 className="text-[10px] font-black text-cyan-400 flex items-center gap-1.5 tracking-[0.1em]"><Crosshair size={14} /> TARGET INTEL</h3>
                            <button onClick={() => setSelectedIP(null)} className="p-1 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"><X size={14} /></button>
                        </div>
                        <div className="p-4">
                            {isLoadingDetails ? (
                                <div className="py-20 flex flex-col items-center">
                                    <Activity className="animate-spin text-cyan-500 mb-4" size={40} />
                                    <p className="text-sm tracking-[0.3em] font-black animate-pulse uppercase">Establishing Uplink...</p>
                                </div>
                            ) : ipDetails ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="text-base font-black text-white tracking-tighter">{selectedIP}</div>
                                        <div
                                            onClick={() => handleFullAbuseReport(selectedIP)}
                                            className={`px-2 py-0.5 rounded-full text-[7px] font-black border uppercase cursor-pointer hover:scale-110 transition-transform ${reputation?.abuseScore > 50 ? 'bg-red-500/10 border-red-500/40 text-red-500 shadow-[0_0_10px_rgba(239,68,68,0.2)]' : 'bg-green-500/10 border-green-500/40 text-green-500'}`}
                                            title="Click for full reputation report"
                                        >
                                            {reputation?.abuseScore || 0}%
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            ['ISP', ipDetails.isp], ['LOC', `${ipDetails.city}, ${ipDetails.countryCode}`],
                                            ['COOR', `${ipDetails.lat}, ${ipDetails.lon}`], ['AS', ipDetails.as]
                                        ].map(([label, val]) => (
                                            <div key={label} className="bg-cyan-500/5 backdrop-blur-md p-2 rounded-xl border border-cyan-500/10">
                                                <p className="text-[7px] font-black text-white/20 uppercase mb-0.5 tracking-widest">{label}</p>
                                                <p className="text-[9px] font-bold text-cyan-400 truncate">{val || 'N/A'}</p>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Detailed Activity Feed */}
                                    <div className="mt-4 bg-black/40 rounded-xl border border-white/5 p-3">
                                        <h4 className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                            <Activity size={10} className="text-cyan-500" /> Recent Activity History
                                        </h4>
                                        <div className="space-y-2 max-h-[120px] overflow-y-auto no-scrollbar">
                                            {ipActivity?.recentActivity && ipActivity.recentActivity.length > 0 ? (
                                                ipActivity.recentActivity.slice(0, 5).map((act: any, idx: number) => {
                                                    const isSecurity = act.action === 'SECURITY_ALERT' || act.action === 'FIREWALL_BLOCK';
                                                    return (
                                                        <div key={idx} className={`border-l-2 ${isSecurity ? 'border-red-500/50 bg-red-500/5' : 'border-cyan-500/30'} pl-2 py-1 transition-colors`}>
                                                            <div className="flex justify-between items-center mb-0.5">
                                                                <span className={`text-[8px] font-black ${isSecurity ? 'text-red-400' : 'text-cyan-400'} uppercase`}>{act.action.replace('_', ' ')}</span>
                                                                <span className="text-[7px] text-white/20">{new Date(act.createdAt).toLocaleTimeString()}</span>
                                                            </div>
                                                            <p className={`text-[9px] ${isSecurity ? 'text-red-200/70' : 'text-white/60'} line-clamp-1`}>{act.description}</p>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <p className="text-[8px] text-white/20 uppercase text-center py-4 italic">No direct path logs found</p>
                                            )}
                                        </div>
                                    </div>
                                    <div className="pt-4 grid grid-cols-3 gap-2">
                                        <button onClick={() => { executeAction('whitelist', { ip: selectedIP }); handleAction?.('whitelist', { ip: selectedIP }); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-green-500/5 border border-green-500/20 hover:bg-green-500/20 text-green-500 transition-all text-[7px] font-black uppercase"><ShieldCheck size={14} /> WHITE</button>
                                        <button onClick={() => { executeAction('block', { ip: selectedIP }); handleAction?.('block', { ip: selectedIP }); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-orange-500/5 border border-orange-500/20 hover:bg-orange-500/20 text-orange-500 transition-all text-[7px] font-black uppercase"><ShieldX size={14} /> BLOCK</button>
                                        <button onClick={() => { executeAction('geoblock', { country: ipDetails.country, countryCode: ipDetails.countryCode }); handleAction?.('geoblock', { country: ipDetails.country, countryCode: ipDetails.countryCode }); }} className="flex flex-col items-center gap-1 p-2 rounded-xl bg-red-500/5 border border-red-500/20 hover:bg-red-500/20 text-red-500 transition-all text-[7px] font-black uppercase"><Globe size={14} /> BAN</button>
                                    </div>
                                </div>
                            ) : null}
                        </div>
                    </div>
                </div>
            )}

            {/* AbuseIPDB Professional Report Overlay */}
            {showAbuseReport && (
                <div className="fixed inset-0 z-[10000] bg-black/80 backdrop-blur-3xl flex items-center justify-center p-6 animate-in fade-in duration-300">
                    <div className="bg-[#050810] border border-cyan-500/30 rounded-[24px] w-full max-w-xl max-h-[85vh] shadow-[0_0_100px_rgba(6,182,212,0.2)] overflow-hidden flex flex-col">
                        <div className="p-4 border-b border-cyan-500/10 flex justify-between items-center bg-cyan-500/5">
                            <div className="flex items-center gap-2">
                                <div className="p-1.5 bg-red-500/10 rounded-lg border border-red-500/20">
                                    <ShieldAlert className="text-red-500" size={18} />
                                </div>
                                <div>
                                    <h3 className="text-sm font-black text-white tracking-widest uppercase">Abuse Intel</h3>
                                    <p className="text-[8px] text-cyan-500/60 font-bold tracking-[0.2em]">{selectedIP}</p>
                                </div>
                            </div>
                            <button onClick={() => setShowAbuseReport(false)} className="p-1.5 hover:bg-white/10 rounded-full transition-colors text-white/50 hover:text-white"><X size={18} /></button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-4 space-y-4 no-scrollbar">
                            {isLoadingFullReport ? (
                                <div className="py-10 flex flex-col items-center">
                                    <RefreshCw className="animate-spin text-cyan-500 mb-2" size={32} />
                                    <p className="text-[10px] tracking-[0.4em] font-black animate-pulse uppercase text-cyan-500">Decrypting...</p>
                                </div>
                            ) : fullAbuseDetails?.error ? (
                                <div className="py-10 flex flex-col items-center text-center">
                                    <ShieldAlert className="text-red-500 mb-2" size={32} />
                                    <h4 className="text-sm font-black text-white uppercase mb-1">Retrieval Failed</h4>
                                    <p className="text-[10px] text-red-500/80 font-bold max-w-md">{fullAbuseDetails.error}</p>
                                    <button
                                        onClick={() => selectedIP && handleFullAbuseReport(selectedIP)}
                                        className="mt-4 px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-white/10 transition-all"
                                    >
                                        Retry
                                    </button>
                                </div>
                            ) : fullAbuseDetails ? (
                                <>
                                    {/* Score Card */}
                                    <div className="grid grid-cols-3 gap-2">
                                        <div className="bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 p-3 rounded-2xl flex flex-col items-center justify-center text-center">
                                            <p className="text-[7px] font-black text-red-500 uppercase tracking-widest mb-0.5">Score</p>
                                            <p className="text-xl font-black text-white">{fullAbuseDetails.abuseConfidenceScore}%</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center flex flex-col justify-center">
                                            <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-0.5">Reports</p>
                                            <p className="text-xl font-black text-cyan-400">{fullAbuseDetails.totalReports}</p>
                                        </div>
                                        <div className="bg-white/5 border border-white/10 p-3 rounded-2xl text-center flex flex-col justify-center">
                                            <p className="text-[7px] font-black text-white/40 uppercase tracking-widest mb-0.5">Users</p>
                                            <p className="text-xl font-black text-cyan-400">{fullAbuseDetails.numDistinctUsers || 0}</p>
                                        </div>
                                    </div>

                                    {/* Technical Specs & Reports - SIDE BY SIDE */}
                                    <div className="grid grid-cols-2 gap-4 items-start">
                                        <div className="bg-white/5 border border-white/5 p-4 rounded-2xl space-y-3">
                                            <h4 className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Network Fingerprint</h4>
                                            {[
                                                { label: 'ISP', value: fullAbuseDetails.isp },
                                                { label: 'Domain', value: fullAbuseDetails.domain },
                                                { label: 'Usage', value: fullAbuseDetails.usageType },
                                                { label: 'LOC', value: `${fullAbuseDetails.countryName} (${fullAbuseDetails.countryCode})` }
                                            ].map(item => (
                                                <div key={item.label} className="flex justify-between items-center border-b border-white/5 pb-1.5">
                                                    <span className="text-[8px] font-bold text-white/40">{item.label}</span>
                                                    <span className="text-[10px] font-black text-white text-right truncate max-w-[100px]">{item.value || 'N/A'}</span>
                                                </div>
                                            ))}
                                        </div>

                                        <div className="space-y-2">
                                            <h4 className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Incident Logs</h4>
                                            <div className="space-y-2">
                                                {fullAbuseDetails.reports && fullAbuseDetails.reports.length > 0 ? (
                                                    fullAbuseDetails.reports.slice(0, 3).map((report: any, idx: number) => (
                                                        <div key={idx} className="bg-white/5 border border-white/5 p-3 rounded-xl">
                                                            <div className="flex justify-between items-center mb-1">
                                                                <span className="text-[7px] font-black text-cyan-400 uppercase">{new Date(report.reportedAt).toLocaleDateString()}</span>
                                                                <div className="flex gap-1">
                                                                    {report.categories.slice(0, 1).map((cat: number) => (
                                                                        <span key={cat} className="text-[6px] px-1 py-0.2 rounded-full bg-red-500/10 text-red-500 border border-red-500/20 font-black">CAT {cat}</span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                            <p className="text-[9px] text-white/60 leading-tight italic line-clamp-2">"{report.comment || 'No comment'}"</p>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-4 border border-white/5 rounded-xl bg-green-500/5">
                                                        <p className="text-[8px] font-black text-green-500/60 uppercase">No Incident Logs</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-20">
                                    <p className="text-red-500 font-black uppercase">Intel Retrieval Failed</p>
                                </div>
                            )}
                        </div>

                        <div className="p-4 border-t border-cyan-500/10 bg-cyan-500/5 flex justify-between items-center">
                            <div className="flex flex-col">
                                <p className="text-[8px] font-black text-cyan-500/40 uppercase tracking-widest">AbuseIPDB v2</p>
                                {reportStatus && (
                                    <span className={`text-[7px] font-black uppercase mt-1 animate-pulse ${reportStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                                        {reportStatus.msg}
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => selectedIP && handleReportIP(selectedIP)}
                                    disabled={isReporting}
                                    className={`px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${isReporting ? 'bg-red-500/20 text-red-500/50' : 'bg-red-500/10 border border-red-500/30 text-red-500 hover:bg-red-500/20'}`}
                                >
                                    {isReporting ? <RefreshCw size={10} className="animate-spin" /> : <Skull size={10} />}
                                    {isReporting ? 'Reporting...' : 'Report Malicious'}
                                </button>
                                <button onClick={() => setShowAbuseReport(false)} className="px-4 py-1.5 bg-cyan-500 text-black rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-cyan-400 transition-all">Close</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
                .no-scrollbar::-webkit-scrollbar { display: none; }
                @keyframes pulse-red { 0%, 100% { box-shadow: 0 0 10px rgba(239, 68, 68, 0.5); transform: scale(1); } 50% { box-shadow: 0 0 20px rgba(239, 68, 68, 0.8); transform: scale(1.1); } }
                @keyframes pulse-cyan { 0%, 100% { box-shadow: 0 0 10px rgba(6, 182, 212, 0.5); transform: scale(1); } 50% { box-shadow: 0 0 20px rgba(6, 182, 212, 0.8); transform: scale(1.1); } }
                @keyframes fade-out { 0% { opacity: 1; transform: scale(0.5); } 20% { opacity: 1; transform: scale(1.2); } 100% { opacity: 0; transform: scale(1.5); } }
                .leaflet-popup-content-wrapper { background: #0f172a !important; color: #06b6d4 !important; border: 1px solid rgba(6, 182, 212, 0.2); border-radius: 12px; }
                .leaflet-popup-tip { background: #0f172a !important; border: 1px solid rgba(6, 182, 212, 0.2); }
                .cyber-popup table { width: 100%; border-collapse: collapse; }
                .cyber-popup td { padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05); }
            `}</style>
        </div>
    );
};

export default ThreatMap;
