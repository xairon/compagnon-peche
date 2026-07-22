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
  const [broken, setBroken] = useState<Record<number, boolean>>({});
  const startX = useRef(0);

  const usable = photos.filter((_, k) => !broken[k]);
  if (!usable.length) return <div className={"img-slot" + (dark ? " dark" : "")}>{placeholder}</div>;

  const n = photos.length;
  const idx = ((i % n) + n) % n;
  const cur = photos[idx];
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
        onError={() => setBroken((b) => ({ ...b, [idx]: true }))}
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
            {photos.map((_, k) => (
              <span key={k} className={"dot" + (k === idx ? " on" : "")} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
