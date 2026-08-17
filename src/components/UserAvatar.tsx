import { useState, useEffect } from 'react';
import { User as UserIcon } from 'lucide-react';

interface UserAvatarProps {
  photoURL?: string | null;
  name?: string | null;
  email?: string | null;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  className?: string;
  showStatus?: boolean;
  statusColor?: string;
  onClick?: () => void;
}

const sizeClasses = {
  xs: 'w-6 h-6 text-[10px]',
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-14 h-14 text-lg',
  xl: 'w-20 h-20 sm:w-24 sm:h-24 text-2xl',
  '2xl': 'w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 text-3xl',
};

const statusSizeClasses = {
  xs: 'w-2 h-2',
  sm: 'w-2.5 h-2.5',
  md: 'w-3 h-3',
  lg: 'w-3.5 h-3.5',
  xl: 'w-5 h-5',
  '2xl': 'w-6 h-6',
};

export default function UserAvatar({
  photoURL,
  name,
  email,
  size = 'md',
  className = '',
  showStatus = false,
  statusColor = 'bg-emerald-500',
  onClick
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);

  // Reset error state if photoURL changes
  useEffect(() => {
    setImgError(false);
  }, [photoURL]);

  const displayName = name || email || 'Student';
  const initial = displayName.trim().charAt(0).toUpperCase() || 'S';

  const avatarSize = sizeClasses[size] || sizeClasses.md;
  const statusSize = statusSizeClasses[size] || statusSizeClasses.md;

  const validPhoto = photoURL && !imgError && photoURL.trim().length > 0;

  return (
    <div 
      className={`relative shrink-0 inline-flex items-center justify-center select-none ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {validPhoto ? (
        <img
          src={photoURL!}
          alt={displayName}
          onError={() => setImgError(true)}
          className={`${avatarSize} rounded-full object-cover shadow-sm border border-slate-100/80 bg-slate-100 transition-all ${className}`}
        />
      ) : (
        <div
          className={`${avatarSize} rounded-full bg-gradient-to-tr from-primary via-indigo-600 to-cyan-500 text-white font-extrabold flex items-center justify-center shadow-sm border-2 border-white uppercase tracking-wider ${className}`}
        >
          {initial ? initial : <UserIcon size={16} />}
        </div>
      )}

      {showStatus && (
        <div
          className={`absolute bottom-0 right-0 ${statusSize} ${statusColor} border-2 border-white rounded-full flex items-center justify-center shadow-xs`}
        >
          <span className="w-1 h-1 bg-white rounded-full" />
        </div>
      )}
    </div>
  );
}
