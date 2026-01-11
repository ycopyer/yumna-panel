import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { CreditCard, Plus, Trash2, Edit2, Shield, Activity, X, Save, Loader2, Globe, Cpu, HardDrive, RefreshCw, Zap, DollarSign, Package, Settings, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface Product {
    id: number;
    name: string;
    description: string;
    price: string;
    features: any;
    billing_cycle: string;
    status: string;
}

interface UsageRate {
    id: number;
    name: string;
    unit: string;
    price_per_unit: string;
}

const AdminBillingManager: React.FC<{ userId: number }> = ({ userId }) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [rates, setRates] = useState<UsageRate[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAdding, setIsAdding] = useState(false);
    const [editingProduct, setEditingProduct] = useState<Product | null>(null);
    const [submitting, setSubmitting] = useState(false);

    // Form states
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [price, setPrice] = useState('0.00');
    const [period, setPeriod] = useState('monthly');
    const [features, setFeatures] = useState('{}');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [prodRes, ratesRes] = await Promise.all([
                axios.get('/api/billing/products'),
                axios.get('/api/billing/rates', { headers: { 'x-user-id': userId } })
            ]);
            setProducts(prodRes.data);
            setRates(ratesRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        try {
            const data = { name, description, price, period, features: JSON.parse(features) };
            if (editingProduct) {
                await axios.put(`/api/billing/products/${editingProduct.id}`, data, { headers: { 'x-user-id': userId } });
            } else {
                await axios.post('/api/billing/products', data, { headers: { 'x-user-id': userId } });
            }
            fetchData();
            resetForm();
        } catch (err) {
            alert('Failed to save product');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteProduct = async (id: number) => {
        if (!confirm('Are you sure you want to delete this product?')) return;
        try {
            await axios.delete(`/api/billing/products/${id}`, { headers: { 'x-user-id': userId } });
            fetchData();
        } catch (err) {
            alert('Delete failed');
        }
    };

    const resetForm = () => {
        setName('');
        setDescription('');
        setPrice('0.00');
        setPeriod('monthly');
        setFeatures('{}');
        setIsAdding(false);
        setEditingProduct(null);
    };

    const startEdit = (p: Product) => {
        setEditingProduct(p);
        setName(p.name);
        setDescription(p.description);
        setPrice(p.price);
        setPeriod(p.billing_cycle || 'monthly');
        setFeatures(JSON.stringify(p.features, null, 2));
        setIsAdding(true);
    };

    const generateInvoices = async () => {
        if (!confirm('Generate usage invoices for all active orders? This runs the billing engine.')) return;
        setSubmitting(true);
        try {
            const res = await axios.post('/api/billing/generate-usage-invoices', {}, { headers: { 'x-user-id': userId } });
            alert(`Success! Generated ${res.data.count} usage invoices.`);
        } catch (err: any) {
            alert(err.response?.data?.error || 'Failed to generate invoices');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="space-y-8 animate-fade">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-2">
                <div className="space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-3 bg-gradient-to-br from-rose-500 to-orange-600 rounded-2xl text-white shadow-xl shadow-rose-500/20">
                            <DollarSign size={24} />
                        </div>
                        <div>
                            <h3 className="text-3xl font-black text-white tracking-tight">Financial Hub</h3>
                            <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.2em] flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
                                Revenue & Monetization
                            </p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={generateInvoices}
                        disabled={submitting}
                        className="flex items-center gap-3 px-6 py-4 bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border border-emerald-500/20 disabled:opacity-50"
                    >
                        {submitting ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        <span>Run Billing Engine</span>
                    </button>
                    {!isAdding ? (
                        <button
                            onClick={() => setIsAdding(true)}
                            className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all border border-white/10"
                        >
                            <Plus size={16} />
                            <span>Create Product</span>
                        </button>
                    ) : (
                        <button onClick={resetForm} className="flex items-center gap-3 px-6 py-4 bg-white/5 hover:bg-white/10 text-white/40 hover:text-white rounded-2xl font-black text-[11px] uppercase tracking-widest transition-all">
                            <X size={16} /> Cancel
                        </button>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Left: Product Management */}
                <div className="lg:col-span-2 space-y-6">
                    <AnimatePresence mode="wait">
                        {isAdding ? (
                            <motion.form
                                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
                                onSubmit={handleSave} className="bg-black/40 backdrop-blur-xl border border-white/10 p-10 rounded-[2.5rem] space-y-8 shadow-2xl"
                            >
                                <h4 className="text-xl font-black text-white flex items-center gap-3 border-b border-white/5 pb-6">
                                    <Package className="text-indigo-400" /> {editingProduct ? 'Edit Product' : 'Create New Plan'}
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                    <div className="space-y-6">
                                        <div>
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Product Name</label>
                                            <input value={name} onChange={e => setName(e.target.value)} className="input-glass w-full px-6 py-4 rounded-2xl font-bold" placeholder="e.g. Professional Cloud" required />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Monthly Price ($)</label>
                                            <input type="number" step="0.01" value={price} onChange={e => setPrice(e.target.value)} className="input-glass w-full px-6 py-4 rounded-2xl font-bold font-mono" required />
                                        </div>
                                        <div>
                                            <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Billing Cycle</label>
                                            <select value={period} onChange={e => setPeriod(e.target.value)} className="input-glass w-full px-6 py-4 rounded-2xl font-bold">
                                                <option value="monthly">Monthly</option>
                                                <option value="yearly">Yearly</option>
                                                <option value="once">One-time</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-[10px] font-black text-white/40 uppercase tracking-widest ml-1 mb-2 block">Features (JSON)</label>
                                        <textarea value={features} onChange={e => setFeatures(e.target.value)} className="input-glass w-full px-6 py-4 rounded-2xl font-mono text-xs min-h-[140px]" />
                                    </div>
                                </div>
                                <button type="submit" disabled={submitting} className="w-full py-5 bg-indigo-500 hover:bg-indigo-400 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 transition-all">
                                    {submitting ? <Loader2 className="animate-spin" /> : <><Save size={18} /> {editingProduct ? 'Update Product' : 'Publish Product'}</>}
                                </button>
                            </motion.form>
                        ) : (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {products.map(p => (
                                    <div key={p.id} className="bg-white/[0.03] border border-white/5 p-8 rounded-[2.5rem] flex flex-col hover:border-indigo-500/30 transition-all group">
                                        <div className="flex justify-between items-start mb-6">
                                            <div>
                                                <h4 className="text-xl font-black text-white mb-1">{p.name}</h4>
                                                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Active Plan</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-2xl font-black text-white">${p.price}</p>
                                                <p className="text-[9px] font-bold text-white/20 uppercase">per month</p>
                                            </div>
                                        </div>
                                        <div className="flex-1 space-y-2 mb-8">
                                            {Object.entries(p.features || {}).slice(0, 3).map(([k, v]: [any, any]) => (
                                                <div key={k} className="flex items-center gap-2 text-[11px] font-bold text-white/40">
                                                    <div className="w-1 h-1 rounded-full bg-indigo-500" />
                                                    <span className="capitalize">{k}: {v}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => startEdit(p)} className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all">Edit</button>
                                            <button onClick={() => handleDeleteProduct(p.id)} className="px-4 py-3 bg-rose-500/10 hover:bg-rose-500 text-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20"><Trash2 size={16} /></button>
                                        </div>
                                    </div>
                                ))}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>

                {/* Right: Usage Rates */}
                <div className="space-y-6">
                    <div className="bg-black/20 border border-white/10 p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-4 opacity-5">
                            <Zap size={80} className="text-white" />
                        </div>
                        <h4 className="text-sm font-black text-white mb-6 uppercase tracking-[0.2em] flex items-center gap-3">
                            <Activity className="text-amber-500" size={18} /> Metered Rates
                        </h4>
                        <div className="space-y-4">
                            {rates.map(rate => (
                                <div key={rate.id} className="p-5 bg-white/5 rounded-2xl border border-white/5 flex items-center justify-between group">
                                    <div>
                                        <p className="text-xs font-black text-white mb-0.5 capitalize">{rate.name}</p>
                                        <p className="text-[10px] font-bold text-white/30 uppercase tracking-widest">per {rate.unit}</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-lg font-black text-emerald-400 font-mono">${rate.price_per_unit}</p>
                                        <button className="text-[9px] font-black text-indigo-400 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Adjust</button>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 p-4 bg-amber-500/5 rounded-2xl border border-amber-500/10 flex gap-4">
                            <Info size={20} className="text-amber-500 shrink-0" />
                            <p className="text-[10px] font-medium text-amber-500/60 leading-relaxed uppercase tracking-wider">
                                Rates are automatically applied to the billing engine when usage invoices are generated.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminBillingManager;
