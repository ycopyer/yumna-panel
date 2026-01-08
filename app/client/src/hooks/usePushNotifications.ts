import { useState, useEffect } from 'react';
import axios from 'axios';

const usePushNotifications = () => {
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [permission, setPermission] = useState(Notification.permission);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        checkSubscription();
    }, []);

    const urlBase64ToUint8Array = (base64String: string) => {
        const padding = '='.repeat((4 - base64String.length % 4) % 4);
        const base64 = (base64String + padding)
            .replace(/\-/g, '+')
            .replace(/_/g, '/');

        const rawData = window.atob(base64);
        const outputArray = new Uint8Array(rawData.length);

        for (let i = 0; i < rawData.length; ++i) {
            outputArray[i] = rawData.charCodeAt(i);
        }
        return outputArray;
    };

    const checkSubscription = async () => {
        if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        setIsSubscribed(!!subscription);
        setPermission(Notification.permission);
    };

    const subscribe = async () => {
        setLoading(true);
        try {
            // 1. Get VAPID Key
            const { data: { publicKey } } = await axios.get('/api/notifications/vapid-key', {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });

            // 2. Request Permission
            const perm = await Notification.requestPermission();
            setPermission(perm);

            if (perm !== 'granted') {
                throw new Error('Notification permission denied');
            }

            // 3. Subscribe
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(publicKey)
            });

            // 4. Send to Backend
            await axios.post('/api/notifications/subscribe', subscription, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });

            setIsSubscribed(true);
            alert('Example: Notifications enabled successfully!');
        } catch (err) {
            console.error('Subscription failed:', err);
            alert('Failed to enable notifications. Please check permissions.');
        } finally {
            setLoading(false);
        }
    };

    const sendTestNotification = async () => {
        try {
            await axios.post('/api/notifications/test', {}, {
                headers: { 'x-user-id': localStorage.getItem('userId') }
            });
            alert('Test notification sent! Check your device.');
        } catch (err) {
            console.error('Test failed:', err);
            alert('Failed to send test notification.');
        }
    };

    return { isSubscribed, subscribe, sendTestNotification, permission, loading };
};

export default usePushNotifications;
