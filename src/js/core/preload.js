/**
 * Loads + decodes the images the WebGL stage needs, reporting real progress.
 * Resolves with a Map(url → HTMLImageElement). Failures resolve as null so a
 * single broken file never blocks the experience.
 */
export function preloadImages(urls, onProgress = () => {}) {
  let done = 0;
  const map = new Map();
  const tick = () => onProgress(++done / urls.length);
  return Promise.all(
    urls.map(
      (url) =>
        new Promise((resolve) => {
          const img = new Image();
          img.decoding = 'async';
          img.onload = async () => {
            try { await img.decode(); } catch (e) { /* already decoded */ }
            map.set(url, img); tick(); resolve();
          };
          img.onerror = () => { map.set(url, null); tick(); resolve(); };
          img.src = url;
        })
    )
  ).then(() => map);
}
