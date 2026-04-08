import React, { useEffect, useRef } from 'react';
import './IntroOverlay.css';

interface Props {
  onClose: () => void;
}

export const IntroOverlay: React.FC<Props> = ({ onClose }) => {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeButtonRef.current?.focus();
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="intro-overlay" role="presentation">
      <div
        className="intro-content"
        role="dialog"
        aria-modal="true"
        aria-labelledby="intro-overlay-title"
        aria-describedby="intro-overlay-description"
      >
        <h2 id="intro-overlay-title">Bienvenido</h2>
        <p id="intro-overlay-description">
          Usa esta aplicación para crear bloques y organizar tu malla curricular.
          Comienza con <strong>Nuevo bloque</strong> o carga un archivo existente.
        </p>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Cerrar introducción y comenzar"
        >
          Comenzar
        </button>
      </div>
    </div>
  );
};

export default IntroOverlay;
