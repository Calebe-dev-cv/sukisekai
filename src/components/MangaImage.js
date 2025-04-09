import React, { useState, useEffect, useRef } from 'react';

const MangaImage = ({ src, alt, className, style }) => {
  const [imgSrc, setImgSrc] = useState(src || '/padrao.png');
  const [loadAttempts, setLoadAttempts] = useState(0);
  const imgRef = useRef(null);
  
  useEffect(() => {
    setImgSrc(src || '/padrao.png');
    setLoadAttempts(0);
  }, [src]);
  
  const handleImageLoad = () => {
    console.log(`Imagem carregada: ${imgSrc}`);
    
    if (loadAttempts === 0) {
      setTimeout(() => {
        setImgSrc(`${src}?t=${Date.now()}`);
        setLoadAttempts(1);
      }, 50);
    }
  };
  
  const handleImageError = () => {
    if (loadAttempts === 0) {
      console.log(`Tentando recarregar com timestamp: ${src}`);
      setImgSrc(`${src}?t=${Date.now()}`);
      setLoadAttempts(1);
    } else if (loadAttempts === 1) {
      const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
      if (BACKEND_URL && src) {
        console.log(`Tentando com proxy alternativo: ${src}`);
        setImgSrc(`${BACKEND_URL}/proxy-alt?url=${encodeURIComponent(src)}&_t=${Date.now()}`);
        setLoadAttempts(2);
      } else {
        setImgSrc('/padrao.png');
      }
    } else {
      console.log(`Fallback para imagem padrão: ${src}`);
      setImgSrc('/padrao.png');
    }
  };
  
  return (
    <img
      ref={imgRef}
      src={imgSrc}
      alt={alt}
      className={className}
      style={style}
      onLoad={handleImageLoad}
      onError={handleImageError}
    />
  );
};

export default MangaImage;