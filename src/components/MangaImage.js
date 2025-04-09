import React, { useState, useEffect } from 'react';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

const MangaImage = ({ src, alt, className, style }) => {
  const [imgSrc, setImgSrc] = useState('');
  
  useEffect(() => {
    if (!src) {
      setImgSrc('/padrao.png');
      return;
    }
    
    if (src.startsWith('http')) {
      const timestamp = Date.now();
      setImgSrc(`${BACKEND_URL}/proxy?url=${encodeURIComponent(src)}&_t=${timestamp}`);
    } else {
      setImgSrc(src);
    }
  }, [src]);
  
  const handleError = () => {
    console.log(`Erro ao carregar imagem: ${src}`);
    setImgSrc('/padrao.png');
  };
  
  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      onError={handleError}
    />
  );
};

export default MangaImage;