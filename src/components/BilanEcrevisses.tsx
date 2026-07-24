import type { CrayfishSession } from "../types";

export function BilanEcrevisses({
  session,
  onClose,
}: {
  session: CrayfishSession;
  onClose: () => void;
}) {
  return (
    <div className="screen">
      <div className="pad">
        <div className="h1">Bilan — {session.lieu}</div>
        <button className="btn-light" onClick={onClose}>
          Retour
        </button>
      </div>
    </div>
  );
}
