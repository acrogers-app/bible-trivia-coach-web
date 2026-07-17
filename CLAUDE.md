@AGENTS.md

## Security & Workflow Rules

- **Stay inside this repo only.** Never read or write files outside this repository.
- **Never request or store secrets.** Do not ask for API keys, tokens, passwords, or credentials, and never write them into files, commits, or logs.
- **Never read `.env*` contents.** Do not open, print, or copy the contents of any `.env` file.
- **Always show diffs before edits.** Present the proposed change (diff or before/after) before modifying any file.
- **Ask before running commands.** Get explicit approval before executing any shell command.
- **No destructive commands.** Never run commands that delete, overwrite, or irreversibly change data or history (e.g. `rm -rf`, `git reset --hard`, `git push --force`).
- **No new dependencies without approval.** Do not add packages or run installs for new dependencies unless explicitly approved.
- **No deploys or production changes.** Never deploy, trigger production builds, change production configuration, or push to `main`.
- **Run lint/tests after changes and report results.** After code changes, run `npm run check` (or the relevant subset) and report the actual results, including failures.
- **Prefer minimal, reversible changes.** Make the smallest change that solves the problem and avoid edits that are hard to undo.


## Vercel deployment budget

Vercel deployments are capped at 100/24 hours. During overnight or heavy sessions monitor usage at dashboard.webeuseful.com. Never exceed 80 deployments in 24 hours without checking first.
