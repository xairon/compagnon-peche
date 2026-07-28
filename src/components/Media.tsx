import { thumbOf } from "../lib/thumbs";
import { useState } from "react";
import { MEDIA_BY_KIND } from "./media-helpers";

interface MediaProps {
  kind: "species" | "knot" | "recipe" | "technique" | "gear" | "crayfish";
  id: string;
  placeholder: string;
  dark?: boolean;
  /** Opt out of lazy loading for screens where it actively hurts: a handful of
   *  local images (offline-first, no network cost) rendered tall enough that
   *  the below-the-fold ones sit unloaded — showing the same flat placeholder
   *  background as "no photo", which reads as a missing image rather than a
   *  scroll-triggered one. Species grids (129 images) keep the lazy default. */
  eager?: boolean;
}

/**
 * Renders a locally-embedded, free-licensed photo when we have one for `id`,
 * otherwise the striped placeholder. Attribution lives on the Crédits screen.
 */
export function Media({ kind, id, placeholder, dark, eager }: MediaProps) {
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
        loading={eager ? "eager" : "lazy"}
        decoding="async"
        onError={() => setFailed(true)}
      />
    );
  }
  // No entry, or the file failed to load → striped placeholder (never a broken-image icon).
  return <div className={"img-slot" + (dark ? " dark" : "")}>{placeholder}</div>;
}
