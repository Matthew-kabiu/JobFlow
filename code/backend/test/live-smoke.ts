// Explicit opt-in only: real, public, no-key provider requests. Never part of npm test.
import assert from "node:assert/strict";
import { buildApp } from "../src/app.js";
import { createProviders } from "../src/providers.js";
import { createJsonFetcher } from "../src/http.js";

const app = await buildApp(createProviders(createJsonFetcher()));
try {
  const response = await app.inject({ method: "POST", url: "/api/v1/jobs/search", payload: { keyword: "engineer", country_code: "ke" } });
  const body = response.json();
  console.log(JSON.stringify({ statusCode: response.statusCode, count: body.data?.count, providers: body.data?.providers }, null, 2));
  assert.equal(response.statusCode, 200);
  assert.ok(body.data.providers.filter((provider: { id: string }) => provider.id !== "reliefweb")
    .every((provider: { status: string }) => provider.status === "ok"));
} finally { await app.close(); }
