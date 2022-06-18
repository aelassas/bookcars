/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,
  poweredByHeader: false,
  images: {
    domains: ['localhost', 'bookcars.ddns.net', 'bookcars.ma']
  }
}

module.exports = nextConfig
