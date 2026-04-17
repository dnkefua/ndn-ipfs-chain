# Contributing

Thanks for your interest. NDN IPFS Chain is Apache-2.0; anything merged is licensed the same way.

## Where help is welcome
- Extra SDKs (Go, Rust, Swift, Kotlin).
- Integrations (wagmi hook, viem plugin, FoundryVTT, FastAPI middleware, etc.).
- Tutorials and blog posts — we link and promote good ones.
- Filecoin SP scoring heuristics.
- Translations of the docs.

## Dev loop
```bash
docker compose -f dev/docker-compose.yaml up
cd api/server && npm install && npm run dev
cd sdks/js     && npm install && npm run build
cd sdks/python && pip install -e '.[cli]'
```

## Style
- ESLint + Prettier (JS/TS). `npm run lint` must pass.
- `ruff + mypy` (Python). `ruff check` and `mypy src/` must pass.
- Conventional commits (`feat:`, `fix:`, `docs:`).

## Tests
- Unit tests required for new code paths.
- Integration tests live under `tests/integration/`; use `dev/docker-compose.yaml`.
- CI runs against Kubo v0.28, v0.29, v0.30.

## Security
Report vulnerabilities to security@ndnanalytics.com (PGP key on the website). Do not open public issues for security bugs.

## Code of conduct
Be kind, be specific, cite sources, assume good faith.
