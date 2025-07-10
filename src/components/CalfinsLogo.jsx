import React from 'react';

const CalfinsLogo = ({className = 'w-5 h-5', useIcon = false}) => {
  const src = useIcon ? "/icon.png" : "/logo2.png";
  return (
    <img src={src} alt="Calfins Code" className={className} />
  );
};

export default CalfinsLogo;