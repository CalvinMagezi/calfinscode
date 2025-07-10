import React from 'react';

export interface CalfinsLogoProps {
  className?: string;
  useIcon?: boolean;
}

const CalfinsLogo: React.FC<CalfinsLogoProps> = ({ className = 'w-5 h-5', useIcon = false }) => {
  const src = useIcon ? "/icon.png" : "/logo2.png";
  return (
    <img src={src} alt="Calfins Code" className={className} />
  );
};

export default CalfinsLogo;