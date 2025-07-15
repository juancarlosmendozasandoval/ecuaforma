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
                hostname: 'hqoopmrvagnzsxoofozh.supabase.co',
            },
            {
                protocol: 'https',
                hostname: 'lh3.googleusercontent.com', // <-- DOMINIO PARA FOTOS DE PERFIL DE GOOGLE
            },
        ],
    },
};

export default nextConfig;