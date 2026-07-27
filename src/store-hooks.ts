// useStore/useActions, split out of store.tsx so that file only exports the
// StoreProvider component (react-refresh/only-export-components requires a
// component file's exports to stay component-only).
import { useContext } from "react";
import type { Actions, Store } from "./store";
import { StateCtx, ActionsCtx } from "./store-context";

/** Full store (state + actions). Re-renders on every state change. */
export function useStore(): Store {
  const state = useContext(StateCtx);
  const actions = useContext(ActionsCtx);
  if (!state || !actions) throw new Error("useStore must be used within StoreProvider");
  return { state, ...actions };
}

/** Actions only — never re-renders on state changes (stable references). Use in
 *  components that fire actions but don't read state. */
export function useActions(): Actions {
  const actions = useContext(ActionsCtx);
  if (!actions) throw new Error("useActions must be used within StoreProvider");
  return actions;
}
