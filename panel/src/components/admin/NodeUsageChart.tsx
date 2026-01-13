import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Loader2 } from 'lucide-react';

interface UsageMetric {
    timestamp: string;
    cpu_load: number;
    ram_used: number;
    net_rx: number;
    net_tx: number;
}

interface NodeUsageChartProps {
    serverId: number;
    userId: number;
}

const NodeUsageChart: React.FC<NodeUsageChartProps> = ({ serverId, userId }) => {
    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchUsage();
    }, [serverId]);

    const fetchUsage = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`/api/analytics/node-usage/${serverId}`, {
                headers: { 'x-user-id': userId },
                params: { period: '24h' }
            });

            console.log('[NodeUsageChart] Raw API response:', res.data);

            if (!res.data || res.data.length === 0) {
                console.warn('[NodeUsageChart] No data received from API');
                setData([]);
                setLoading(false);
                return;
            }

            // Format data for chart - API returns { time, cpu, ram, disk, net_rx, net_tx }
            const formatted = res.data.map((m: any) => {
                const cpuValue = parseFloat(m.cpu) || 0;
                const ramValue = parseFloat(m.ram) || 0;

                return {
                    time: new Date(m.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    cpu: Math.round(cpuValue * 100) / 100,
                    ram: Math.round(ramValue * 100) / 100,
                };
            });

            console.log('[NodeUsageChart] Formatted data:', formatted);
            setData(formatted);
        } catch (err: any) {
            console.error('[NodeUsageChart] Failed to fetch node usage:', err.message);
            if (err.response) {
                console.error('[NodeUsageChart] Response error:', err.response.status, err.response.data);
            }
            setData([]);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="h-40 flex items-center justify-center bg-black/20 rounded-2xl border border-white/5">
                <Loader2 size={24} className="text-indigo-500 animate-spin" />
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="h-40 flex items-center justify-center bg-black/20 rounded-2xl border border-white/5">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">No historical data available</p>
            </div>
        );
    }

    return (
        <div className="h-60 w-full bg-black/20 p-4 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-400">Node Performance (24h)</h4>
                <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                        <span className="text-[9px] font-bold text-white/40 uppercase">CPU %</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                        <div className="w-2 h-2 rounded-full bg-purple-500" />
                        <span className="text-[9px] font-bold text-white/40 uppercase">RAM GB</span>
                    </div>
                </div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <defs>
                        <linearGradient id="colorCpu" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="colorRam" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                            <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
                        </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis
                        dataKey="time"
                        hide
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }}
                    />
                    <YAxis
                        tick={{ fontSize: 9, fill: 'rgba(255,255,255,0.2)' }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: 'rgba(15, 23, 42, 0.9)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '12px',
                            fontSize: '11px',
                            fontWeight: 'bold'
                        }}
                    />
                    <Area type="monotone" dataKey="cpu" stroke="#6366f1" fillOpacity={1} fill="url(#colorCpu)" strokeWidth={2} dot={false} />
                    <Area type="monotone" dataKey="ram" stroke="#a855f7" fillOpacity={1} fill="url(#colorRam)" strokeWidth={2} dot={false} />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    );
};

export default NodeUsageChart;
