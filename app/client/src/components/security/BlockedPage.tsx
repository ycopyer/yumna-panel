import React, { useEffect, useState } from 'react';
import { ShieldAlert, AlertTriangle, Mail, Phone } from 'lucide-react';
import axios from 'axios';

const BlockedPage: React.FC = () => {
    const [userIP, setUserIP] = useState<string>('Loading...');
    const [reason, setReason] = useState<string>('Suspicious activity detected');
    const [blockType, setBlockType] = useState<string>('IP');
    const [siteSettings, setSiteSettings] = useState<any>({
        site_title: 'Yumna Panel',
        contact_email: 'admin@example.com',
        contact_phone: '+62 xxx-xxxx-xxxx'
    });

    useEffect(() => {
        // Get URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const ipParam = urlParams.get('ip');
        const reasonParam = urlParams.get('reason');
        const typeParam = urlParams.get('type');

        if (ipParam) setUserIP(ipParam);
        if (reasonParam) setReason(reasonParam);
        if (typeParam) setBlockType(typeParam.toUpperCase());

        // Fetch site settings
        axios.get('/api/blocked-info')
            .then(res => setSiteSettings(res.data))
            .catch(err => console.error('Failed to fetch site settings:', err));
    }, []);

    return (
        <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 dark:from-gray-900 dark:via-gray-800 dark:to-red-900 flex items-center justify-center p-4">
            <div className="max-w-2xl w-full">
                {/* Main Card */}
                <div className="bg-white dark:bg-gray-800 rounded-[40px] shadow-2xl border-4 border-red-500/20 overflow-hidden">

                    {/* Header with Icon */}
                    <div className="bg-gradient-to-r from-red-500 to-red-600 p-8 text-center">
                        <div className="inline-flex items-center justify-center w-24 h-24 bg-white/20 backdrop-blur-sm rounded-full mb-4 animate-pulse">
                            <ShieldAlert size={48} className="text-white" />
                        </div>
                        <h1 className="text-3xl font-black text-white mb-2">Access Denied</h1>
                        <p className="text-red-100 font-medium">Your connection has been blocked by our security system</p>
                    </div>

                    {/* Content */}
                    <div className="p-10 space-y-8">
                        {/* Alert Box */}
                        <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-200 dark:border-red-800 rounded-3xl p-6">
                            <div className="flex items-start gap-4">
                                <div className="bg-red-500/10 p-3 rounded-2xl">
                                    <AlertTriangle size={24} className="text-red-500" />
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-lg font-black text-red-900 dark:text-red-100 mb-2">
                                        Your {blockType} Has Been Blocked
                                    </h3>
                                    <p className="text-sm text-red-700 dark:text-red-300 leading-relaxed">
                                        Our automated security system has detected suspicious activity from your connection.
                                        Access to <span className="font-bold">{siteSettings.site_title}</span> has been temporarily restricted.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* IP Info */}
                        <div className="bg-gray-50 dark:bg-gray-700/50 rounded-2xl p-6 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Your IP Address</span>
                                <span className="text-lg font-black text-gray-900 dark:text-white font-mono">{userIP}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Block Reason</span>
                                <span className="text-sm font-bold text-red-600 dark:text-red-400">{reason}</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wider">Status</span>
                                <span className="px-3 py-1 bg-red-500 text-white text-xs font-black rounded-full uppercase">Blocked</span>
                            </div>
                        </div>

                        {/* What to do */}
                        <div className="space-y-4">
                            <h4 className="text-lg font-black text-gray-900 dark:text-white">What should I do?</h4>
                            <div className="space-y-3 text-sm text-gray-700 dark:text-gray-300">
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">1</div>
                                    <p className="leading-relaxed">
                                        <span className="font-bold">Wait 24 hours</span> - Most blocks are temporary and will be automatically lifted after 24 hours.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">2</div>
                                    <p className="leading-relaxed">
                                        <span className="font-bold">Check your network</span> - Ensure your device is not infected with malware or being used by unauthorized software.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">3</div>
                                    <p className="leading-relaxed">
                                        <span className="font-bold">Request unblock</span> - If you believe this is a mistake, submit an unblock request for immediate review.
                                    </p>
                                </div>
                                <div className="flex items-start gap-3">
                                    <div className="w-6 h-6 bg-blue-500 text-white rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">4</div>
                                    <p className="leading-relaxed">
                                        <span className="font-bold">Contact support</span> - Or contact our IT Help Desk directly using the information below.
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Request Unblock Button */}
                        <a
                            href="/unblock-request"
                            className="block w-full bg-gradient-to-r from-blue-500 to-indigo-600 text-white py-4 rounded-2xl font-black shadow-lg hover:shadow-xl transition-all text-center active:scale-95"
                        >
                            📝 Submit Unblock Request
                        </a>

                        {/* Contact Info */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-3xl p-6 border-2 border-blue-200 dark:border-blue-800">
                            <h4 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                                <Phone size={20} className="text-blue-500" />
                                Need Help? Contact IT Help Desk
                            </h4>
                            <div className="space-y-3">
                                <a
                                    href={`mailto:${siteSettings.contact_email}`}
                                    className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl hover:shadow-md transition-all group"
                                >
                                    <div className="bg-blue-500/10 p-2 rounded-lg group-hover:bg-blue-500/20 transition-colors">
                                        <Mail size={20} className="text-blue-500" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Email</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{siteSettings.contact_email}</div>
                                    </div>
                                </a>
                                <div className="flex items-center gap-3 p-3 bg-white dark:bg-gray-800 rounded-xl">
                                    <div className="bg-green-500/10 p-2 rounded-lg">
                                        <Phone size={20} className="text-green-500" />
                                    </div>
                                    <div>
                                        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Phone</div>
                                        <div className="font-bold text-gray-900 dark:text-white">{siteSettings.contact_phone}</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Footer Note */}
                        <div className="text-center pt-4 border-t border-gray-200 dark:border-gray-700">
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                This security measure helps protect <span className="font-bold">{siteSettings.site_title}</span> and its users from malicious activities.
                                <br />
                                Block ID: <span className="font-mono font-bold">{Date.now().toString(36).toUpperCase()}</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Powered by */}
                <div className="text-center mt-8">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Protected by <span className="font-bold">{siteSettings.site_title}</span> Security System
                    </p>
                </div>
            </div>
        </div>
    );
};

export default BlockedPage;
