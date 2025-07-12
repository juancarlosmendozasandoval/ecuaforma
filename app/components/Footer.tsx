import { Facebook, Instagram, Youtube } from 'lucide-react';

const TikTokIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width="24"
    height="24"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M12.52.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-2.43.05-4.84-.95-6.43-2.8-1.59-1.87-2.32-4.45-1.96-7.12.31-2.25 1.97-4.15 3.82-5.39 1.85-1.23 4.09-1.65 6.18-1.02.02 3.01-.01 6.02-.02 9.03-.02 1.52-.63 3.05-1.73 4.13-1.13 1.06-2.73 1.56-4.23 1.72v-4.02c1.44-.05 2.89-.35 4.2-.97.57-.26 1.1-.59 1.62-.93-.01-2.92.01-5.84-.02-8.75a4.8 4.8 0 0 1-1.35-3.9c-.01-1.24.23-2.48.72-3.63.49-1.15 1.23-2.19 2.19-3.09.28-.26.58-.5.9-.71z"></path>
  </svg>
);

const socialLinks = [
  { href: 'https://tiktok.com/@inge.jc', icon: TikTokIcon, label: 'TikTok' },
  { href: 'https://youtube.com/@ecuaforma', icon: Youtube, label: 'YouTube' },
  { href: 'https://instagram.com/ecuaforma', icon: Instagram, label: 'Instagram' },
  { href: 'https://facebook.com/ecuaforma', icon: Facebook, label: 'Facebook' },
];

export default function Footer() {
  return (
    <footer className="bg-primary text-white border-t-4 border-accent">
      <div className="main-container py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="text-center md:text-left">
            <p className="font-bold text-xl">Ecuaforma</p>
            <p className="text-sm text-gray-300 mt-1">Formando a los futuros héroes del Ecuador.</p>
          </div>
          <div className="flex items-center gap-4">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={social.label}
                className="p-2 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
              >
                <social.icon className="w-6 h-6 text-white" />
              </a>
            ))}
          </div>
        </div>
        <div className="text-center text-sm text-gray-400 mt-8 pt-6 border-t border-white/10">
          &copy; {new Date().getFullYear()} Ecuaforma. Todos los derechos reservados.
        </div>
      </div>
    </footer>
  );
}
