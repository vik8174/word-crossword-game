# 0019. A release is a version and a commit

Status: Accepted

Amends [0018](0018-source-maps-for-sentry-only.md), which named a build after its commit alone.

## Context

[0018](0018-source-maps-for-sentry-only.md) settled that the upload and the bundle must agree on one release name, and made that name the commit the build came from. It works, and it left two things unsatisfying.

**A commit says nothing about which release an error belongs to.** `700f8a8b3c9d` answers "which build" and not "which version", and "which version" is the question asked of a crash report — is this still happening in what people are running, or was it fixed before it shipped. Sentry's own ideas of a regression and of "first seen in" are all expressed in releases, and a release that is a bare hash makes each of them a lookup.

**A build outside a checkout silently uploaded nothing.** With the commit as the only source of a name, a source archive had no name, and 0018 chose to upload nothing rather than let the plugin invent one. That was the right call given the choice, but the choice itself came from having only one place to get a name from.

Underneath both: the repository had no version to speak of. The root `package.json` carried no `version` field at all, and the two workspace packages carried a placeholder `0.0.0`. `CHANGELOG.md` had an `[Unreleased]` section and nothing under it, and there were no tags. There was nothing to name a release after except the commit.

## Decision

**The product's version lives in the root `package.json`, and a release is that version joined to the commit it was built from.**

```
1.0.0+700f8a8b3c9d
```

### The version is at the root, in one place

The tag names the repository, `CHANGELOG.md` sits at the repository root and describes the repository, and so does this field. All three describe the same thing, so they belong in the same place.

`apps/web` and `packages/shared` keep their placeholder `0.0.0`. They are private and never published; a version in either would be a second thing to bump and a second thing to get wrong. Nothing reads them.

### Both halves, because neither answers alone

The version is the same across every build between two releases, so it cannot identify a build. The commit identifies a build and says nothing about the release. Joined with `+`, the way SemVer already spells build metadata, they read as one fact: this version, from this build.

Twelve characters of the commit rather than forty. Enough to be unambiguous in a repository this size, short enough that the name reads as a version with a build behind it rather than as a hash.

### Every build can now name itself

`readPackageVersion` reads a file that every build is already reading, so `resolveReleaseName` always answers. Outside a checkout the name is the version alone — still a name, still one the bundle and the upload agree on.

Two consequences follow. A source archive can upload maps, which under 0018 it could not. And `shouldUploadSourceMaps` loses its second argument: with a name guaranteed, the token is the whole of the question.

A checkout whose root `package.json` states no version throws instead. That is not the same case: an archive is a legitimate way to build this project, and a workspace root that cannot say what version it is is broken.

## Consequences

- Errors in Sentry group by the version people are running, and a build is still identified exactly, because the commit rides along
- The version and the git tag are now two things that can disagree. Nothing enforces that they match — [issue #53](https://github.com/vik8174/word-crossword-game/issues/53) owns the release process and is where that pairing has to be made, either by having the release step write both or by refusing to tag a version the file does not state
- `resolveReleaseName` returns `string` rather than `string | undefined`, and no caller handles an unnamed build any more
- 0018's reasoning about a plugin left to invent its own name still holds and still applies: the name is passed explicitly, and now it is always there to pass
- Rebuilding the same commit twice still uploads a second set of maps under one release name, and the debug id is still what Sentry matches on, so the older maps are never applied to the newer bundle. Joining the version to the commit changes nothing here
- A build from a dirty working tree is named after the commit it is not quite made from. The debug id keeps the maps correct; the release name is approximate, and that is the price of naming a build after a commit at all
