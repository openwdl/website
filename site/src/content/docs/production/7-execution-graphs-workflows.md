---
title: "Execution graphs (Workflows)"
description: "Build a WDL execution graph one connection at a time, from one task call to validated parallel analysis and gathered reports."
slug: /docs/production/execution-graphs-workflows/
section: production
group: "Pipeline development"
order: 30
kind: tutorial
minutes: 40
legacy:
  - /docs/production/workflows/
  - /docs/production/interfaces/
---

# Execution graphs (Workflows)

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/07-execution-graphs-workflows origin/chapter/07-execution-graphs-workflows
# Switched to a new branch 'chapter/07-execution-graphs-workflows'
```

Your edits and commits will remain on this local branch.

## Introduction

You created one reusable unit of work in the previous section. A data analysis pipeline
becomes useful when several units work together: one result becomes another input,
independent work runs at the same time, and every dependency remains clear.

WDL calls this execution graph a **workflow**. Tasks and other workflows are the graph's
**nodes**. A connection that passes an output into an input is an **edge**. Together,
those edges describe which work depends on what.

The execution engine does not need to run pipeline steps in the order they appear in the
file. A step can begin as soon as its inputs are ready, and independent steps can run at
the same time. The engine follows data dependencies instead of simply reading the file
from top to bottom, automatically running steps in parallel whenever the graph and
available compute resources allow it.

We'll grow the reference audit one connection at a time. First, a workflow will call
`summarize_reference` once. Then it will process several references in parallel, validate
them before expensive work, and gather their results into one report.

## Share types between documents

`ReferenceFile` and `FastaMetrics` currently live beside `summarize_reference`. The
workflow needs those types too. Move them into `wdl/types.wdl` so both documents use the
same definitions.

Import them without aliases:

```wdl
import "../types.wdl"
```

An **import** makes structs from another WDL document available by their regular names.
After the import, both the task and workflow can use `ReferenceFile` and `FastaMetrics`
directly. Update `summarize_reference.wdl` to import the file and remove its local copies
of the structs. Its behavior does not change.

## Call one task

Create `wdl/workflows/audit_references.wdl`:

```wdl
version 1.3

import "../tasks/summarize_reference.wdl" as summarize
import "../types.wdl"

workflow audit_references {
    input {
        ReferenceFile reference
        String ref_summary_container = "ref-summary:v0.1.0"
    }

    call summarize.summarize_reference {
        fasta = reference.fasta,
        container = ref_summary_container,
    }

    output {
        File summary = summarize_reference.metrics_json
        FastaMetrics metrics = summarize_reference.metrics
    }
}
```

The `call` statement adds `summarize_reference` as a node. The workflow passes its
`reference` and `ref_summary_container` inputs into the task. The task's outputs then
become workflow outputs.

Run this smallest workflow:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
sprocket run \
  --target audit_references \
  --output-dir output \
  wdl/workflows/audit_references.wdl \
  reference='{"accession":"LOCAL.1","label":"small reference","fasta":"tests/fixtures/small-reference.fasta"}'
# ...
# "audit_references.summary": ".../summary.json"
```
:::
:::tab{label="Linux"}
```bash
sprocket run \
  --target audit_references \
  --output-dir output \
  wdl/workflows/audit_references.wdl \
  reference='{"accession":"LOCAL.1","label":"small reference","fasta":"tests/fixtures/small-reference.fasta"}'
# ...
# "audit_references.summary": ".../summary.json"
```
:::
:::tab{label="Windows"}
```powershell
sprocket run `
  --target audit_references `
  --output-dir output `
  wdl\workflows\audit_references.wdl `
  reference='{"accession":"LOCAL.1","label":"small reference","fasta":"tests/fixtures/small-reference.fasta"}'
# ...
# "audit_references.summary": "...\summary.json"
```
:::
::::

Wrapping one task in a workflow does very little by itself; the result is almost the same
as running the task directly. We start here only to make the connection between workflow
inputs, a task call, and workflow outputs clear.

The real power appears when the graph coordinates more work. We can scatter the same
computation across several reference genomes, let the execution engine run those calls
in parallel, and gather their results for the next step.

## Process several references in parallel

Replace the single reference in your workflow with a non-empty array:

```wdl
input {
    Array[ReferenceFile]+ references
    String ref_summary_container = "ref-summary:v0.1.0"
}
```

`Array[X]` means an ordered list of `X` values. The `+` requires at least one item, so the
workflow cannot run an audit with no references.

Use a `scatter` block to call the task once for each reference:

```wdl
scatter (reference in references) {
    call summarize.summarize_reference {
        fasta = reference.fasta,
        container = ref_summary_container,
    }
}
```

Each call depends on a different `ReferenceFile`, so the execution engine can run them in
parallel when workers are available. WDL gathers each output into an array in the same
order as the input references:

```wdl
output {
    Array[File]+ summaries = summarize_reference.metrics_json
    Array[FastaMetrics]+ metrics = summarize_reference.metrics
}
```

After these changes, `wdl/workflows/audit_references.wdl` contains:

```wdl
version 1.3

import "../tasks/summarize_reference.wdl" as summarize
import "../types.wdl"

workflow audit_references {
    input {
        Array[ReferenceFile]+ references
        String ref_summary_container = "ref-summary:v0.1.0"
    }

    scatter (reference in references) {
        call summarize.summarize_reference {
            fasta = reference.fasta,
            container = ref_summary_container,
        }
    }

    output {
        Array[File]+ summaries = summarize_reference.metrics_json
        Array[FastaMetrics]+ metrics = summarize_reference.metrics
    }
}
```

Parallel execution can reduce total run time, but WDL does not promise that every call
starts or finishes together. The graph promises the dependencies and the order of the
gathered results.

## Validate before starting expensive work

Parallel execution also makes early validation more important. If a request contains a
blank or duplicate identifier, starting every scattered task would waste compute
resources before the workflow discovers the problem.

Create `wdl/tasks/validate_references.wdl` with a preflight task named
`validate_references`. A **preflight check** validates the complete request before
expensive work begins. It checks that accession and label arrays have equal lengths,
contain no duplicates, and contain no blank values.

The validation task uses a regular Python image tag:

```wdl
task validate_references {
    input {
        env String accessions_json
        env String labels_json
        String container = "python:3.14-slim"
    }

    command <<<
        set -euo pipefail
        python3 - <<'PY'
        import json
        import os
        import pathlib

        accessions = json.loads(os.environ["accessions_json"])
        labels = json.loads(os.environ["labels_json"])

        if len(accessions) != len(labels):
            raise SystemExit("accessions and labels must have equal lengths")
        if len(set(accessions)) != len(accessions):
            raise SystemExit("reference accessions must be unique")
        if len(set(labels)) != len(labels):
            raise SystemExit("reference labels must be unique")

        if any(not value.strip() for value in accessions):
            raise SystemExit("reference accessions must not be blank")
        if any(not value.strip() for value in labels):
            raise SystemExit("reference labels must not be blank")

        pathlib.Path("validation.json").write_text(
            json.dumps({"schema_version": 1, "reference_count": len(accessions)}) + "\n"
        )
        PY
    >>>

    output {
        File report = "validation.json"
    }

    requirements {
        container: container
        cpu: 1
        memory: "128 MiB"
    }
}
```

The `env` modifier exposes a WDL input to the command as an environment variable. Python
reads those values and writes `validation.json` only when every check passes.

In the workflow, extract the accessions and labels and convert the arrays to JSON strings:

```wdl
scatter (reference in references) {
    String accession = reference.accession
    String label = reference.label
}

String accessions_json = read_string(write_json(accession))
String labels_json = read_string(write_json(label))
```

This scatter creates values without running a task. `write_json` stores an array in a
temporary JSON file, and `read_string` reads that file as the string expected by the
validator.

Call the validator:

```wdl
call validation.validate_references {
    accessions_json,
    labels_json,
}
```

Add a `File validation` input to `summarize_reference` and check that the report exists
before running `ref-summary`. Then pass `validate_references.report` into every scattered
summary call.

This creates an edge from validation to every summary task. If validation fails, the
report does not exist and none of the expensive summary calls can begin.

At this point, `wdl/workflows/audit_references.wdl` contains:

```wdl
version 1.3

import "../tasks/summarize_reference.wdl" as summarize
import "../tasks/validate_references.wdl" as validation
import "../types.wdl"

workflow audit_references {
    input {
        Array[ReferenceFile]+ references
        String ref_summary_container = "ref-summary:v0.1.0"
    }

    scatter (reference in references) {
        String accession = reference.accession
        String label = reference.label
    }

    String accessions_json = read_string(write_json(accession))
    String labels_json = read_string(write_json(label))

    call validation.validate_references {
        accessions_json,
        labels_json,
    }

    scatter (reference in references) {
        call summarize.summarize_reference {
            fasta = reference.fasta,
            container = ref_summary_container,
            validation = validate_references.report,
        }
    }

    output {
        Array[File]+ summaries = summarize_reference.metrics_json
        Array[FastaMetrics]+ metrics = summarize_reference.metrics
    }
}
```

## Gather the results

The scatter produces one JSON summary per reference. We want one audit report, so create
an `aggregate_summaries` task that accepts the ordered identities and summary files and
uses a regular `python:3.14-slim` container.

This pattern is called **scatter-gather**:

1. Scatter the same work across several inputs.
2. Gather the resulting array into one combined output.

Add two workflow inputs for the combined report:

```wdl
String ref_summary_version = "0.1.0"
Boolean emit_tsv = true
```

`ref_summary_version` records which program version produced the measurements.
`emit_tsv` lets callers disable the optional spreadsheet-friendly report while keeping
JSON as the canonical result.

Call the aggregation task after the scatter:

```wdl
call aggregate.aggregate_summaries {
    accessions_json,
    labels_json,
    metrics = summarize_reference.metrics_json,
    ref_summary_version,
    ref_summary_container,
}
```

Passing `summarize_reference.metrics_json` creates edges from every scattered summary to
the aggregation task. The aggregator cannot start until all summaries succeed. WDL keeps
the gathered output array in input order, so each result remains aligned with the correct
accession and label.

The aggregation task writes this JSON envelope:

```json
{
  "schema_version": 1,
  "ref_summary_version": "0.1.0",
  "ref_summary_container": "ref-summary:v0.1.0",
  "references": []
}
```

Each item under `references` contains one identity and its sequence measurements. The
report also records the tool and container versions used to create it.

Add a conditional call that creates a TSV only when `emit_tsv` is true:

```wdl
if (emit_tsv) {
    call aggregate.render_tsv {
        report = aggregate_summaries.report,
    }
}
```

A **conditional** adds a node only when its Boolean condition is true. JSON remains the
canonical result; TSV is an optional convenience for spreadsheets.

Expose the useful results:

```wdl
output {
    File audit_json = aggregate_summaries.report
    File? audit_tsv = render_tsv.report_tsv
    Array[File]+ summaries = summarize_reference.metrics_json
}
```

Workflow outputs are the public results of the graph. Validation reports and temporary
command files remain internal details.

## Review the complete workflow

Your completed `wdl/workflows/audit_references.wdl` should now contain:

```wdl
version 1.3

import "../tasks/aggregate_summaries.wdl" as aggregate
import "../tasks/summarize_reference.wdl" as summarize
import "../tasks/validate_references.wdl" as validation
import "../types.wdl"

workflow audit_references {
    input {
        Array[ReferenceFile]+ references
        String ref_summary_container = "ref-summary:v0.1.0"
        String ref_summary_version = "0.1.0"
        Boolean emit_tsv = true
    }

    scatter (reference in references) {
        String accession = reference.accession
        String label = reference.label
    }

    String accessions_json = read_string(write_json(accession))
    String labels_json = read_string(write_json(label))

    call validation.validate_references {
        accessions_json,
        labels_json,
    }

    scatter (reference in references) {
        call summarize.summarize_reference {
            fasta = reference.fasta,
            container = ref_summary_container,
            validation = validate_references.report,
        }
    }

    call aggregate.aggregate_summaries {
        accessions_json,
        labels_json,
        metrics = summarize_reference.metrics_json,
        ref_summary_version,
        ref_summary_container,
    }

    if (emit_tsv) {
        call aggregate.render_tsv {
            report = aggregate_summaries.report,
        }
    }

    output {
        File audit_json = aggregate_summaries.report
        File? audit_tsv = render_tsv.report_tsv
        Array[File]+ summaries = summarize_reference.metrics_json
    }
}
```

## Create local example inputs

Create `tests/fixtures/two-sequence-reference.fasta`:

```fasta
>alpha
ACGT
>beta
GGCCAA
```

Create `examples/fixture.inputs.json` with two local references:

```json
{
  "audit_references.references": [
    {
      "accession": "LOCAL.1",
      "label": "single sequence",
      "fasta": "../tests/fixtures/small-reference.fasta"
    },
    {
      "accession": "LOCAL.2",
      "label": "two sequences",
      "fasta": "../tests/fixtures/two-sequence-reference.fasta"
    }
  ],
  "audit_references.ref_summary_container": "ref-summary:v0.1.0",
  "audit_references.emit_tsv": true
}
```

Here, `accession` is the stable identifier recorded in the audit report. A local
identifier such as `LOCAL.1` does not need to come from an external database.

These small files keep the example fast, reproducible, and independent of external data
services. The two entries also make the scattered calls and gathered results visible.

## Check the graph

Format and lint the completed graph, then generate example inputs:

```bash
sprocket format overwrite wdl
# No output is expected.
sprocket lint wdl
# No errors are expected.
sprocket inputs wdl/workflows/audit_references.wdl
# ...
```

Confirm that the generated template requests a non-empty array of references and that
each reference contains an accession, label, and local FASTA file.

## Save your progress

Save the execution graph in a local commit:

```bash
git add wdl examples tests/fixtures/two-sequence-reference.fasta
git commit -m "Add reference audit workflows"
git status --short
# No output is expected.
```

## What you learned

You learned that a WDL workflow is an execution graph whose edges pass data between
pipeline steps. You started with one task call, scattered that task across several
reference genomes, blocked expensive work behind preflight validation, and gathered
ordered results into one report.

The workflow accepts local FASTA files, so data acquisition remains outside the analysis
graph. This keeps the pipeline deterministic and lets each environment decide how to
prepare and store reference data.
