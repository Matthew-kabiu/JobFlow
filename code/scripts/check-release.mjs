import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const tag = process.argv[2];
assert.match(tag ?? "", /^v\d+\.\d+\.\d+$/, "Release tags must be vMAJOR.MINOR.PATCH");
const version = tag.slice(1);
for (const app of ["frontend", "backend"]) {
  const manifest = JSON.parse(readFileSync(new URL(`../${app}/package.json`, import.meta.url), "utf8"));
  const lock = JSON.parse(readFileSync(new URL(`../${app}/package-lock.json`, import.meta.url), "utf8"));
  assert.equal(manifest.version, version, `${app} manifest must match ${tag}`);
  assert.equal(lock.version, version, `${app} lockfile must match ${tag}`);
  assert.equal(lock.packages[""].version, version, `${app} lock root must match ${tag}`);
}
console.log(`Release manifests and lockfiles match ${tag}`);
