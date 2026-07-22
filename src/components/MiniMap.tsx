import { BASEMAPS } from "../lib/basemaps";

// A lightweight static minimap: a 3×3 grid of IGN raster tiles centred on the
// point, with a pin — no MapLibre, so it stays out of the startup bundle. Tiles
// are the same XYZ scheme MapLibre uses and are cached by the service worker.
const TILE = 256;
const TPL = BASEMAPS.plan.tiles as string;

function tileUrl(z: number, x: number, y: number): string {
  return TPL.replace("{z}", String(z)).replace("{x}", String(x)).replace("{y}", String(y));
}

export function MiniMap({
  lat,
  lon,
  zoom = 13,
  onClick,
}: {
  lat: number;
  lon: number;
  zoom?: number;
  onClick?: () => void;
}) {
  const z = zoom;
  const n = 2 ** z;
  const x = ((lon + 180) / 360) * n;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n;
  const fx = Math.floor(x);
  const fy = Math.floor(y);

  const tiles: { key: string; url: string; left: number; top: number }[] = [];
  for (let di = -1; di <= 1; di++) {
    for (let dj = -1; dj <= 1; dj++) {
      const tx = fx + di;
      const ty = fy + dj;
      if (tx < 0 || ty < 0 || tx >= n || ty >= n) continue;
      tiles.push({
        key: `${tx}-${ty}`,
        url: tileUrl(z, tx, ty),
        left: (tx - x) * TILE,
        top: (ty - y) * TILE,
      });
    }
  }

  return (
    <button className="minimap" onClick={onClick} aria-label="Ouvrir la carte">
      <div className="minimap-tiles">
        {tiles.map((t) => (
          <img
            key={t.key}
            src={t.url}
            alt=""
            width={TILE}
            height={TILE}
            loading="lazy"
            decoding="async"
            style={{ left: `calc(50% + ${t.left}px)`, top: `calc(50% + ${t.top}px)` }}
          />
        ))}
      </div>
      <div className="minimap-grad" />
      <span className="minimap-pin" aria-hidden="true">
        <span className="dot" />
        <span className="pulse" />
      </span>
      <span className="minimap-attr">Plan IGN</span>
    </button>
  );
}
