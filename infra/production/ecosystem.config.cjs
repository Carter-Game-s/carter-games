module.exports = {
  apps: [
    {
      name: "orbit-proxy-games",
      cwd: `${__dirname}/../..`,
      script: "node_modules/next/dist/bin/next",
      interpreter: process.execPath,
      args: "start --hostname 127.0.0.1 --port 3000",
      env: { NODE_ENV: "production" },
      autorestart: true,
      min_uptime: "10s",
      max_restarts: 10,
      restart_delay: 5000,
      kill_timeout: 15000,
      time: true,
    },
  ],
};
