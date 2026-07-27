import { thumbOf } from "../lib/thumbs";
import { useState } from "react";
import { MEDIA_BY_KIND } from "./media-helpers";

interface MediaProps {
  kind: "species" | "knot" | "recipe" | "technique" | "gear";
  id: string;
  placeholder: string;
  dark?: boolean;
}

/**
 * Renders a locally-embedded, free-licensed photo when we have one for `id`,
 * otherwise the striped placeholder. Attribution lives on the Crédits screen.
 */
export function Media({ kind, id, placeholder, dark }: MediaProps) {
  const [failed, setFailed] = useState(false);
  // Species now carry an array of photos (gallery); single-image contexts use the first.
  const raw = MEDIA_BY_KIND[kind][id];
  const entry = Array.isArray(raw) ? raw[0] : raw;
  if (entry && !failed) {
    // Every Media use is a tile (grids, carousel, confusions) — the fiche hero
    // goes through Gallery. Tiles take the precached thumbnail, which is what
    // keeps the lists working offline without an 11 MB first install.
    const file = kind === "species" ? thumbOf(entry.file) : entry.file;
    return (
      <img
        className="media-img"
        src={import.meta.env.BASE_URL + file}
        alt={placeholder}
        loading="lazy"
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  // No entry, or the file failed to load → striped placeholder (never a broken-image icon).
  return <div className={"img-slot" + (dark ? " dark" : "")}>{placeholder}</div>;
}
