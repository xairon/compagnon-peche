import { useRef, useState } from "react";
import { SPECIES_MEDIA } from "../data/media";

/**
 * Species photo gallery: shows all locally-embedded photos for `id` (adult,
 * juvenile…) with swipe + dots + a caption badge. Falls back to the striped
 * placeholder when there is no photo. One photo → renders like a plain image.
 */
export function Gallery({ id, placeholder, dark }: { id: string; placeholder: string; dark?: boolean }) {
  const photos = SPECIES_MEDIA[id] || [];
  const [i, setI] = useState(0);
  const [broken, setBroken] = useState<Record<string, boolean>>({});
  const startX = useRef(0);

  // Navigate only among photos that loaded — a single 404 is dropped from the
  // rotation (keyed by file path so indices stay stable as usable shrinks),
  // and the placeholder shows only when every photo is broken.
  const usable = photos.filter((p) => !broken[p.file]);
  if (!usable.length) return <div className={"img-slot" + (dark ? " dark" : "")}>{placeholder}</div>;

  const n = usable.length;
  const idx = ((i % n) + n) % n;
  const cur = usable[idx];
  const go = (d: number) => setI((v) => v + d);

  return (
    <div
      className="gallery"
      onTouchStart={(e) => (startX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        const dx = e.changedTouches[0].clientX - startX.current;
        if (n > 1 && Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
      }}
    >
      <img
        className="media-img"
        src={import.meta.env.BASE_URL + cur.file}
        alt={cur.caption ? `${placeholder} — ${cur.caption}` : placeholder}
        loading="lazy"
        decoding="async"
        onError={() => setBroken((b) => ({ ...b, [cur.file]: true }))}
      />
      {cur.caption && <span className="gallery-cap">{cur.caption}</span>}
      {n > 1 && (
        <>
          <button className="gallery-nav prev" onClick={() => go(-1)} aria-label="Photo précédente">
            ‹
          </button>
          <button className="gallery-nav next" onClick={() => go(1)} aria-label="Photo suivante">
            ›
          </button>
          <div className="gallery-dots" aria-hidden="true">
            {usable.map((p, k) => (
              <span key={p.file} className={"dot" + (k === idx ? " on" : "")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
