import { Component, type ErrorInfo, type ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Global safety net: a render error shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Kept local — nothing is transmitted. Visible in the console for debugging.
    console.error("App error boundary:", error, info.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <div className="eb">
          <div className="eb-card">
            <div className="eb-emoji">🎣</div>
            <h1>Une erreur est survenue</h1>
            <p>
              L'application a rencontré un problème inattendu. Vos données (carnet, spots, photos)
              restent enregistrées sur votre appareil.
            </p>
            <button className="eb-btn" onClick={() => window.location.reload()}>
              Recharger l'application
            </button>
            <details className="eb-details">
              <summary>Détail technique</summary>
              <pre>{this.state.error.message}</pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
