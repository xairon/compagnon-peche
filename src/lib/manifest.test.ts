import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it, expect } from "vitest";
import { MANIFEST } from "./manifest";
import { IDENTITE } from "../data/mentions-legales";

// Un lien vers l'app envoyé par WhatsApp entre pêcheurs s'affichait comme une
// URL nue : aucune balise `og:` dans index.html. Le partage entre pêcheurs est
// le seul canal de diffusion d'une app qui n'est pas dans un store — la laisser
// se présenter comme « xairon.github.io/… » lui coûte tous ses lecteurs.
//
// Ces balises vivent dans un fichier HTML statique, donc rien ne les relie au
// manifeste ni au reste de l'app : ce test est ce lien. Le manifeste, lui, est
// sorti de vite.config.ts pour la même raison que la CSP (src/lib/csp.ts) et
// que les délais du service worker (src/lib/sw-delais.ts) — une valeur qu'on ne
// peut pas tester est une valeur qui dérive.

const html = readFileSync(resolve(process.cwd(), "index.html"), "utf8");

/** Contenu d'une balise meta, qu'elle porte `property` (og) ou `name` (twitter). */
function meta(cle: string): string | null {
  const re = new RegExp(`<meta[^>]*(?:property|name)="${cle}"[^>]*content="([^"]*)"`, "i");
  return re.exec(html)?.[1] ?? null;
}

describe("balises de partage (index.html)", () => {
  it("porte les cinq balises Open Graph qu'un aperçu de lien exige", () => {
    for (const cle of ["og:title", "og:description", "og:image", "og:type", "og:url"]) {
      expect(meta(cle), cle).toBeTruthy();
    }
  });

  it("porte les balises twitter: correspondantes", () => {
    expect(meta("twitter:card")).toBeTruthy();
    expect(meta("twitter:title")).toBeTruthy();
    expect(meta("twitter:description")).toBeTruthy();
    expect(meta("twitter:image")).toBeTruthy();
  });

  it("donne des URL absolues, seules exploitables par un moissonneur d'aperçu", () => {
    // Un `og:image` relatif n'est résolu par aucune des messageries qui
    // comptent ici : la vignette ne s'affiche tout simplement pas.
    expect(meta("og:url")).toMatch(/^https:\/\//);
    expect(meta("og:image")).toMatch(/^https:\/\//);
    expect(meta("twitter:image")).toMatch(/^https:\/\//);
  });

  it("pointe vers l'adresse du service, pas vers une autre", () => {
    // La même URL que les mentions légales, vérifiée à la source le 31/07/2026.
    // Deux adresses canoniques dans une app, c'est une de trop.
    expect(meta("og:url")).toBe(IDENTITE.siteUrl);
    expect(meta("og:image")?.startsWith(IDENTITE.siteUrl)).toBe(true);
  });

  it("annonce une image qui existe vraiment dans public/", () => {
    // Une vignette annoncée et absente donne un aperçu cassé, pire qu'une URL
    // nue : le lien a l'air mort.
    const fichier = meta("og:image")!.slice(IDENTITE.siteUrl.length);
    expect(() => readFileSync(resolve(process.cwd(), "public", fichier))).not.toThrow();
  });

  it("dit la même chose que le manifeste, pour ne pas décrire deux apps", () => {
    expect(meta("og:title")).toContain(MANIFEST.name);
    expect(meta("og:description")).toBe(MANIFEST.description);
  });
});

describe("MANIFEST", () => {
  it("porte un `id` stable, pour que l'app installée reste la même", () => {
    // Sans `id`, l'identité de l'app installée est déduite de start_url : la
    // changer un jour ferait apparaître une SECONDE app à côté de la première,
    // avec son propre stockage — donc un carnet de prises devenu invisible.
    expect(MANIFEST.id).toBeTruthy();
  });

  it("garde une icône maskable, sinon Android rogne l'icône dans sa forme", () => {
    expect(MANIFEST.icons.some((i) => i.purpose === "maskable")).toBe(true);
  });

  it("n'annonce que des icônes réellement présentes dans public/", () => {
    for (const i of MANIFEST.icons) {
      expect(() => readFileSync(resolve(process.cwd(), "public", i.src)), i.src).not.toThrow();
    }
  });

  it("n'annonce aucune capture d'écran fantôme", () => {
    // `screenshots` enrichit la fenêtre d'installation de Chrome, mais une
    // capture déclarée et absente la casse. Tant qu'il n'y a pas de vraies
    // captures, il ne doit pas y en avoir de déclarées.
    for (const s of MANIFEST.screenshots ?? []) {
      expect(() => readFileSync(resolve(process.cwd(), "public", s.src)), s.src).not.toThrow();
    }
  });
});
