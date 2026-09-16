---
title: "Testing your pipeline"
description: "Turn important computation behavior into repeatable Sprocket tests using manually created FASTA fixtures."
slug: /docs/production/testing-your-pipeline/
section: production
group: "Pipeline development"
order: 50
kind: tutorial
minutes: 20
legacy:
  - /docs/production/testing/
---

# Testing your pipeline

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/09-testing origin/chapter/09-testing
# Switched to a new branch 'chapter/09-testing'
```

Your edits and commits will remain on this local branch.

## Introduction

A pipeline can be formatted, documented, and free of lint findings while still producing
the wrong result. Testing checks behavior by running the code and comparing what happened
with what we expected.

A good test turns one important promise into a repeatable check. `summarize_reference`
promises to measure a valid FASTA file and reject one it cannot understand. Once those
behaviors are tests, we can change the implementation and quickly learn whether we broke
either promise.

This matters even more in production. A mistake that affects one local file may affect
thousands of cloud or HPC jobs when the pipeline runs at scale. Tests catch many of those
mistakes before they consume shared data, time, and compute resources. They also give
teammates confidence to improve the pipeline without relying on one person's memory of
how it should behave.

We'll begin by preserving two important behaviors:

1. A valid FASTA file must produce the expected JSON output.
2. A malformed FASTA file must fail.

Both use small files that we create ourselves, which keeps the tests fast, repeatable,
and independent of any network calls.

## How Sprocket tests work

`sprocket dev test` runs WDL tasks and workflows as automated test cases. Each case
provides input values and describes what Sprocket should observe when the run finishes.
Sprocket reports a failure when the run or its assertions do not match those expectations.

Test definitions live in YAML files beside the WDL they test. A test can use fixture
files, try several input values, inspect outputs, check task output and error streams, or
expect a run to fail.

A full tutorial on everything Sprocket tests can do is outside the scope of this guide.
See the official [Sprocket testing guide] for the complete test format and available
assertions. Here, we'll define two focused cases and use a few assertions that matter to
`summarize_reference`.

## Create the FASTA fixtures

A **fixture** is a small, controlled input created specifically for testing. We already
have `small-reference.fasta`, but create it here with the malformed case so the complete
test setup is visible.

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
mkdir -p tests/fixtures
code tests/fixtures/small-reference.fasta tests/fixtures/malformed.fasta
# Visual Studio Code opens both files.
```
:::
:::tab{label="Linux"}
```bash
mkdir -p tests/fixtures
code tests/fixtures/small-reference.fasta tests/fixtures/malformed.fasta
# Visual Studio Code opens both files.
```
:::
:::tab{label="Windows"}
```powershell
New-Item -ItemType Directory -Force tests\fixtures | Out-Null
code tests\fixtures\small-reference.fasta tests\fixtures\malformed.fasta
# Visual Studio Code opens both files.
```
:::
::::

Put this valid sequence in `small-reference.fasta`:

```text
>chromosome
ACGTACGTNN
```

Put this invalid sequence in `malformed.fasta`:

```text
>chromosome
ACGTZ
```

`Z` is not a valid IUPAC nucleotide symbol, so `ref-summary` must reject the second file.
The two inputs differ in one clear way, making a failure easier to interpret.

## Add a successful test

Open `wdl/tasks/summarize_reference.yaml`:

```bash
code wdl/tasks/summarize_reference.yaml
# Visual Studio Code opens summarize_reference.yaml.
```

YAML uses indentation to show which values belong together, so preserve the spacing shown
in the example:

```yaml
# Name the task these tests execute.
summarize_reference:
  # Define one test case and give it a readable name.
  - name: valid-fasta
    # Supply possible values for each task input.
    inputs:
      # Run once with the manually created valid fixture.
      fasta:
        - small-reference.fasta
    # Describe what must be true after the task succeeds.
    assertions:
      # Confirm that the task returns its JSON file.
      outputs:
        metrics_json:
          - Name: summary.json
```

The top-level key names the task. `inputs` supplies the FASTA fixture, while `assertions`
describes the expected behavior. Here, we confirm that the task returns a file named
`summary.json`. We'll compare every value inside that file later.

## Add an expected failure

A pipeline must fail well, not only succeed under ideal conditions. Add the malformed
FASTA as a second case:

```yaml
  # Add another case under the same summarize_reference key.
  - name: malformed-fasta
    inputs:
      # Run once with the fixture containing an invalid Z symbol.
      fasta:
        - malformed.fasta
    assertions:
      # This case passes only when the task rejects the input.
      should_fail: true
      # Confirm that it failed for the expected reason.
      stderr:
        - "invalid nucleotide symbol"
```

`should_fail: true` reverses the normal expectation. Sprocket considers the case
successful only when the task exits with a failure. The `stderr` assertion also checks
the error message, preventing an unrelated failure from satisfying the test.

The complete `wdl/tasks/summarize_reference.yaml` file now contains:

```yaml
summarize_reference:
  - name: valid-fasta
    inputs:
      fasta:
        - small-reference.fasta
    assertions:
      outputs:
        metrics_json:
          - Name: summary.json

  - name: malformed-fasta
    inputs:
      fasta:
        - malformed.fasta
    assertions:
      should_fail: true
      stderr:
        - "invalid nucleotide symbol"
```

## Run both tests

Build the local image because the tests execute the real containerized task:

```bash
docker build --tag ref-summary:v0.1.0 .
# ...
```

Run both cases with an absolute fixture path. Docker needs that absolute path to map the
files into each task container:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
sprocket dev test wdl/tasks/summarize_reference.wdl \
  --workspace . \
  --fixtures-dir "$PWD/tests/fixtures" \
  --clean-all
# summarize_reference::summarize_reference::valid-fasta (iteration #1): ✅
# summarize_reference::summarize_reference::malformed-fasta (iteration #1): ✅
# Sprocket test result summary:
# ✅ `summarize_reference::summarize_reference::valid-fasta` success! (1 successful test execution)
# ✅ `summarize_reference::summarize_reference::malformed-fasta` success! (1 successful test execution)
```
:::
:::tab{label="Linux"}
```bash
sprocket dev test wdl/tasks/summarize_reference.wdl \
  --workspace . \
  --fixtures-dir "$PWD/tests/fixtures" \
  --clean-all
# summarize_reference::summarize_reference::valid-fasta (iteration #1): ✅
# summarize_reference::summarize_reference::malformed-fasta (iteration #1): ✅
# Sprocket test result summary:
# ✅ `summarize_reference::summarize_reference::valid-fasta` success! (1 successful test execution)
# ✅ `summarize_reference::summarize_reference::malformed-fasta` success! (1 successful test execution)
```
:::
:::tab{label="Windows"}
```powershell
sprocket.exe dev test wdl\tasks\summarize_reference.wdl `
  --workspace . `
  --fixtures-dir (Join-Path $PWD "tests\fixtures") `
  --clean-all
# summarize_reference::summarize_reference::valid-fasta (iteration #1): ✅
# summarize_reference::summarize_reference::malformed-fasta (iteration #1): ✅
# Sprocket test result summary:
# ✅ `summarize_reference::summarize_reference::valid-fasta` success! (1 successful test execution)
# ✅ `summarize_reference::summarize_reference::malformed-fasta` success! (1 successful test execution)
```
:::
::::

`--workspace .` uses the current repository as the test workspace.
`--fixtures-dir` tells Sprocket where the named FASTA files live. `--clean-all` removes
the temporary test runs when the command finishes.

Make sure Sprocket reports both cases. "No tests executed" does not mean success; it
usually means the YAML file was not discovered beside the WDL file.

## Check the complete JSON result

The YAML assertions check selected outputs. We should also compare the complete generated
JSON with the hand-reviewed result from the command-line section.

Run only the valid case and retain its files:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
sprocket dev test wdl/tasks/summarize_reference.wdl \
  --workspace . \
  --fixtures-dir "$PWD/tests/fixtures" \
  --filter valid-fasta \
  --no-clean
# ...
# 1 test passed
```
:::
:::tab{label="Linux"}
```bash
sprocket dev test wdl/tasks/summarize_reference.wdl \
  --workspace . \
  --fixtures-dir "$PWD/tests/fixtures" \
  --filter valid-fasta \
  --no-clean
# ...
# 1 test passed
```
:::
:::tab{label="Windows"}
```powershell
sprocket.exe dev test wdl\tasks\summarize_reference.wdl `
  --workspace . `
  --fixtures-dir (Join-Path $PWD "tests\fixtures") `
  --filter valid-fasta `
  --no-clean
# ...
# 1 test passed
```
:::
::::

Open the retained `summary.json` and compare it with
`tests/expected/small-reference.json`. Keeping the expected file separate from the
generated file prevents the code under test from defining its own correct answer.

When an intentional change affects the measurements, review the difference before
updating the expected result.

## Save your progress

Save the fixtures and test definition in a local commit:

```bash
git add tests/fixtures wdl/tasks/summarize_reference.yaml
git commit -m "Test the summary task"
git status --short
# No output is expected.
```

## What you learned

You created two FASTA fixtures and an automated Sprocket test file for the
`summarize_reference` task. The successful case checks known measurements without a
network call. The expected-failure case proves that malformed sequence data is rejected
for the right reason.

You also compared the complete JSON result with an independently reviewed file.

[Sprocket testing guide]: https://sprocket.bio/subcommands/test.html
