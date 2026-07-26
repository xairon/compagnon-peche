// Reconnaissance-only script: for each {id, latin} in /tmp/missing-photos.json,
// query Wikimedia Commons for a free-licensed photo and print a candidate.
// Never writes to the manifest — a human reviews the report before curating it.
import { readFile, writeFile } from "node:fs/promises";

const UA = "CompagnonPeche/1.0 (offline fishing companion; personal project; research contact none)";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJSON(url, attempt = 0) {
  const res = await fetch(url, { headers: { "User-Agent": UA } });
  if (res.status === 429 || res.status === 503) {
    if (attempt >= 3) return null;
    await sleep(4000 * (attempt + 1));
    return getJSON(url, attempt + 1);
  }
  if (!res.ok) return null;
  return res.json();
}

const FREE_LICENSE_RE = /^(cc0|pd|public domain|cc-by(-sa)?-[0-9.]+)/i;

function normalizeLicense(shortName, licenseUrl) {
  if (!shortName) return null;
  const s = shortName.toLowerCase();
  if (s.includes("cc0")) return "CC0";
  if (s.includes("public domain") || s.includes("pd-")) return "Domaine public";
  const m = s.match(/cc[- ]by(-sa)?[- ]([0-9.]+)/);
  if (m) return `CC BY${m[1] ? "-SA" : ""} ${m[2]}`;
  return null; // unknown/non-free → reject
}

async function imageInfo(filename) {
  const title = encodeURIComponent(filename);
  const url = `https://commons.wikimedia.org/w/api.php?action=query&titles=${title}&prop=imageinfo&iiprop=extmetadata|url&format=json&origin=*`;
  const data = await getJSON(url);
  if (!data) return null;
  const pages = data.query?.pages;
  if (!pages) return null;
  const page = Object.values(pages)[0];
  if (!page || page.missing !== undefined) return null;
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata || {};
  const license = normalizeLicense(meta.LicenseShortName?.value, meta.LicenseUrl?.value);
  const author = (meta.Artist?.value || meta.Credit?.value || "").replace(/<[^>]+>/g, "").trim() || null;
  return { license, author, descriptionUrl: info.descriptionurl };
}

async function categoryFiles(latin) {
  const cat = latin.replace(/ /g, "_");
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=categorymembers&cmtitle=Category:${encodeURIComponent(cat)}&cmtype=file&cmlimit=10&format=json&origin=*`;
  const data = await getJSON(url);
  return (data?.query?.categorymembers || []).map((m) => m.title);
}

async function searchFiles(latin) {
  const url = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
    latin,
  )}&srnamespace=6&srlimit=8&format=json&origin=*`;
  const data = await getJSON(url);
  return (data?.query?.search || []).map((m) => m.title);
}

const missing = JSON.parse(await readFile(process.argv[2], "utf8"));

const report = [];
for (const sp of missing) {
  console.log(`— ${sp.id} (${sp.latin})`);
  let candidates = await categoryFiles(sp.latin);
  let source = "category";
  if (candidates.length === 0) {
    candidates = await searchFiles(sp.latin);
    source = "search";
  }
  let picked = null;
  for (const filename of candidates.slice(0, 6)) {
    const info = await imageInfo(filename);
    await sleep(400);
    if (info?.license) {
      picked = { filename, ...info };
      break;
    }
  }
  report.push({ ...sp, source, candidatesTried: candidates.length, picked });
  console.log(picked ? `   ✓ ${picked.filename} (${picked.license})` : "   ✗ aucune image libre trouvée");
  await sleep(300);
}

await writeFile(process.argv[3], JSON.stringify(report, null, 1));
console.log(`\nWrote ${process.argv[3]}`);
console.log("Trouvées:", report.filter((r) => r.picked).length, "/", report.length);
