module.exports = {
    apps: [
        {
            name: 'yumna-panel',
            script: 'index.js',
            cwd: './server',
            instances: 1,
            autorestart: true,
            watch: false,
            max_memory_restart: '1G',
            env: {
                NODE_ENV: 'development',
            },
            env_production: {
                NODE_ENV: 'production',
                PORT: 5000
            }
        }
    ]
};
