import { Component, type ErrorInfo, type ReactNode } from "react";
import { lienSignalement, rapportDiagnostic } from "../lib/diagnostic";

interface State {
  error: Error | null;
  /** Component stack from componentDidCatch — says WHICH screen died, which the
   *  message alone rarely does. */
  stack: string | null;
}

/** Global safety net: a render error shows a recovery screen instead of a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null, stack: null };

  static getDerivedStateFromError(error: Error): State {
    return { error, stack: null };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Still nothing transmitted automatically — the privacy promise holds. The
    // stack is kept in state so the USER can choose to send it.
    console.error("App error boundary:", error, info.componentStack);
    this.setState({ stack: info.componentStack ?? null });
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
            {/* Somewhere to send it. A minified message in a <details> that
                cannot be selected on a phone is not a diagnostic — it is a
                dead end for the user and silence for the maintainer. */}
            <p className="eb-report">
              <a
                href={lienSignalement({ ecran: "crash", detail: this.state.error.message })}
                target="_blank"
                rel="noreferrer"
              >
                Signaler ce problème ↗
              </a>
            </p>
            <details className="eb-details">
              <summary>Détail technique</summary>
              <pre>
                {rapportDiagnostic({ ecran: "crash", detail: this.state.error.message })}
                {this.state.stack ? `\n\n${this.state.stack}` : ""}
              </pre>
            </details>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
