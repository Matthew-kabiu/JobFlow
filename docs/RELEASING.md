# Releases

This project follows the owner's Build Release SOP: build once in CI, publish
versioned images, and pull those artifacts on deployment hosts.

## Publication design

- Canonical publisher: `Matthew-kabiu/JobFlow` (public).
- Organization mirror: `Spooky-Organization/JobFlow` (private).
- Only the public repository builds/publishes release images. The organization
  tag workflow waits for that canonical release and creates its own GitHub
  Release referencing the same images; it does not rebuild them.
- Both repositories run ordinary CI on `main`, pull requests, and tags.
- `.github/workflows/release.yml` runs only on pushed `v*` tags, and its version
  check requires an exact `vMAJOR.MINOR.PATCH` matching both manifests/lockfiles.
- Images use the `linux/amd64` platform and exact version, major/minor, and
  `latest` tags. Docker/metadata-action supplies version/source OCI labels.
- Only official `actions/*`, `docker/*`, and the existing `gh` CLI are used.

The public source history starts from its own license/import history. Preserve
that separation when syncing private changes; do not push private historical
environment files into the public repository. Release source should match across
the two repositories, but commit IDs can differ.

## Portability decisions

| Setting | Decision |
| --- | --- |
| API origin | Relative `/api/v1/*`, proxied by Vite/Nginx |
| Repository/company links | Explicit backend runtime config, fetched at app boot |
| Provider keys/appname | Backend runtime environment only |
| Host/container ports | Compose/runtime environment only |
| Artifact version | Shipped manifests, aligned with the Git tag |
| Old webhook variables | Removed; there is no n8n dependency |

There are no build arguments containing deployment values or secrets. SPA
assets are static, while deployment-specific public config comes from the
running backend. Nginx expands only `BACKEND_ORIGIN` at container startup.

## Cut a version

From the public checkout, using Node 22 for maintainer commands:

```bash
npm --prefix code/frontend version 1.0.1 --no-git-tag-version
npm --prefix code/backend version 1.0.1 --no-git-tag-version
node code/scripts/check-release.mjs v1.0.1
# Commit through the maintainer's sanctioned path, then:
git push origin main
git tag -a v1.0.1 -m "JobFlow 1.0.1: describe the change"
git push origin v1.0.1
```

For the organization mirror, synchronize the same approved source, manifests,
and tag name on its private history and push its `main` and tag to the organization
remote. The canonical public release must finish before the mirror workflow's
wait expires. Never force one repository's unrelated history over the other.

In Matt's private working checkout, commits use `.claude/hooks/do_commit.sh`.
That local tooling and owner coordination documents are intentionally not
distributed in the public source.

## Verification before claiming release

1. Lint, typechecks, tests, application production builds, and Docker builds pass.
2. Start the locally built images with runtime environment only: frontend health,
   homepage, backend health, and `/api/v1/config` must return 200. Change public
   branding/links at runtime and confirm they reach the UI without rebuilding.
3. Validate both Compose files and both workflow YAML files.
4. Confirm CI on `main` and the tag in both repositories.
5. Watch the canonical release run and its organization mirror:

   ```bash
   gh run list --repo Matthew-kabiu/JobFlow --workflow Release
   gh run watch RUN_ID --repo Matthew-kabiu/JobFlow --exit-status
   gh release view v1.0.0 --repo Matthew-kabiu/JobFlow
   gh release view v1.0.0 --repo Spooky-Organization/JobFlow
   ```

6. Probe both GHCR manifests anonymously and pull the versioned images. A private
   package must be made public by its owner in GitHub package settings; public
   source alone does not prove public package access.
7. Record actual results in the local changelog/handoff and Obsidian release note.

## Host migration

Replace the old source-building `docker-compose-prod.yml` configuration with the
root pull-only `docker-compose.yml`. Set production environment values **before**
the first pull-based deployment. This release does not switch a Coolify resource
or another production host automatically.

| Old setting | Replacement/action |
| --- | --- |
| `VITE_N8N_WEBHOOK_URL` and older webhook settings | Remove from active deployment configuration |
| Build-time frontend origin/branding | Use relative API plus `PUBLIC_REPO_URL`, `PUBLIC_COMPANY_NAME`, `PUBLIC_COMPANY_URL` at runtime |
| `PORT` | Retained as browser-facing host port |
| Backend listen configuration | Set `BACKEND_PORT` and `BACKEND_HOST` |
| Source-build deploy | Pull `ghcr.io/matthew-kabiu/jobflow-{frontend,backend}` |
| Unpinned image choice | Optionally pin `JOBFLOW_VERSION` |

Development uses `.env.development`, while the release Compose file uses `.env`.
Provider credentials remain optional, backend-only, and absent from images.

## Known dependency findings

The existing frontend dependency audit had 20 findings during the pre-release
clean development install (6 moderate, 12 high, 2 critical). The audit excluding
development dependencies reported 10 (3 moderate, 7 high). The new backend audit
reported zero. These are audit results, not a claim that every advisory is
reachable in the deployed application. Dependency upgrades require a separate
approved remediation pass; no unrelated dependency changes are bundled here.
