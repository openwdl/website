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

`FastaMetrics` currently lives beside `summarize_reference`. The workflow needs that
type too, along with a type that identifies each local reference. Create
`wdl/types.wdl`, move `FastaMetrics` into it, and add `ReferenceFile` above it:

```wdl
version 1.3

struct ReferenceFile {
    meta {
        description: "A localized FASTA file and the stable identity preserved with it."
    }

    parameter_meta {
        accession: "Stable reference identifier shown in audit reports."
        label: "Unique human-readable name shown in audit reports."
        fasta: "Uncompressed nucleotide FASTA file."
    }

    String accession
    String label
    File fasta
}

struct FastaMetrics {
    meta {
        description: "Deterministic sequence counts emitted by ref-summary."
    }

    parameter_meta {
        schema_version: "Version of the ref-summary JSON schema."
        sequence_count: "Number of FASTA records."
        total_bases: "Total number of nucleotide symbols."
        gc_bases: "Number of literal G and C bases."
        n_bases: "Number of N bases."
        ambiguous_bases: "Number of other IUPAC symbols."
        minimum_length: "Length of the shortest FASTA record."
        maximum_length: "Length of the longest FASTA record."
    }

    Int schema_version
    Int sequence_count
    Int total_bases
    Int gc_bases
    Int n_bases
    Int ambiguous_bases
    Int minimum_length
    Int maximum_length
}
```

Import the shared types without aliases in `summarize_reference.wdl`:

```wdl
import "../types.wdl"
```

An **import** makes structs from another WDL document available by their regular names.
Remove the local `FastaMetrics` definition from `summarize_reference.wdl`. Its behavior
does not change.

## Call one task

Create `wdl/workflows/audit_references.wdl`:

```wdl
version 1.3

import "../tasks/summarize_reference.wdl" as summarize
#@ except: UnusedImport
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

Sprocket 0.30.1 does not yet count the workflow's imported struct use when it checks
whether an import namespace is used. The `#@ except: UnusedImport` directive suppresses
that one incorrect diagnostic for the import immediately below it; the rule remains
active everywhere else.

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
#@ except: UnusedImport
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

The complete validation task uses a regular Python image tag:

```wdl
version 1.3

task validate_references {
    meta {
        description: "Reject mismatched, duplicate, or blank reference identifiers before analysis."
        outputs: {
            report: "JSON marker recording the number of validated references.",
        }
    }

    parameter_meta {
        accessions_json: "JSON array of ordered stable reference identifiers."
        labels_json: "JSON array of ordered unique report labels."
        container: "Container image containing Python."
    }

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

Add this entry to the existing `parameter_meta` section in `summarize_reference`:

```wdl
validation: "Successful preflight validation report for the complete request."
```

Add its required input:

```wdl
File validation
```

Check that the localized report is not empty before running `ref-summary`:

```bash
test -s "~{validation}"
```

Then pass `validate_references.report` into every scattered summary call.

After these changes, `wdl/tasks/summarize_reference.wdl` contains:

```wdl
version 1.3

import "../types.wdl"

task summarize_reference {
    meta {
        description: "Calculate deterministic sequence metrics for one FASTA reference."
        outputs: {
            metrics_json: "JSON sequence metrics emitted by ref-summary.",
            metrics: "Typed sequence metrics read from the JSON output.",
        }
    }

    parameter_meta {
        fasta: "Uncompressed nucleotide FASTA file to summarize."
        validation: "Successful preflight validation report for the complete request."
        container: "Container image containing ref-summary, preferably pinned by digest."
        cpu: "Number of processor cores to request."
        memory: "Amount of memory to request, including its unit."
    }

    input {
        File fasta
        File validation
        String container = "ref-summary:v0.1.0"
        Int cpu = 1
        String memory = "256 MiB"
    }

    command <<<
        set -euo pipefail
        test -s "~{validation}"
        ref-summary "~{fasta}" --output summary.json
    >>>

    output {
        File metrics_json = "summary.json"
        FastaMetrics metrics = read_json(metrics_json)
    }

    requirements {
        container: container
        cpu: cpu
        memory: memory
        max_retries: 1
    }
}
```

This creates an edge from validation to every summary task. If validation fails, the
report does not exist and none of the expensive summary calls can begin.

At this point, `wdl/workflows/audit_references.wdl` contains:

```wdl
version 1.3

import "../tasks/summarize_reference.wdl" as summarize
import "../tasks/validate_references.wdl" as validation
#@ except: UnusedImport
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
`wdl/tasks/aggregate_summaries.wdl`. It contains one task that combines the ordered
identities and summary files, plus a second task that renders the optional TSV:

```wdl
version 1.3

task aggregate_summaries {
    meta {
        description: "Combine ordered per-reference metrics into one versioned JSON report."
        outputs: {
            report: "Combined JSON audit report with ref-summary provenance.",
        }
    }

    parameter_meta {
        accessions_json: "JSON array of ordered stable reference identifiers."
        labels_json: "JSON array of ordered unique report labels."
        metrics: "Ordered JSON metric files emitted by ref-summary."
        ref_summary_version: "Version of ref-summary used for the audit."
        ref_summary_container: "Container image used to execute ref-summary."
        container: "Container image containing Python."
    }

    input {
        env String accessions_json
        env String labels_json
        Array[File]+ metrics
        env String ref_summary_version
        env String ref_summary_container
        String container = "python:3.14-slim"
    }

    File metrics_manifest = write_lines(metrics)

    command <<<
        set -euo pipefail
        python3 - "~{metrics_manifest}" <<'PY'
        import json
        import os
        import pathlib
        import sys

        accessions = json.loads(os.environ["accessions_json"])
        labels = json.loads(os.environ["labels_json"])
        paths = pathlib.Path(sys.argv[1]).read_text().splitlines()
        if not (len(accessions) == len(labels) == len(paths)):
            raise SystemExit("accessions, labels, and metrics must have equal lengths")

        references = []
        for accession, label, path in zip(accessions, labels, paths, strict=True):
            metrics = json.loads(pathlib.Path(path).read_text())
            references.append({"accession": accession, "label": label, **metrics})

        report = {
            "schema_version": 1,
            "ref_summary_version": os.environ["ref_summary_version"],
            "ref_summary_container": os.environ["ref_summary_container"],
            "references": references,
        }
        pathlib.Path("audit.json").write_text(json.dumps(report, indent=2) + "\n")
        PY
    >>>

    output {
        File report = "audit.json"
    }

    requirements {
        container: container
        cpu: 1
        memory: "256 MiB"
    }
}

task render_tsv {
    meta {
        description: "Convert a combined JSON audit report to a stable TSV artifact."
        outputs: {
            report_tsv: "Flat TSV audit report with one row per reference.",
        }
    }

    parameter_meta {
        report: "Combined JSON audit report."
        container: "Container image containing Python."
    }

    input {
        File report
        String container = "python:3.14-slim"
    }

    command <<<
        set -euo pipefail
        python3 - "~{report}" <<'PY'
        import csv
        import json
        import pathlib
        import sys

        report = json.loads(pathlib.Path(sys.argv[1]).read_text())
        fields = [
            "accession", "label", "sequence_count", "total_bases", "gc_bases",
            "n_bases", "ambiguous_bases", "minimum_length", "maximum_length",
        ]
        with pathlib.Path("audit.tsv").open("w", newline="") as handle:
            writer = csv.DictWriter(
                handle,
                fieldnames=fields,
                delimiter="\t",
                lineterminator="\n",
                extrasaction="ignore",
            )
            writer.writeheader()
            writer.writerows(report["references"])
        PY
    >>>

    output {
        File report_tsv = "audit.tsv"
    }

    requirements {
        container: container
        cpu: 1
        memory: "256 MiB"
    }
}
```

Both tasks use a regular `python:3.14-slim` container. The aggregation task writes the
gathered metric file paths to an ordered manifest. Each scattered task writes a file
named `summary.json`, so the manifest preserves every full localized path without relying
on duplicate basenames or a filesystem glob.

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
#@ except: UnusedImport
import "../types.wdl"

workflow audit_references {
    meta {
        description: "Validate and summarize ordered local reference FASTA files."
        outputs: {
            audit_json: "Canonical combined JSON audit report.",
            audit_tsv: "Optional flat TSV report.",
            summaries: "Ordered per-reference JSON metric files.",
        }
    }

    parameter_meta {
        references: "Ordered non-empty references to audit."
        ref_summary_container: "Container image containing ref-summary."
        ref_summary_version: "Version of ref-summary recorded in report provenance."
        emit_tsv: "Whether to render the optional TSV report."
    }

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
