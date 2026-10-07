import { Component, type ErrorInfo, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

/**
 * Catches render-time crashes so a failure never leaves a blank screen.
 * Reports to the console only — there is no error-tracking service in this
 * single-user app, and adding one would be an external dependency.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Error no controlado:', error, info.componentStack);
  }

  override render(): ReactNode {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="state" role="alert">
        <h2 className="state__title">Algo ha ido mal</h2>
        <p className="state__hint">
          La aplicación ha fallado al mostrar esta pantalla. Recarga para volver a empezar.
        </p>
        <button type="button" className="add-button" onClick={() => window.location.reload()}>
          Recargar
        </button>
      </div>
    );
  }
}
