import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  serverExternalPackages: ['node-cron', '@iarna/toml', 'nodemailer', 'p-limit'],
}

export default nextConfig
