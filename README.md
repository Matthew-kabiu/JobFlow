# JobFlow

A self-hosted job-search aggregator: React/Vite frontend, Fastify/TypeScript API,
and free public job sources. Search worldwide and remote opportunities, including
Kenya-eligible roles. ReliefWeb adds humanitarian/NGO coverage when configured.

## Run a release

You need Docker with Compose and the two files from the
[latest GitHub Release](https://github.com/Matthew-kabiu/JobFlow/releases/latest).
No Node.js installation or source build is needed.

```bash
mkdir jobflow
cd jobflow
curl -fsSLO https://github.com/Matthew-kabiu/JobFlow/releases/latest/download/docker-compose.yml
curl -fsSLO https://github.com/Matthew-kabiu/JobFlow/releases/latest/download/.env.example
cp .env.example .env
docker compose up -d
```

Review `.env` before starting. Open `http://localhost:${PORT}` using the configured
host port. Himalayas and Jobicy need no API key. Leave `RELIEFWEB_APPNAME` blank
unless ReliefWeb has approved your app name.

Pin an exact release by setting `JOBFLOW_VERSION=1.0.0` in `.env`. If it is unset,
Compose uses `latest`. Available image tags are the exact version, major/minor,
and `latest`; the platform is `linux/amd64`.

```text
ghcr.io/matthew-kabiu/jobflow-frontend
ghcr.io/matthew-kabiu/jobflow-backend
```

### Update

```bash
docker compose pull
docker compose up -d
```

Change a version pin first if you use one. Read release migration notes before
updating. There is no application database to migrate in this release.

### Runtime settings

| Variable | Purpose |
| --- | --- |
| `JOBFLOW_VERSION` | Published image tag; defaults to `latest` |
| `PORT` | Browser-facing host port |
| `BACKEND_PORT`, `BACKEND_HOST` | Private API listen settings |
| `PUBLIC_REPO_URL` | Optional repository link displayed in the UI |
| `PUBLIC_COMPANY_NAME`, `PUBLIC_COMPANY_URL` | Runtime footer branding |
| `HIMALAYAS_API_KEY` | Optional free account allowance; backend only |
| `RELIEFWEB_APPNAME` | Optional approved app name; enables ReliefWeb |

Public configuration comes from `/api/v1/config` at app boot. The same images
work with different domains, ports, links, and provider credentials without
rebuilding. Never put a secret in a `PUBLIC_*` setting. No `VITE_*` value is
required for a production build.

## What it does

- Searches Himalayas and a cached Jobicy feed; optionally searches ReliefWeb.
- Filters by country, keywords, employment type, category, and comparable salary.
- Preserves country/timezone restrictions, source credit, and original Apply links.
- Reports partial provider failures and labels counts as **loaded matches**.
- Keeps provider credentials server-side; browsers use a same-origin API.

The loaded pools are bounded. This is not a complete global catalogue or full
coverage of Kenya's on-site jobs market. There are no employer uploads, accounts,
persistent saved jobs, or application-submission endpoints. See
[backend behavior and limits](docs/BACKEND.md).

## Build from source / development

```bash
git clone https://github.com/Matthew-kabiu/JobFlow.git
cd JobFlow
cp .env.development.example .env.development
DOCKER_BUILDKIT=1 docker compose --env-file .env.development -f docker-compose.dev.yml up --build -d
```

Open `http://localhost:${FRONTEND_PORT}` using the development setting.
Both services hot-reload source changes. The development environment is separate
from the released-image `.env`; neither real environment file is committed.
See [development and verification commands](docs/DEVELOPMENT.md).

## Repository map

```text
code/
  frontend/             React/Vite app, Dockerfiles, Nginx template
  backend/              Fastify app, provider adapters, tests, Dockerfiles
  shared/               Shared API type declarations
  scripts/              Release-version consistency check
.github/workflows/
  ci.yml                Lint/typecheck/test/build on main, PRs and version tags
  release.yml           Tag-only GHCR publication and GitHub Releases
docker-compose.yml      Run released images; never builds source
docker-compose.dev.yml  Build source with hot reload
.env.example            Production/released-image example
.env.development.example
docs/                   API, development, and release guidance
```

## Releasing (maintainers)

The public repository publishes the images once; the organization repository
mirrors the release using those same images. First bump **both** manifests and
lockfiles, then commit through the maintainer's sanctioned commit path.

For example, from the canonical public checkout after committing version 1.0.1:

```bash
git push origin main
git tag -a v1.0.1 -m "JobFlow 1.0.1: describe the change"
git push origin v1.0.1
```

The release workflow rejects tag/manifest mismatches, runs CI, builds both
production images, publishes their version/minor/latest tags, and creates the
GitHub Release. [Release guidance](docs/RELEASING.md) covers the private mirror,
runtime smoke checks, public pulls, and host migration. CI success alone is not
proof that images are anonymously pullable.

## License

[MIT](LICENSE).
