---
title: "Polishing the code"
description: "Prepare a WDL project for review by formatting it, resolving diagnostics, checking inputs, running it, and generating documentation."
slug: /docs/production/polishing-the-code/
section: production
group: "Pipeline development"
order: 40
kind: tutorial
minutes: 25
legacy:
  - /docs/production/sprocket/
---

# Polishing the code

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/08-polishing-the-code origin/chapter/08-polishing-the-code
# Switched to a new branch 'chapter/08-polishing-the-code'
```

Your edits and commits will remain on this local branch.

## Introduction

The pipeline now completes a local run, but that alone does not make it ready to share.
The WDL may still be inconsistent, difficult to understand, poorly documented, or built
on assumptions that fail elsewhere.

We'll use Sprocket for a thorough quality pass. It will format the source, identify risky
patterns, expose the workflow's inputs, generate its reference documentation, and run the
result again. This moves the project beyond "it works on my computer" and toward code
other people can understand, review, and run reliably.

## Set the project rules

A shared project needs one definition of clean code. Otherwise, contributors can run the
same tool with different settings and receive different results.

Create `sprocket.toml` in the repository root:

```toml
[format]
indent = 4
max_line_length = 90
sort_imports = true
sort_inputs = false
trailing_commas = true
newline_style = "unix"

[check]
deny_warnings = true
deny_notes = true
tags = ["all"]

[check.lint]
bash_set_options = ["errexit", "nounset", "pipefail"]
```

The `[format]` section defines one layout for every WDL file. The `[check]` section makes
warnings and notes fail the check instead of appearing as optional advice. The Bash
settings match the strict defaults used in our tasks.

These settings turn team preferences into project rules that anyone can run. A rule
exception should be narrow and documented beside the affected code, not disabled across
the whole repository for convenience.

## Format the WDL

Formatting changes layout without changing behavior. Run the formatter before reviewing
the code so indentation and line wrapping do not distract from what the pipeline does:

```bash
sprocket format overwrite wdl
# No output is expected.
```

`overwrite` tells Sprocket to update files that do not match `sprocket.toml`. Ask Git
whether anything changed:

```bash
git status --short
#  M wdl/...
```

The exact files depend on their previous formatting. Review the changes:

```bash
git diff -- wdl
# ...
```

The diff should contain layout changes only. Sprocket can also check formatting without
modifying files:

```bash
sprocket format check wdl
# Each WDL file is formatted correctly.
```

Use `overwrite` while editing. Later, automated checks will use `check` to reject
unformatted files.

## Resolve diagnostics

Formatting gives the source a consistent layout. `sprocket check` answers a more
fundamental question: is this a well-formed WDL program that an execution engine can
interpret? It validates syntax, names, types, imports, references, and whether expressions
are compatible with their expected types.

Passing `check` means the document is structurally valid and ready to run. It does not
promise that a command, container, input file, or external service will succeed at
runtime.

Run both levels:

```bash
sprocket check wdl
# No errors are expected.
sprocket lint wdl
# No warnings or notes are expected.
```

`sprocket lint` goes beyond validity by checking WDL against recommended best practices
for portability, naming, metadata, shell safety, and production use.

Lint messages are worth paying attention to. Each one points to a pattern that has caused
trouble in real projects, such as an unsafe shell command, an unclear input, or an
assumption that may not work on another execution system. These problems are usually much
easier to fix now than after someone else depends on the pipeline.

If Sprocket reports a diagnostic, read its level, rule name, location, explanation, and
suggested fix. Ask for more detail when needed:

```bash
sprocket explain UnusedInput
# ...
```

When a lint appears, read what it found and fix the code behind it instead of
hiding the message. A clean lint run confirms that the WDL follows Sprocket's recommended
best practices, so tests and reviewers can focus on the pipeline's behavior.

## Review names and documentation

Someone using a workflow should not have to read its command blocks to learn what to
provide or what the results mean. The names and metadata on workflows, tasks, structs,
inputs, and outputs form the pipeline's public documentation. Sprocket carries that
information into editor help and the generated reference pages.

Read each public item from the caller's point of view. Its name should make its role
clear. Its description should explain its purpose, any important limits on the value, and
what the pipeline returns. For example, `"Stable reference identifier shown in audit reports"` tells the caller how
the value is used, while `"input string"` does not.

Generate the documentation and open it in your default browser:

```bash
sprocket dev doc wdl \
  --output build/wdl-docs \
  --overwrite \
  --index-page docs/index.md \
  --open
# The generated documentation opens in your browser.
```

Confirm that each public item has a clear description and that inputs and outputs use
consistent names. Return to the WDL, improve anything unclear, and regenerate the pages.

`sprocket dev doc` is currently a developmental command, so its interface may change in
later Sprocket releases.

## Check the generated inputs

Before running the workflow, ask Sprocket to generate an input template:

```bash
sprocket inputs wdl/workflows/audit_references.wdl
# {
#   "audit_references.references": [],
#   ...
# }
```

This output shows required inputs and defaults derived from the WDL. Compare the keys and
types with `examples/fixture.inputs.json`. The maintained example should supply local
FASTA paths and any other values needed for a deterministic run.

If a required input is missing from the example, or the generated name is unclear, fix
the WDL or example before running the pipeline.

## Run the polished workflow

Build the course image first:

```bash
docker build --tag ref-summary:v0.1.0 .
# ...
```

Run the local workflow with the fixture inputs:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
sprocket run wdl/workflows/audit_references.wdl \
  @examples/fixture.inputs.json \
  --output-dir output
# outputs were also written to `output/runs/audit_references/.../outputs.json`
```
:::
:::tab{label="Linux"}
```bash
sprocket run wdl/workflows/audit_references.wdl \
  @examples/fixture.inputs.json \
  --output-dir output
# outputs were also written to `output/runs/audit_references/.../outputs.json`
```
:::
:::tab{label="Windows"}
```powershell
sprocket run wdl\workflows\audit_references.wdl `
  @examples\fixture.inputs.json `
  --output-dir output
# outputs were also written to `output\runs\audit_references\...\outputs.json`
```
:::
::::

Open `outputs.json` and follow the paths to `audit_json` and `audit_tsv`. Confirm that the
reports contain the expected references and measurements. A clean static check is useful,
but the cleanup pass is not complete until the real local workflow still runs.

## Save your progress

Save the polished WDL and project settings in a local commit:

```bash
git add wdl sprocket.toml .sprocketignore docs/index.md
git commit -m "Polish WDL source and documentation"
git status --short
# No output is expected.
```

## What you learned

You used Sprocket to move the pipeline beyond merely runnable code. You gave the project
consistent rules, resolved known problems, checked what callers must provide, reviewed
the generated documentation, and confirmed that the cleaned-up workflow still runs.

The pipeline is now in a much stronger position for testing and review: its source is
consistent, its public behavior is easier to understand, and common portability problems
have been addressed. This kind of care is what separates good pipelines from great ones.
