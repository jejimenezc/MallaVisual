// src/components/NavTabs.tsx
import React from 'react';
import { NavLink } from 'react-router-dom';
import './NavTabs.css';

export const NavTabs: React.FC = () => {
  return (
    <nav className="nav-tabs">
      <NavLink to="/" end>
        Escritorio
      </NavLink>
      <NavLink to="/block/design">Diseño de bloque</NavLink>
      <NavLink to="/blocks">Repositorio de bloques</NavLink>
      <NavLink to="/malla/design">Diseño de malla</NavLink>
    </nav>
  );
};