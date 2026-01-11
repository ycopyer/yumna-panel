import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Receipt, Package, Zap, Clock, CheckCircle2, AlertCircle, Loader2, ArrowRight, Wallet, Download } from 'lucide-react';

interface Invoice {
    id: number;
    amount: string;
    tax_amount: string;
    total_amount: string;
    status: string;
    type: string;
    createdAt: string;
    paidAt: string | null;
}

interface Product {
    id: number;
    name: string;
    price: string;
    features: any;
}

const BillingManager: React.FC<{ userId: number }> = ({ userId }) => {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'invoices' | 'plans'>('invoices');

    useEffect(() => {
        fetchBillingData();
    }, []);

    const fetchBillingData = async () => {
        setLoading(true);
        try {
            const [invRes, prodRes] = await Promise.all([
                axios.get('/api/billing/invoices', { headers: { 'x-user-id': userId } }),
                axios.get('/api/billing/products')
            ]);
            setInvoices(invRes.data);
            setProducts(prodRes.data);
        } catch (err) {
            console.error('Failed to fetch billing data', err);
        } finally {
            setLoading(false);
        }
    };

    const handlePay = async (invoiceId: number) => {
        if (!confirm('Proceed to payment?')) return;
        try {
            await axios.post(`/api/billing/invoices/${invoiceId}/pay`, {}, { headers: { 'x-user-id': userId } });
            alert('Payment successful!');
            fetchBillingData();
        } catch (err: any) {
            alert(err.response?.data?.error || 'Payment failed');
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center py-40 gap-6 animate-pulse">
                <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center border border-indigo-500/20">
                    <Wallet className="text-indigo-400 animate-bounce" size={32} />
                </div>
                <p className="text-xs font-black text-white/40 uppercase tracking-[0.3em]">Connecting to Billing Engine...</p>
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl text-white shadow-xl shadow-indigo-500/20">
                            <CreditCard size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tight">Billing & Finance</h3>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                Secure Payment Gateway
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10 backdrop-blur-xl">
                    <button
                        onClick={() => setActiveTab('invoices')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'invoices' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Receipt size={16} /> Invoices
                    </button>
                    <button
                        onClick={() => setActiveTab('plans')}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all ${activeTab === 'plans' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'text-white/40 hover:text-white hover:bg-white/5'}`}
                    >
                        <Package size={16} /> Subscription Plans
                    </button>
                </div>
            </div>

            {activeTab === 'invoices' ? (
                <div className="grid gap-4">
                    {invoices.length === 0 ? (
                        <div className="py-32 flex flex-col items-center border border-dashed border-white/10 rounded-[2.5rem] bg-white/[0.01]">
                            <Receipt size={48} className="text-white/10 mb-4" />
                            <p className="text-white/40 font-bold">No invoices found yet.</p>
                        </div>
                    ) : (
                        invoices.map(inv => (
                            <div key={inv.id} className="group bg-black/20 hover:bg-black/30 backdrop-blur-xl border border-white/5 hover:border-indigo-500/30 p-6 rounded-[2rem] transition-all flex items-center justify-between">
                                <div className="flex items-center gap-6">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${inv.status === 'paid' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400'}`}>
                                        {inv.status === 'paid' ? <CheckCircle2 size={24} /> : <Clock size={24} />}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <h4 className="font-black text-white text-lg tracking-tight">Invoice #{inv.id}</h4>
                                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-lg border ${inv.status === 'paid' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-400 border-amber-500/20'}`}>
                                                {inv.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 text-[11px] font-bold text-white/30 lowercase tracking-wider">
                                            <span>{inv.type} payment</span>
                                            <div className="w-1 h-1 rounded-full bg-white/10" />
                                            <span>{new Date(inv.createdAt).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-12">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Subtotal</p>
                                        <p className="text-sm font-bold text-white/40 font-mono">${parseFloat(inv.amount).toFixed(2)}</p>
                                    </div>
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[9px] font-black text-white/20 uppercase tracking-widest mb-1">Tax (11%)</p>
                                        <p className="text-sm font-bold text-white/40 font-mono">${parseFloat(inv.tax_amount || '0').toFixed(2)}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-black text-white/20 uppercase tracking-widest mb-1">Total Payable</p>
                                        <p className="text-2xl font-black text-white tabular-nums">${parseFloat(inv.total_amount || inv.amount).toFixed(2)}</p>
                                    </div>

                                    {inv.status === 'unpaid' && (
                                        <button
                                            onClick={() => handlePay(inv.id)}
                                            className="px-8 py-4 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all shadow-xl shadow-indigo-500/20 flex items-center gap-2 group/btn"
                                        >
                                            <Zap size={16} className="group-hover/btn:animate-pulse" /> Pay Now
                                        </button>
                                    )}

                                    {inv.status === 'paid' && (
                                        <button className="p-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl transition-all border border-white/5 group/dl">
                                            <Download size={20} className="group-hover/dl:scale-110 transition-transform" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {products.map(product => {
                        const features = typeof product.features === 'string' ? JSON.parse(product.features) : product.features;
                        return (
                            <div key={product.id} className="relative group">
                                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-[2.5rem] blur-2xl opacity-0 group-hover:opacity-100 transition-opacity" />
                                <div className="relative bg-black/40 backdrop-blur-2xl border border-white/10 p-10 rounded-[2.5rem] flex flex-col h-full hover:border-indigo-500/30 transition-all">
                                    <div className="mb-8">
                                        <h4 className="text-2xl font-black text-white mb-2 tracking-tight">{product.name}</h4>
                                        <div className="flex items-baseline gap-1">
                                            <span className="text-4xl font-black text-white font-mono">${product.price}</span>
                                            <span className="text-[11px] font-bold text-white/20 uppercase tracking-widest">/ month</span>
                                        </div>
                                    </div>

                                    <div className="flex-1 space-y-4 mb-10">
                                        {Object.entries(features || {}).map(([key, val]: [string, any]) => (
                                            <div key={key} className="flex items-center gap-3 group/feat">
                                                <div className="w-5 h-5 rounded-full bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20 group-hover/feat:bg-indigo-500 group-hover/feat:text-white transition-all">
                                                    <CheckCircle2 size={12} />
                                                </div>
                                                <span className="text-xs font-bold text-white/60 capitalize">
                                                    {key.replace('_', ' ')}: <span className="text-white">{val}</span>
                                                </span>
                                            </div>
                                        ))}
                                    </div>

                                    <button className="w-full py-5 bg-white/5 hover:bg-indigo-500 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] transition-all border border-white/10 hover:border-indigo-500 shadow-xl flex items-center justify-center gap-3">
                                        Select Plan <ArrowRight size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BillingManager;
