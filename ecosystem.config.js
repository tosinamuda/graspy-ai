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
        },
        {
            name: "graspy-server",              // Express reverse proxy + your APIs
            cwd: "apps/server",
            script: "./dist/index.js",
            node_args: "-r ./config.js",
            env: {
                NODE_ENV: "production",
                PORT: "8081",
                NEXT_ORIGIN: "http://127.0.0.1:3001"
            },
            env_production: {
                NODE_ENV: "production",
                PORT: "8081",
                NEXT_ORIGIN: "http://127.0.0.1:3001"
            },
            instances: 1,                        // run a single worker in PM2 like the manual command
            exec_mode: "fork",
            watch: false,
            max_memory_restart: "400M",
            listen_timeout: 10000,
            kill_timeout: 5000
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
