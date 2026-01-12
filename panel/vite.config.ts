import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [
        react(),
        tailwindcss()
    ],
    server: {
        port: 3000,
        proxy: {
            '/api/auth': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/servers': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/websites': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/databases': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/ls': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/download': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/save-content': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/read-content': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/mkdir': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/delete': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/rename': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/chmod': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/firewall': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/analytics': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/ssl': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/billing': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/dns': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/activity-history': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/git': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api/task': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/api': {
                target: 'http://localhost:4000',
                changeOrigin: true
            },
            '/uploads': {
                target: 'http://localhost:4000',
                changeOrigin: true
            }
        }
    }
})

