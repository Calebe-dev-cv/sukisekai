import React, { useState, useEffect } from 'react';

const ImageFrame = ({ src, alt, className, style }) => {
  const [error, setError] = useState(false);
  
  if (!src || error) {
    return <img src="/padrao.png" alt={alt} className={className} style={style} />;
  }

  return (
    <div 
      className={className} 
      style={{
        ...style,
        overflow: 'hidden',
        position: 'relative'
      }}
    >
      <img 
        src={src}
        alt={alt}
        onError={() => setError(true)}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover'
        }}
      />
    </div>
  );
};

export default ImageFrame;