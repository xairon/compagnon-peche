// React contexts backing the store — split out from store.tsx so that file
// only exports the StoreProvider component (react-refresh/only-export-components
// requires a component file's exports to stay component-only; useStore/useActions
// live in store-hooks.ts for the same reason).
import { createContext } from "react";
import type { AppState, Actions } from "./store";

// Split contexts: state changes on every dispatch, actions never do. Components
// that only fire actions (useActions) don't re-render on state changes, and the
// action references are stable so child memoization and effect deps hold.
export const StateCtx = createContext<AppState | null>(null);
export const ActionsCtx = createContext<Actions | null>(null);
