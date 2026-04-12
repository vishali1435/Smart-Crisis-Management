import logoImage from '@/assets/logo.png';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showTagline?: boolean;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', showTagline = false }) => {
  const sizeClasses = {
    sm: 'h-10',
    md: 'h-14',
    lg: 'h-20',
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <img 
        src={logoImage} 
        alt="SMART CRISIS Management" 
        className={`${sizeClasses[size]} w-auto object-contain`}
      />
      {showTagline && (
        <p className="text-sm text-muted-foreground italic">
          "Together Through Crisis"
        </p>
      )}
    </div>
  );
};

export default Logo;
