import React from 'react';
import type { ErrorInfo, JSX, ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { logAppError, type AppErrorScope } from './logger.ts';
import styles from './RuntimeErrorBoundary.module.css';

interface BoundaryFallbackApi {
  reset: () => void;
}

interface BoundaryProps {
  scope: AppErrorScope;
  title: string;
  message: string;
  children: ReactNode;
  fallback?: (api: BoundaryFallbackApi) => ReactNode;
}

interface BoundaryState {
  hasError: boolean;
}

class AppErrorBoundary extends React.Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false };

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: ErrorInfo): void {
    logAppError({
      scope: this.props.scope,
      severity: 'fatal',
      message: `Boundary capturo un fallo en ${this.props.scope}.`,
      error,
      context: {
        componentStack: info.componentStack,
      },
    });
  }

  private reset = () => {
    this.setState({ hasError: false });
  };

  render(): ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    if (this.props.fallback) {
      return this.props.fallback({ reset: this.reset });
    }

    return (
      <RuntimeErrorFallback
        title={this.props.title}
        message={this.props.message}
        actions={[
          {
            label: 'Reintentar',
            onClick: this.reset,
            primary: true,
          },
        ]}
      />
    );
  }
}

interface RuntimeErrorFallbackAction {
  label: string;
  onClick: () => void;
  primary?: boolean;
}

interface RuntimeErrorFallbackProps {
  title: string;
  message: string;
  actions: RuntimeErrorFallbackAction[];
}

export function RuntimeErrorFallback({
  title,
  message,
  actions,
}: RuntimeErrorFallbackProps): JSX.Element {
  return (
    <section className={styles.fallback} role="alert" aria-live="assertive">
      <h2 className={styles.title}>{title}</h2>
      <p className={styles.message}>{message}</p>
      <div className={styles.actions}>
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className={`${styles.button} ${action.primary ? styles.buttonPrimary : ''}`.trim()}
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </div>
    </section>
  );
}

export function EditorErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <AppErrorBoundary
      scope="editor"
      title="La zona de edicion fallo"
      message="El fallo quedo aislado. Puedes volver al inicio o recargar esta seccion sin perder el shell global."
      fallback={({ reset }) => (
        <RuntimeErrorFallback
          title="La zona de edicion fallo"
          message="El fallo quedo aislado. Puedes volver al inicio o recargar esta seccion sin perder el shell global."
          actions={[
            {
              label: 'Reintentar',
              onClick: reset,
              primary: true,
            },
            {
              label: 'Ir al inicio',
              onClick: () => navigate('/'),
            },
            ...(location.pathname !== '/block/design'
              ? [
                  {
                    label: 'Ir a bloques',
                    onClick: () => navigate('/block/design'),
                  },
                ]
              : []),
          ]}
        />
      )}
    >
      {children}
    </AppErrorBoundary>
  );
}

export function ViewerErrorBoundary({ children }: { children: ReactNode }): JSX.Element {
  const navigate = useNavigate();

  return (
    <AppErrorBoundary
      scope="viewer"
      title="La vista previa o publicacion fallo"
      message="El fallo quedo aislado. Puedes volver al editor o reintentar esta vista."
      fallback={({ reset }) => (
        <RuntimeErrorFallback
          title="La vista previa o publicacion fallo"
          message="El fallo quedo aislado. Puedes volver al editor o reintentar esta vista."
          actions={[
            {
              label: 'Reintentar',
              onClick: reset,
              primary: true,
            },
            {
              label: 'Volver al editor',
              onClick: () => navigate('/malla/design'),
            },
            {
              label: 'Ir al inicio',
              onClick: () => navigate('/'),
            },
          ]}
        />
      )}
    >
      {children}
    </AppErrorBoundary>
  );
}
