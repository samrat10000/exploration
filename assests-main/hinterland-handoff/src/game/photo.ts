// Photo mode data (screens.html → Photo mode, Postcard saved): lens table, a 640 px JPEG capture of the
// canvas, and the photos in IndexedDB (localStorage is too small). The Journal reads them back.
export const LENSES = [["Wide", 70], ["Normal", 50], ["Close", 28]] as const;
export interface Photo { id: number; name: string; url: string; t: number }

const open = () => new Promise<IDBDatabase>((res, rej) => {
  const r = indexedDB.open("hinterland-photos", 1);
  r.onupgradeneeded = () => r.result.createObjectStore("photos", { keyPath: "id" });
  r.onsuccess = () => res(r.result);
  r.onerror = () => rej(r.error);
});

export async function savePhoto(p: Photo) {
  try {
    const db = await open();
    await new Promise<void>((res, rej) => { const tx = db.transaction("photos", "readwrite"); tx.objectStore("photos").put(p); tx.oncomplete = () => res(); tx.onerror = () => rej(tx.error); });
  } catch { /* private window: the postcard still shows once */ }
}
export async function listPhotos(): Promise<Photo[]> {
  try {
    const db = await open();
    return await new Promise((res, rej) => { const q = db.transaction("photos").objectStore("photos").getAll(); q.onsuccess = () => res((q.result as Photo[]).sort((a, b) => b.t - a.t)); q.onerror = () => rej(q.error); });
  } catch { return []; }
}

/** The canvas as a 640 px wide JPEG data URL (the renderer keeps its buffer, see App.tsx). */
export function capture(canvas: HTMLCanvasElement) {
  const w = 640, h = Math.round((canvas.height / canvas.width) * w), c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d")!.drawImage(canvas, 0, 0, w, h);
  return c.toDataURL("image/jpeg", 0.82);
}
