// src/components/NavTabs.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavTabs.css';
import { useProceedToMalla } from '../state/proceed-to-malla';

interface NavTabsProps {
  isProjectActive: boolean;
}

export const NavTabs: React.FC<NavTabsProps> = ({ isProjectActive }) => {
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
    if (!isProjectActive) {
      event.preventDefault();
      return;
    }
    if (shouldBypassCustomNavigation(event)) return;
    event.preventDefault();
    void handler('/malla/design');
  };

  const handleRepoClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    if (!isProjectActive) {
      event.preventDefault();
      return;
    }
    if (shouldBypassCustomNavigation(event)) return;
    event.preventDefault();
    void handler('/blocks');
  };

  const handleBlockClick = (
    event: React.MouseEvent<HTMLAnchorElement, MouseEvent>,
  ) => {
    if (isProjectActive) return;
    event.preventDefault();
  };

  return (
    <nav className={`nav-tabs${isProjectActive ? '' : ' nav-tabs--disabled'}`}>
      <NavLink to="/" end>
        Escritorio
      </NavLink>
      <NavLink to="/block/design" onClick={handleBlockClick}>
        Diseño de bloque
      </NavLink>
      <NavLink to="/blocks" onClick={handleRepoClick}>
        Repositorio de bloques
      </NavLink>
      <NavLink to="/malla/design" onClick={handleMallaClick}>
        Diseño de malla
      </NavLink>
    </nav>
  );
};