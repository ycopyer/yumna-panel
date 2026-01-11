import React, { useState, useEffect, useCallback, useRef } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './components/auth/Login';
import Explorer from './components/explorer/Explorer';
import SharedLanding from './components/sharing/SharedLanding';
import ErrorPage from './components/common/ErrorPage';
import BlockedPage from './components/security/BlockedPage';
import UnblockRequestPage from './components/security/UnblockRequestPage';
import Installer from './components/Installer';

// Global Axios configuration to ensure headers are present on first load (Fixes refresh-to-login issue)
axios.interceptors.request.use((config) => {
    const sessionId = localStorage.getItem('sessionId');
    const userId = localStorage.getItem('userId');

    if (sessionId) {
        config.headers['x-session-id'] = sessionId;
    }
    if (userId) {
        config.headers['x-user-id'] = userId;
    }
    return config;
});

function App() {
    const [user, setUser] = useState<any>(() => {
        try {
            const savedUser = localStorage.getItem('user');
            if (savedUser && savedUser !== 'undefined' && savedUser !== 'null') {
                const parsed = JSON.parse(savedUser);
                console.log('[APP] Restored user from storage:', parsed.username);
                return parsed;
            }
        } catch (e) {
            console.error('[APP] Failed to parse saved user', e);
        }
        return null;
    });

    useEffect(() => {
        // Global theme initialization
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'light') {
            document.documentElement.classList.add('light-mode');
        } else {
            document.documentElement.classList.remove('light-mode');
        }
    }, []);

    const handleLogin = (userData: any) => {
        if (!userData) return;
        const normalizedUser = {
            ...userData,
            userId: userData.userId || userData.id // Ensure userId exists
        };
        localStorage.setItem('user', JSON.stringify(normalizedUser));
        localStorage.setItem('userId', normalizedUser.userId.toString());
        if (userData.sessionId) {
            localStorage.setItem('sessionId', userData.sessionId);
        }
        setUser(normalizedUser);
        console.log('[APP] Logged in:', normalizedUser.username);
    };

    const handleLogout = useCallback(() => {
        try {
            // Optional: Notify server of logout
            const sessionId = localStorage.getItem('sessionId');
            const userId = localStorage.getItem('userId');
            if (sessionId && userId) {
                axios.delete(`/api/sessions/${sessionId}`, { headers: { 'x-user-id': userId } }).catch(() => { });
            }
        } catch (e) {
            console.error('Logout error:', e);
        }

        localStorage.removeItem('user');
        localStorage.removeItem('userId');
        localStorage.removeItem('sessionId');
        setUser(null);
        console.log('[APP] Logged out');
    }, []);

    // Axios Response Interceptor for 401 handling
    useEffect(() => {
        const interceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                if (error.response && error.response.status === 401) {
                    // Only logout if we are currently logged in to avoid loops on login page
                    if (localStorage.getItem('sessionId')) {
                        console.warn('[APP] Session expired or unauthorized (401). Logging out.');
                        handleLogout();
                    }
                }
                return Promise.reject(error);
            }
        );

        return () => {
            axios.interceptors.response.eject(interceptor);
        };
    }, [handleLogout]);

    // Idle Timer (Auto Logout after 30 minutes)
    useEffect(() => {
        if (!user) return; // Only run if user is logged in

        const timeoutDuration = 30 * 60 * 1000; // 30 minutes
        let idleTimer: ReturnType<typeof setTimeout>;

        const resetTimer = () => {
            clearTimeout(idleTimer);
            idleTimer = setTimeout(() => {
                console.warn('[APP] User inactive for 30 minutes. Auto-logging out.');
                handleLogout();
            }, timeoutDuration);
        };

        // Events to listen for activity
        const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];

        // Throttle listener regarding performance (optional, but good for scroll/mousemove)
        // For simplicity, we just attach resetTimer
        const handleActivity = () => {
            resetTimer();
        };

        events.forEach(event => window.addEventListener(event, handleActivity));
        resetTimer(); // Start timer

        return () => {
            clearTimeout(idleTimer);
            events.forEach(event => window.removeEventListener(event, handleActivity));
        };
    }, [user, handleLogout]);

    return (
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg-dark)', color: 'var(--text-main)' }}>
                <Routes>
                    <Route
                        path="/"
                        element={user ? <Explorer user={user} onLogout={handleLogout} /> : <div className="app-container" style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}><Login onLogin={handleLogin} /></div>}
                    />
                    <Route path="/login" element={<Navigate to="/" replace />} />
                    <Route path="/share/:id" element={<SharedLanding />} />

                    {/* Blocked Page */}
                    <Route path="/blocked" element={<BlockedPage />} />

                    {/* Unblock Request Page */}
                    <Route path="/unblock-request" element={<UnblockRequestPage />} />

                    {/* Error Routes */}
                    <Route path="/403" element={<ErrorPage code={403} />} />
                    <Route path="/404" element={<ErrorPage code={404} />} />
                    <Route path="/install" element={<Installer />} />

                    <Route path="*" element={<Navigate to="/404" replace />} />
                </Routes>
            </div>
        </BrowserRouter>
    );
}

export default App;
