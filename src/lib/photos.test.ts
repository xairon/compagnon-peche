import { describe, it, expect, vi, beforeEach } from "vitest";

// savePhoto must never let a caller believe a write succeeded when it didn't:
// the catch/avatar/recipe would end up pointing at a photo blob that isn't
// there. idb-keyval and the persist-error reporter are mocked so we can force
// a write failure without touching real IndexedDB.

const { set, get, del } = vi.hoisted(() => ({
  set: vi.fn(),
  get: vi.fn(),
  del: vi.fn(),
}));
vi.mock("idb-keyval", () => ({ set, get, del }));

const { reportPersistError, clearPersistError } = vi.hoisted(() => ({
  reportPersistError: vi.fn(),
  clearPersistError: vi.fn(),
}));
vi.mock("./storage", () => ({ reportPersistError, clearPersistError }));

beforeEach(() => {
  set.mockReset();
  get.mockReset();
  del.mockReset();
  reportPersistError.mockReset();
  clearPersistError.mockReset();
});

describe("savePhoto", () => {
  it("écrit le blob et efface une éventuelle erreur affichée, quand ça réussit", async () => {
    set.mockResolvedValue(undefined);
    const { savePhoto } = await import("./photos");
    const blob = new Blob(["x"]);
    await savePhoto("photo:a", blob);
    expect(set).toHaveBeenCalledWith("photo:a", blob);
    expect(clearPersistError).toHaveBeenCalled();
    expect(reportPersistError).not.toHaveBeenCalled();
  });

  it("relance l'erreur quand l'écriture échoue — l'appelant ne doit jamais croire que ça a marché", async () => {
    const err = new DOMException("quota", "QuotaExceededError");
    set.mockRejectedValue(err);
    const { savePhoto } = await import("./photos");
    await expect(savePhoto("photo:a", new Blob(["x"]))).rejects.toBe(err);
  });

  it("signale aussi l'échec au bandeau global (cohérence avec les autres écritures)", async () => {
    const err = new DOMException("quota", "QuotaExceededError");
    set.mockRejectedValue(err);
    const { savePhoto } = await import("./photos");
    await expect(savePhoto("photo:a", new Blob(["x"]))).rejects.toThrow();
    expect(reportPersistError).toHaveBeenCalledWith(err);
    expect(clearPersistError).not.toHaveBeenCalled();
  });
});
