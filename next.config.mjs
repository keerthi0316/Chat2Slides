/** @type {import('next').NextConfig} */
const nextConfig = {
  // Images configuration to allow loading from the official Unsplash API
  images: {
      remotePatterns: [
          {
              protocol: 'https',
              hostname: 'images.unsplash.com',
              port: '',
              pathname: '/**',
          },
      ],
  },
  // Add any other configurations here if needed
};

// Use ES Module export syntax for an .mjs file
export default nextConfig;
