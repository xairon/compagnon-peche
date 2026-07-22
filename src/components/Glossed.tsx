import { Fragment } from "react";
import { GLOSSARY } from "../data/glossary";
import { Tip } from "./Tip";

// Flatten terms + synonyms, longest first so multi-word terms win over their parts.
const ENTRIES = GLOSSARY.flatMap((g) =>
  [g.term, ...(g.alt || [])].map((m) => ({ match: m, def: g.def })),
).sort((a, b) => b.match.length - a.match.length);

const DEF_BY_MATCH = new Map(ENTRIES.map((e) => [e.match.toLowerCase(), e.def]));

const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Match a term only when flanked by non-letters (French-aware word boundary).
const RE = new RegExp(
  "(?<![A-Za-zÀ-ÿ])(" + ENTRIES.map((e) => escape(e.match)).join("|") + ")(?![A-Za-zÀ-ÿ])",
  "gi",
);

type Part = { text: string; def?: string };

function split(text: string): Part[] {
  const parts: Part[] = [];
  let last = 0;
  for (const m of text.matchAll(RE)) {
    const i = m.index ?? 0;
    if (i > last) parts.push({ text: text.slice(last, i) });
    const def = DEF_BY_MATCH.get(m[0].toLowerCase());
    parts.push({ text: m[0], def });
    last = i + m[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });
  return parts;
}

/** Renders text with known fishing terms turned into tappable definitions. */
export function Glossed({ children }: { children: string }) {
  const parts = split(children);
  return (
    <>
      {parts.map((p, i) =>
        p.def ? (
          <Tip key={i} text={p.def}>
            <span className="glossed">{p.text}</span>
          </Tip>
        ) : (
          <Fragment key={i}>{p.text}</Fragment>
        ),
      )}
    </>
  );
}
