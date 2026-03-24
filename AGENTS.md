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

---

## Autonomous Execution (Critical)

- The agent must do everything it can itself before asking the user.

Only ask the user if:

1. Information is truly unavailable (passwords, API keys, 2FA)
2. A physical/manual action is required
3. The system blocks execution with no workaround

The agent must NOT:

- Ask the user to run commands, edit code, install dependencies, or debug
- Suggest steps it can perform itself
- Stop early or hand off work

Expected behavior:

- Try all programmatic options (code, commands, APIs, file edits)
- Make reasonable assumptions and proceed
- Attempt multiple approaches before giving up

Escalation rule:

Only ask after failing independently, and include:

- what was tried
- why it failed
- the minimal input needed

Bias:

When unsure -> act, don't ask
