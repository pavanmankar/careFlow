import { cn } from '@/lib/cn';
import { avatarFromName } from '@/lib/medlink-data';

export function PersonPhoto({
  src,
  name,
  size = 'md',
}: {
  src?: string | null;
  name: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}) {
  const sizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
    xl: 'h-24 w-24',
  };
  return (
    <img
      src={src || avatarFromName(name)}
      alt={name}
      className={cn('shrink-0 rounded-full object-cover ring-2 ring-white', sizes[size])}
    />
  );
}
