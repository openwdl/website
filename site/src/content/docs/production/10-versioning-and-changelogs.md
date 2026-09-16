---
title: "Versioning and changelogs"
description: "Choose meaningful pipeline versions with semantic versioning and record notable changes in a human-readable changelog."
slug: /docs/production/versioning-and-changelogs/
section: production
group: "Versioning and release"
order: 10
kind: tutorial
minutes: 20
legacy:
  - /docs/production/versioning/
---

# Versioning and changelogs

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/10-versioning-and-changelogs origin/chapter/10-versioning-and-changelogs
# Switched to a new branch 'chapter/10-versioning-and-changelogs'
```

Your edits and commits will remain on this local branch.

## Introduction

A version identifies one published state of the pipeline. It tells users which WDL,
command-line tool, containers, documentation, and expected behavior belong together.

Without that label, "run the pipeline again" may combine pieces from different points in
time. One person might use newer WDL with an older container, while another follows
documentation written for a different release. Their runs may behave differently even
when both say they used the same pipeline.

Clear versions remove that ambiguity. They let a team reproduce an earlier analysis,
compare results produced by different releases, investigate when behavior changed, and
upgrade deliberately instead of accidentally. They also give publications, reports, and
automated systems a precise pipeline release to reference.

If your project does not already have a versioning scheme, [Semantic Versioning] is a
good place to start. It is widely understood and gives each version number a useful
meaning. A user can look at the number and get an early warning about whether an upgrade
may require changes on their side.

We'll give the complete course pipeline a semantic version and create a changelog that
explains what changed.

## Give version numbers meaning

A semantic version has three numbers:

```text
MAJOR.MINOR.PATCH
1.4.2
```

Read the numbers from left to right. Each one communicates a different kind of change:

| Part | Change it when | Pipeline example |
| --- | --- | --- |
| `MAJOR` | Existing users must change how they use the pipeline | Rename a required input or remove an output |
| `MINOR` | You add something without breaking existing use | Add an optional report |
| `PATCH` | You correct behavior without changing how users call the pipeline | Fix an incorrect base count |

Increasing `MAJOR` resets the other numbers to zero. Increasing `MINOR` resets `PATCH` to
zero. For example, the version after `1.4.2` could be `2.0.0`, `1.5.0`, or `1.4.3`,
depending on the change.

These promises depend on knowing what users rely on. Semantic Versioning calls that the
project's **public interface**. For this pipeline, it includes:

- workflow input names, types, defaults, and accepted values;
- workflow output names, types, and report fields;
- command-line behavior that users or automation depend on;
- documented failure behavior;
- the meaning of the scientific results.

Changing private implementation details does not require a major release when all of this
public behavior remains compatible. Renaming a required workflow input does, because
existing input files would stop working.

## Know what version zero means

Semantic Versioning reserves `0.y.z` for initial development. During this period, the
project is still deciding what its stable public behavior should be. Compatibility may
change between releases.

The version still matters. `0.1.0` identifies exact source, containers, and results, but
the leading zero tells users to read the changelog carefully before upgrading.

We'll begin this course at `0.1.0`. When the pipeline's inputs, outputs, and behavior are
stable enough for other people to depend on, `1.0.0` marks that commitment. Breaking
those expectations after `1.0.0` requires a new major version.

## Version the pipeline as one unit

The WDL file is only one part of the released analysis. The course uses one release
version for:

- WDL tasks and workflows;
- the `ref-summary` source and executable;
- published container images;
- generated documentation;
- example inputs and expected outputs.

We'll publish these pieces together under one version. That lets a user answer a
practical question without guessing: which tool, container, documentation, and examples
belong with this WDL?

Set the Rust package version in `tools/ref-summary/Cargo.toml`:

```toml
[package]
name = "ref-summary"
version = "0.1.0"
```

We'll use the same version for the source release and published `ref-summary` image.
Later sections will automate those details.

## Tell users what changed

A version number signals the scope of a release, but it does not explain what changed. A
**changelog** lists the notable differences in each release for the people who use and
maintain the project.

Create `CHANGELOG.md`:

```bash
code CHANGELOG.md
# Visual Studio Code opens CHANGELOG.md.
```

Start with this structure, based on [Keep a Changelog]:

```markdown
# Changelog

All notable changes to this project will be documented in this file.

This project uses [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.1.0] - 2026-09-01

### Added

- Initial `audit_references` workflow.
- Versioned JSON and optional TSV audit reports.
- Containerized `ref-summary` command-line tool.
- Local fixture tests and generated WDL documentation.
```

Add entries under `Unreleased` as the project changes. When you publish a version, move
those entries under a heading containing the version and an unambiguous date such as
`2026-09-01`.

Group entries by what happened:

- **Added** for new functionality;
- **Changed** for changes to existing behavior;
- **Deprecated** for behavior users should stop relying on;
- **Removed** for removed functionality;
- **Fixed** for bug fixes;
- **Security** for vulnerability fixes.

Write each entry from the user's point of view. "Reject duplicate reference identifiers
before starting analysis" explains what changed for them. "Update validation code" only
describes what a developer edited.

## Choose the next version

Before each release, compare the pending changes with the last published behavior:

1. Did an existing input, output, report, or supported use stop working?
2. Did the pipeline add new backward-compatible functionality?
3. Did it only correct existing behavior?

If the project is at `1.0.0` or later, choose `MAJOR`, `MINOR`, or `PATCH` from those
answers. During `0.y.z` development, state your compatibility policy clearly and use the
changelog to call out anything that will break existing use.

Once a version is published, do not change its contents. Make every later correction as a
new version. This keeps a version reliable: the same identifier always refers to the same
release.

## Save your progress

Save the changelog and version update in a local commit:

```bash
git add CHANGELOG.md tools/ref-summary/Cargo.toml tools/ref-summary/Cargo.lock
git commit -m "Document version 0.1.0"
git status --short
# No output is expected.
```

## What you learned

You gave the entire pipeline a meaningful version rather than versioning its WDL, tool,
and containers independently. You learned what major, minor, and patch numbers tell users
and why a `0.y.z` release carries a weaker compatibility promise.

You also created a changelog that explains notable changes from the user's point of view.
Together, the version and changelog tell people exactly which release they have, what
changed, and whether upgrading may require work.

[Keep a Changelog]: https://keepachangelog.com/en/1.1.0/
[Semantic Versioning]: https://semver.org/
