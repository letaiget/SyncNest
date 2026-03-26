# Contributing to SyncNest

Thank you for contributing to SyncNest.

## Branching model (current phase)

- Current workflow allows direct updates to `main` during early bootstrap.
- Feature branches and PR-only flow can be introduced later.

## Commit message format

Use [Conventional Commits](https://www.conventionalcommits.org/):

- `feat: ...`
- `fix: ...`
- `docs: ...`
- `refactor: ...`
- `chore: ...`

All commit messages must be in English.

## Documentation rules

- Repository organizational notes can be written in Russian.
- Core public docs are bilingual via:
  - `README_RU.md`
  - `README_EN.md`

## History updates

When work is completed, update `HISTORY.md` with:

- date (`YYYY-MM-DD`)
- SemVer version
- blocks: Done, Decisions, Bugs, Errors, Commits, Plans

## Quality baseline

- Keep structure clear and predictable.
- Prefer explicit naming over abbreviations.
- Avoid introducing hidden behavior.
- Preserve backward compatibility unless explicitly discussed.
