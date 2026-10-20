// Runs after `next build` (npm "postbuild").
//
// The static export writes per-segment prefetch data in folders, e.g.
//   out/counties/__next.counties/__PAGE__.txt
//   out/cities/AZCities/__next.cities/$d$stateName/__PAGE__.txt
// but the Next.js client requests them as flat names, with "/" replaced by ".":
//   /counties/__next.counties.__PAGE__.txt
//   /cities/AZCities/__next.cities.$d$stateName.__PAGE__.txt
// A static host has nothing at the flat path and returns 404, so prefetching
// fails and navigation falls back to full page loads. Copy each file to its
// flat name; the folder copies stay in place.
import { cpSync, readdirSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const outDir = 'out';
let copied = 0;

function filesUnder(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? filesUnder(path) : [path];
  });
}

function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const path = join(dir, entry.name);
    if (entry.name.startsWith('__next.')) {
      for (const file of filesUnder(path)) {
        const flat = `${entry.name}.${relative(path, file).split(sep).join('.')}`;
        cpSync(file, join(dir, flat));
        copied++;
      }
    } else if (path !== join(outDir, '_next')) {
      walk(path);
    }
  }
}

walk(outDir);
console.log(`flatten-segment-data: wrote ${copied} flat segment files`);
