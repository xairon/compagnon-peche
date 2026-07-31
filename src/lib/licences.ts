// Link to the licence text, not just its name.
//
// CC BY and CC BY-SA make it a *condition* of redistribution that the licence
// be identified and linked; "CC BY-SA 4.0" printed as bare characters does not
// tell a reader what they may do with the photo. Derived from the licence
// string rather than stored on each of the 189 media entries: one rule, and a
// new entry is covered the moment it lands.
//
// Deliberately returns null rather than guessing. A wrong licence URL misstates
// the terms under which someone else's work is offered, which is worse than no
// link at all — licences.test.ts fails if the corpus grows a string this does
// not recognise.

const CC = "https://creativecommons.org/licenses/";

/** "CC BY-SA 3.0 de" → .../by-sa/3.0/de/ ; null when no licence text applies. */
export function licenceUrl(license: string): string | null {
  const t = license.trim();

  if (/^CC0\b/i.test(t)) return "https://creativecommons.org/publicdomain/zero/1.0/";

  // Wikimedia Commons' {{Attribution}}: free for any purpose provided the
  // author is credited, but not a Creative Commons licence — point at the
  // template that actually states the terms.
  if (/^Attribution\b/i.test(t)) return "https://commons.wikimedia.org/wiki/Template:Attribution";

  // CC BY[-SA] <version> [<jurisdiction>]. The jurisdiction port is its own
  // legal text, so it must survive into the URL.
  const m = /^CC\s+BY(-SA)?\s+(\d\.\d)(?:\s+([a-z]{2}))?$/i.exec(t);
  if (m) {
    const kind = m[1] ? "by-sa" : "by";
    const port = m[3] ? `${m[3].toLowerCase()}/` : "";
    return `${CC}${kind}/${m[2]}/${port}`;
  }

  // "Domaine public" and anything unrecognised.
  return null;
}
