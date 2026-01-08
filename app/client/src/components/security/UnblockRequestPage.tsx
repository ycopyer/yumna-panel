import React, { useState, useEffect } from 'react';
import { ShieldAlert, Send, CheckCircle, Loader2, AlertCircle } from 'lucide-react';
import axios from 'axios';

const UnblockRequestPage: React.FC = () => {
    const [userIP, setUserIP] = useState<string>('Loading...');
    const [blockInfo, setBlockInfo] = useState<any>(null);
    const [siteSettings, setSiteSettings] = useState<any>({
        site_title: 'Yumna Panel',
        contact_email: 'admin@example.com',
        contact_phone: '+62 xxx-xxxx-xxxx'
    });
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [error, setError] = useState('');

    // Form state
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [reason, setReason] = useState('');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            // Get IP
            const ipRes = await axios.get('/api/get-ip');
            setUserIP(ipRes.data.ip);

            // Get site settings
            const settingsRes = await axios.get('/api/blocked-info');
            setSiteSettings(settingsRes.data);

            // Get block info
            const blockRes = await axios.get(`/api/firewall/check/${ipRes.data.ip}`);
            setBlockInfo(blockRes.data);
        } catch (err: any) {
            console.error('Failed to fetch data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!name || !email || !reason) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setSubmitting(true);
            setError('');

            await axios.post('/api/firewall/unblock-request', {
                ip: userIP,
                name,
                email,
                reason,
                blockReason: blockInfo?.reason || 'Unknown'
            });

            setSubmitted(true);
        } catch (err: any) {
            // If duplicate request (409), treat as success (user just wants to know it's pending)
            if (err.response?.status === 409) {
                setSubmitted(true);
                return;
            }
            setError(err.response?.data?.error || 'Failed to submit request');
        } finally {
            setSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center">
                <Loader2 size={48} className="animate-spin text-blue-500" />
            </div>
        );
    }

    if (submitted) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-900 dark:via-gray-800 dark:to-green-900 flex items-center justify-center p-4">
                <div className="max-w-2xl w-full bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border-4 border-green-500/20 p-10 text-center">
                    <div className="inline-flex items-center justify-center w-24 h-24 bg-green-500/20 rounded-full mb-6">
                        <CheckCircle size={48} className="text-green-500" />
                    </div>
                    <h1 className="text-3xl font-black text-gray-900 dark:text-white mb-4">Request Submitted!</h1>
                    <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
                        Your unblock request has been sent to our IT team.
                        We will review your request and contact you via email within 24 hours.
                    </p>
                    <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-2xl p-6">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                            <strong>Request ID:</strong> <span className="font-mono">{Date.now().toString(36).toUpperCase()}</span><br />
                            <strong>Email:</strong> {email}<br />
                            <strong>Status:</strong> <span className="text-yellow-600 font-bold">Pending Review</span>
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-blue-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                <div className="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border-4 border-blue-500/20 overflow-hidden">

                    {/* Header */}
                    <div className="bg-gradient-to-r from-blue-500 to-indigo-600 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-4">
                            <ShieldAlert size={48} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2">Request Unblock</h1>
                        <p className="text-blue-100 font-medium">Submit a request to restore your access</p>
                    </div>

                    {/* Content */}
                    <div className="p-10 space-y-6">
                        {/* Current Status */}
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl p-6">
                            <h3 className="text-lg font-black text-red-900 dark:text-red-100 mb-3">Current Status</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400 font-bold">Your IP:</span>
                                    <span className="font-mono font-black text-gray-900 dark:text-white">{userIP}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-600 dark:text-gray-400 font-bold">Status:</span>
                                    <span className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-full">BLOCKED</span>
                                </div>
                                {blockInfo?.reason && (
                                    <div className="mt-3 pt-3 border-t border-red-200 dark:border-red-800">
                                        <span className="text-gray-600 dark:text-gray-400 font-bold block mb-1">Reason:</span>
                                        <span className="text-sm text-red-700 dark:text-red-300 italic">{blockInfo.reason}</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-800 rounded-3xl p-6">
                                <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4">Unblock Request Form</h3>

                                {error && (
                                    <div className="mb-4 bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-xl p-3 flex items-center gap-2">
                                        <AlertCircle size={18} className="text-red-500" />
                                        <span className="text-sm text-red-700 dark:text-red-300 font-bold">{error}</span>
                                    </div>
                                )}

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">
                                            Full Name <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:border-blue-500 focus:outline-none"
                                            placeholder="John Doe"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">
                                            Email Address <span className="text-red-500">*</span>
                                        </label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:border-blue-500 focus:outline-none"
                                            placeholder="john@example.com"
                                            required
                                        />
                                    </div>

                                    <div>
                                        <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-2">
                                            Reason for Unblock Request <span className="text-red-500">*</span>
                                        </label>
                                        <textarea
                                            value={reason}
                                            onChange={(e) => setReason(e.target.value)}
                                            className="w-full px-4 py-3 rounded-xl border-2 border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white font-medium focus:border-blue-500 focus:outline-none resize-none"
                                            rows={4}
                                            placeholder="Please explain why you believe this block was a mistake..."
                                            required
                                        />
                                    </div>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={submitting}
                                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {submitting ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Submitting...
                                    </>
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Submit Unblock Request
                                    </>
                                )}
                            </button>
                        </form>

                        {/* Contact Info */}
                        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Need immediate assistance? Contact IT Help Desk:<br />
                                <a href={`mailto:${siteSettings.contact_email}`} className="text-blue-500 hover:underline font-bold">
                                    {siteSettings.contact_email}
                                </a>
                                {' | '}
                                <span className="font-bold">{siteSettings.contact_phone}</span>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UnblockRequestPage;
