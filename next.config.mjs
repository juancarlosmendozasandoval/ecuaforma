/** @type {import('next').NextConfig} */
const nextConfig = {
    images: {
        remotePatterns: [
            {
                protocol: 'https',
                hostname: 'placehold.co',
            },
            {
                protocol: 'https',
                hostname: 'hqoopmrvagnzsxoofozh.supabase.co', // <-- DOMINIO DE SUPABASE AÑADIDO
            },
        ],
    },
};

export default nextConfig;