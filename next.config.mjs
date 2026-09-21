/** @type {import('next').NextConfig} */
const nextConfig = {
  async redirects() {
    return [
      {
        source: '/challenges/store',
        destination: '/store',
        permanent: true,
      },
    ];
  },
};

export default nextConfig;