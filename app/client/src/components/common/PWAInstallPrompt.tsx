import React, { useEffect, useState } from 'react';
import { Download, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const PWAInstallPrompt: React.FC = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);

    useEffect(() => {
        // Check if already installed
        if (window.matchMedia('(display-mode: standalone)').matches) {
            setIsInstalled(true);
            return;
        }

        // Listen for install prompt
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);

            // Show prompt quickly (2 seconds) to encourage install
            const dismissed = localStorage.getItem('pwa-install-dismissed');
            if (!dismissed) {
                setTimeout(() => setShowPrompt(true), 2000);
            }
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Listen for successful install
        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowPrompt(false);
            console.log('[PWA] App installed successfully');
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        console.log(`[PWA] User response: ${outcome}`);

        if (outcome === 'dismissed') {
            localStorage.setItem('pwa-install-dismissed', 'true');
        }

        setDeferredPrompt(null);
        setShowPrompt(false);
    };

    const handleDismiss = () => {
        setShowPrompt(false);
        localStorage.setItem('pwa-install-dismissed', 'true');
    };

    if (isInstalled || !showPrompt || !deferredPrompt) {
        return null;
    }

    return (
        <div className="fixed bottom-6 right-6 z-50 animate-fade">
            <div className="glass bg-[var(--bg-dark)]/95 rounded-2xl p-6 shadow-2xl border border-[var(--border)] max-w-sm">
                <button
                    onClick={handleDismiss}
                    className="absolute top-3 right-3 p-1 hover:bg-[var(--nav-hover)] rounded-lg transition-colors"
                >
                    <X size={18} className="text-[var(--text-muted)]" />
                </button>

                <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-[var(--primary)] to-blue-400 flex items-center justify-center flex-shrink-0">
                        <Smartphone size={24} className="text-white" />
                    </div>

                    <div className="flex-1">
                        <h3 className="text-lg font-bold text-[var(--text-main)] mb-1">
                            Install Yumna Panel
                        </h3>
                        <p className="text-sm text-[var(--text-muted)] mb-4">
                            Install aplikasi untuk akses lebih cepat dan bisa digunakan offline
                        </p>

                        <div className="flex gap-2">
                            <button
                                onClick={handleInstallClick}
                                className="flex-1 bg-[var(--primary)] text-white px-4 py-2.5 rounded-xl font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                            >
                                <Download size={18} />
                                Install
                            </button>
                            <button
                                onClick={handleDismiss}
                                className="px-4 py-2.5 rounded-xl font-medium hover:bg-[var(--nav-hover)] transition-colors text-[var(--text-muted)]"
                            >
                                Nanti
                            </button>
                        </div>
                    </div>
                </div>

                {/* Features */}
                <div className="mt-4 pt-4 border-t border-[var(--border)]">
                    <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)]">
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Akses offline</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Notifikasi push</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Lebih cepat</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <span className="text-green-500">✓</span>
                            <span>Seperti app</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PWAInstallPrompt;
