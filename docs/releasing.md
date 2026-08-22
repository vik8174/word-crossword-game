# Releasing

How a version of this game is published. The order below existed only inside the body of one ticket until now, which meant the next release would have been reconstructed from memory or from the commit history.

The global `/release` skill does not fit this project and should not be reached for: it expects a `release/X` branch and a `## [VERSION]` section already written in the changelog, and there is neither here.

## What a release is made of

- **The version lives in the `version` field of the root `package.json`, and nowhere else.** `apps/web` and `packages/shared` keep a placeholder `0.0.0` ([ADR 0019](decisions/0019-a-release-is-a-version-and-a-commit.md))
- **A `v*` tag is what deploys production**, and nothing else does ([ADR 0020](decisions/0020-two-environments-and-a-deploy-that-runs-itself.md))
- **A tag that does not name the version `package.json` states deploys nothing and says so.** The release job checks the pair before it builds: `Tag v1.2.0 does not name the version package.json states (1.1.0)`. Move the tag or bump the version and push again (`.github/workflows/deploy.yml`)
- **The release name in Sentry is the version joined to the commit** — `1.1.0+7c90d442202e`, twelve characters of it. Stage and production report into one Sentry project and are told apart by their environment tag, so a tag sitting on a commit stage already deployed produces the same release name in both

Standing up an environment is **not** a release step. Creating the Firebase project, the TTL policy, the deploy service account, the GitHub environment and the GA4 Internal Traffic filter is done once per project, by hand, and is written down in [Standing up an environment](../README.md#standing-up-an-environment).

## The order

1. **Open a pull request** from a branch off `main`, named `chore/release-X.Y.Z`. In it:

   - bump `version` in the root `package.json`
   - rename the `[Unreleased]` section of [`CHANGELOG.md`](../CHANGELOG.md) to `[X.Y.Z] - YYYY-MM-DD`, and open a fresh empty `[Unreleased]` above it
   - **the date is the day the version goes out, not the day its preparation started.** This has already gone wrong once: 1.1.0 was written down as `2026-08-20` by a session that ran past midnight and tagged the release on the 21st. Write the date at the end, or correct it before the tag
   - write the `### Known limitations` section for this version, from [`known-limits.md`](known-limits.md). Both 1.0.0 and 1.1.0 have one, so a silent absence would read as "this release has no limits" rather than as an omission

2. **Merge it.** Nothing is ever committed to `main` directly ([`CONTRIBUTING.md`](../CONTRIBUTING.md))

3. **Let the stage deploy of the release commit go green.** The merge deploys stage on its own; the tag will build the same commit, so what stage is serving is the build production is about to get. This is the last chance to look at it before it is public

4. **Walk the pre-tag part of [`manual-checks.md`](manual-checks.md) on stage.** By the list, not from memory

5. **Tag that commit and push the tag:**

   ```bash
   git tag v1.2.0 && git push origin v1.2.0
   ```

6. **Watch the production deploy finish.** It re-runs linting, the tests with their coverage threshold and the rules checks on the tagged commit before it publishes anything

7. **Create the GitHub release**, with a title that says what the version is, not just what it is numbered:

   ```bash
   gh release create v1.2.0 --title "v1.2.0 — <what this release is>" --notes "..."
   ```

   The two so far are `v1.0.0 — the first playable release` and `v1.1.0 — one address, two players, and who is still there`

8. **Walk the post-tag part of [`manual-checks.md`](manual-checks.md) on production**, starting with the step that marks the browser profile, which cannot be done afterwards
