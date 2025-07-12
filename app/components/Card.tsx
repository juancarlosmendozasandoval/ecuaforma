
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

interface CardProps {
  title: string;
  href: string;
  description?: string;
}

export default function Card({ title, href, description }: CardProps) {
  return (
    <Link href={href} className="block bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:scale-105 transition-all duration-300 group">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-primary group-hover:text-secondary">{title}</h3>
          {description && <p className="text-text-secondary mt-1">{description}</p>}
        </div>
        <ChevronRight className="text-gray-400 group-hover:text-primary transition-colors" size={24} />
      </div>
    </Link>
  );
}
