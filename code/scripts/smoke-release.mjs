import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createRequire } from "node:module";

// Existing project test dependency; no browser binary or external tool is installed.
const require = createRequire(new URL("../frontend/package.json", import.meta.url));
const { JSDOM, VirtualConsole } = require("jsdom");
const version = process.argv[2];
assert.match(version ?? "", /^\d+\.\d+\.\d+$/);
const images = ["jobflow-frontend", "jobflow-backend"];
const prefix = `jobflow-release-smoke-${process.pid}`;
const network = `${prefix}-network`;
const backend = `${prefix}-backend`;
const frontend = `${prefix}-frontend`;
const marker = "Release runtime branding";
const anonymous = mkdtempSync(join(tmpdir(), "jobflow-anonymous-"));
writeFileSync(join(anonymous, "config.json"), JSON.stringify({ auths: {} }));
const started = [];
let createdNetwork = false;
let dom;
const docker = (...args) => execFileSync("docker", args, { encoding: "utf8", timeout: 120_000 });
const pause = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

try {
  for (const image of images) {
    const repository = `matthew-kabiu/${image}`;
    const tokenResponse = await fetch(`https://ghcr.io/token?scope=repository:${repository}:pull`, { signal: AbortSignal.timeout(20_000) });
    assert.equal(tokenResponse.status, 200, `${image} anonymous token`);
    const { token } = await tokenResponse.json();
    assert.ok(token);
    const manifest = await fetch(`https://ghcr.io/v2/${repository}/manifests/${version}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.oci.image.index.v1+json" },
      signal: AbortSignal.timeout(20_000),
    });
    assert.equal(manifest.status, 200, `${image} anonymous manifest`);
    console.log(`Passed: ${image}:${version} anonymous manifest HTTP 200`);
    // Separate empty auth config proves pulls do not depend on the publish login.
    process.stdout.write(docker("--config", anonymous, "pull", `ghcr.io/${repository}:${version}`));
  }

  docker("network", "create", network);
  createdNetwork = true;
  docker("run", "-d", "--name", backend, "--network", network, "--network-alias", "backend",
    "-e", "BACKEND_HOST=0.0.0.0", "-e", "BACKEND_PORT=3000",
    "-e", `PUBLIC_COMPANY_NAME=${marker}`, "-e", "PUBLIC_COMPANY_URL=https://example.org/runtime-company",
    "-e", "PUBLIC_REPO_URL=https://example.org/runtime-repo", "-e", "HIMALAYAS_API_KEY=smoke-not-a-real-key",
    `ghcr.io/matthew-kabiu/jobflow-backend:${version}`);
  started.push(backend);
  docker("run", "-d", "--name", frontend, "--network", network,
    "-p", "127.0.0.1::80", "-e", "BACKEND_ORIGIN=http://backend:3000",
    "-e", "NGINX_ENVSUBST_FILTER=BACKEND_ORIGIN", `ghcr.io/matthew-kabiu/jobflow-frontend:${version}`);
  started.push(frontend);
  const port = docker("port", frontend, "80/tcp").trim().split(":").at(-1);
  const origin = `http://127.0.0.1:${port}/`;
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt++) {
    try {
      const response = await fetch(new URL("api/v1/config", origin), { signal: AbortSignal.timeout(2000) });
      if (response.ok) { ready = true; break; }
    } catch { /* Wait only for this isolated test stack. */ }
    await pause(500);
  }
  assert.ok(ready, "Published stack did not become ready");
  const home = await fetch(origin);
  assert.equal(home.status, 200);
  const html = await home.text();
  assert.ok(!html.includes(marker), "Runtime branding must not be baked into static HTML");
  assert.equal((await fetch(new URL("health", origin))).status, 200);
  const config = await (await fetch(new URL("api/v1/config", origin))).json();
  assert.equal(config.data.version, version);
  assert.equal(config.data.companyName, marker);
  assert.ok(!JSON.stringify(config).includes("smoke-not-a-real-key"));
  const health = JSON.parse(docker("exec", backend, "node", "-e",
    "fetch('http://127.0.0.1:3000/health').then(async r=>{if(!r.ok)process.exit(1);console.log(JSON.stringify(await r.json()))}).catch(()=>process.exit(1))"));
  assert.equal(health.data.version, version);

  const browserErrors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (error) => { if (!error.message.includes("CSS")) browserErrors.push(error.message); });
  // Vite's entry bundle is self-contained. jsdom executes it as a classic script;
  // this checks production DOM behavior, not visual layout or screenshots.
  dom = new JSDOM(html.replace('type="module"', ""), {
    url: origin, resources: "usable", runScripts: "dangerously", pretendToBeVisual: true, virtualConsole,
    beforeParse(window) {
      window.fetch = (url, options) => fetch(new URL(url, window.location.href), options);
      window.AbortController = globalThis.AbortController;
      window.AbortSignal = globalThis.AbortSignal;
      window.TextEncoder = globalThis.TextEncoder;
      window.TextDecoder = globalThis.TextDecoder;
      window.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} };
      window.matchMedia = (media) => ({ matches: false, media, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {} });
      window.Element.prototype.scrollIntoView = () => {};
    },
  });
  let rendered = false;
  for (let attempt = 0; attempt < 200; attempt++) {
    const text = dom.window.document.body.textContent;
    if (text.includes(marker) && text.includes(`v${version}`)) { rendered = true; break; }
    await pause(100);
  }
  assert.ok(rendered, `Production bundle did not render runtime configuration: ${browserErrors.join("; ")}`);
  assert.ok([...dom.window.document.querySelectorAll("a")].some((link) => link.href === "https://example.org/runtime-repo"));
  assert.ok(dom.window.document.querySelector('[aria-label="Appearance"]'), "Theme control missing from published UI");
  assert.ok(dom.window.document.querySelector(".filter-panel-wide"), "Landing job-filter form missing");
  assert.ok(!dom.window.document.body.textContent.includes("smoke-not-a-real-key"));
  const currenciesResponse = await fetch(new URL("api/v1/currencies", origin), { signal: AbortSignal.timeout(20_000) });
  assert.equal(currenciesResponse.status, 200);
  const currencies = await currenciesResponse.json();
  assert.ok(currencies.data.currencies.some((currency) => currency.code === "KES"));
  assert.ok(!currencies.data.currencies.some((currency) => currency.code === "BTC"));
  console.log(`Passed: published ${version} images, home/health/config/currencies and runtime-config DOM rendering`);
} finally {
  dom?.window.close();
  for (const name of started.reverse()) {
    try { docker("rm", "-f", name); } catch { /* Preserve the original test error. */ }
  }
  if (createdNetwork) { try { docker("network", "rm", network); } catch { /* CI runner is disposable. */ } }
  rmSync(anonymous, { recursive: true, force: true });
}
