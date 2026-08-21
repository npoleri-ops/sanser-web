/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
    // La landing pide quality={80}; hay que declararlo o Next avisa en cada render.
    qualities: [75, 80],
  },
}

export default nextConfig
