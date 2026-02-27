# Agent Instructions

## Git Commits

Always use [conventional commit](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>
```

**Types:** `feat`, `fix`, `docs`, `style`, `refactor`, `chore`

**Examples:**
- `feat: add Campus Ventures LLC to footer`
- `fix: correct mobile nav menu overflow`
- `docs: update hosting guide`
- `chore: add .gitignore for .vercel`

## Automatic Git + PR Flow

For user-requested code changes, automatically complete the full GitHub flow without asking for additional confirmation:
1. Create a working branch (prefix `codex/` when starting from `main`).
2. Stage relevant changes.
3. Commit with a conventional commit message.
4. Push the branch to origin.
5. Open a GitHub PR with a clear title and body.

Only skip this automatic flow if the user explicitly asks not to commit or not to open a PR.
