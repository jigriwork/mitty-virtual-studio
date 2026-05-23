import { cn } from '@/lib/utils';
import Image from 'next/image';

type MittyLogoProps = {
  className?: string;
};

export function MittyLogo({ className }: MittyLogoProps) {
  return (
    <Image
      src="/mitty-studio-logo.png"
      alt="MITTY Studio"
      width={48}
      height={48}
      className={cn('h-8 w-8 rounded-sm object-contain', className)}
      priority
    />
  );
}
