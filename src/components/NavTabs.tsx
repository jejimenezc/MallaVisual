// src/components/NavTabs.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavTabs.css';
import { useProceedToMalla } from '../state/proceed-to-malla';

export const NavTabs: React.FC = () => {
  const { handler } = useProceedToMalla();
  const handleMallaClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    e.preventDefault();
    handler('/malla/design');
  };

  const handleRepoClick = (
    e: React.MouseEvent<HTMLAnchorElement, MouseEvent>
  ) => {
    if (handler) {
      e.preventDefault();
      handler('/blocks');
    }
  };

  return (
    <nav className="nav-tabs">
      <NavLink to="/" end>
        Escritorio
      </NavLink>
      <NavLink to="/block/design">Diseño de bloque</NavLink>
      <NavLink to="/blocks" onClick={handleRepoClick}>
        Repositorio de bloques
      </NavLink>
      <NavLink to="/malla/design" onClick={handleMallaClick}>
        Diseño de malla
      </NavLink>
    </nav>
  );
};