import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true, // Temporarily disable TypeScript checking
  },
  eslint: {
    ignoreDuringBuilds: true, // Temporarily disable ESLint during builds
  },
  // Disable static generation to prevent build issues
  output: 'standalone',
  images: {
    unoptimized: true, // Set to true to disable the Image Optimization API
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'firebasestorage.googleapis.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.pexels.com', // Added Pexels
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Add this for static export
  //  output: 'export',
  //  distDir: 'out',
};

export default nextConfig;