module.exports = {
    apps: [
        {
            name: "graspy-web",                 // Next.js
            cwd: "apps/web",
            script: "node_modules/next/dist/bin/next",
            args: "start -p 3001 -H 0.0.0.0",
            env: {
                NODE_ENV: "production",
                PORT: "3001",
                NEXT_PUBLIC_API_URL: "https://graspy.tosinamuda.com/api"
            },
            env_production: {
                NODE_ENV: "production",
                PORT: "3001",
                NEXT_PUBLIC_API_URL: "https://graspy.tosinamuda.com/api"
            },
            instances: 1,                       // keep Next single-process; avoid ISR cache weirdness
            exec_mode: "fork",
            watch: false,
            max_memory_restart: "600M"
        }
    ],

    // Optional: zero-downtime remote deploys. Skip if you're not using `pm2 deploy`.
    deploy: {
        production: {
            user: "ubuntu",
            host: "your.server.tld",
            ref: "origin/main",
            repo: "git@github.com:you/graspy.git",
            path: "/var/www/graspy",
            'post-deploy':
                "npm ci && npm run build && pm2 reload ecosystem.config.js --env production"
        }
    }
};
