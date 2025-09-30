// src/components/NavTabs.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavTabs.css';
import { useProceedToMalla } from '../state/proceed-to-malla';

export const NavTabs: React.FC = () => {
  const { handler } = useProceedToMalla();
  const shouldBypassCustomNavigation = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) =>
    event.defaultPrevented ||
    event.button !== 0 ||
    event.metaKey ||
    event.altKey ||
    event.ctrlKey ||
    event.shiftKey;

  const handleMallaClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    if (shouldBypassCustomNavigation(event)) return;
    const shouldPreventDefault = handler('/malla/design');
    if (shouldPreventDefault !== false) {
      event.preventDefault();
    }
  };

  const handleRepoClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    if (shouldBypassCustomNavigation(event)) return;
    const shouldPreventDefault = handler('/blocks');
    if (shouldPreventDefault !== false) {
      event.preventDefault();
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