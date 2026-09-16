---
title: "Units of work (Tasks)"
description: "Create a basic WDL task around ref-summary, run it, then add the controls needed for reliable production use."
slug: /docs/production/units-of-work-tasks/
section: production
group: "Pipeline development"
order: 20
kind: tutorial
legacy:
  - /docs/production/tasks/
  - /docs/production/basic-wdl-task/
  - /docs/production/production-tasks/
---

# Units of work (Tasks)

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/06-units-of-work-tasks origin/chapter/06-units-of-work-tasks
# Switched to a new branch 'chapter/06-units-of-work-tasks'
```

Your edits and commits will remain on this local branch.

## Introduction

You now have a command-line tool packaged in a container. To use that tool in a pipeline,
we need to describe one complete unit of work: what goes in, what command runs, which
environment runs it, and what comes out.

WDL calls that unit a **task**. A task wraps command-line work in a reusable contract. The
execution engine can read the contract, prepare the inputs, start the container, run the
command, and collect the outputs without relying on instructions held only in a person's
head.

The work inside a task is just a Bash script that runs one step in the pipeline. WDL
identifies the supplied data, the tool and instructions to use, and the result that must
be returned. A clearly defined step can run on different computers while preserving the
same basic process.

## Write a basic task

Create the directory and open `wdl/tasks/summarize_reference.wdl`:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
mkdir -p wdl/tasks
code wdl/tasks/summarize_reference.wdl
# Visual Studio Code opens summarize_reference.wdl.
```
:::
:::tab{label="Linux"}
```bash
mkdir -p wdl/tasks
code wdl/tasks/summarize_reference.wdl
# Visual Studio Code opens summarize_reference.wdl.
```
:::
:::tab{label="Windows"}
```powershell
New-Item -ItemType Directory -Force wdl\tasks | Out-Null
code wdl\tasks\summarize_reference.wdl
# Visual Studio Code opens summarize_reference.wdl.
```
:::
::::

Paste this WDL into the file, then save it:

```wdl
version 1.3

task summarize_reference {
    input {
        File fasta
    }

    command <<<
        ref-summary "~{fasta}" --output summary.json
    >>>

    output {
        File summary = "summary.json"
    }

    requirements {
        container: "ref-summary:v0.1.0"
    }
}
```

`version 1.3` tells tools which WDL language rules the document follows. The four blocks
inside the task describe its execution from inputs to outputs:

1. `input` declares what the caller must supply. `File fasta` creates one required file
   input named `fasta`. Before the command runs, the execution engine makes that file
   available in the task's temporary working directory.
2. `requirements` tells the execution engine which environment to prepare. Here, it
   starts the `ref-summary:v0.1.0` container built in the previous section. This block
   appears last in the WDL source, but the engine applies it before running the command.
3. `command` contains the Bash script to run inside that container. The engine replaces
   the `~{fasta}` placeholder with the input file's path inside the container, then runs
   `ref-summary` and tells it to write `summary.json` in the working directory.
4. `output` tells the execution engine what to return after the Bash script succeeds.
   `File summary = "summary.json"` finds the file created by `ref-summary`, exposes it as
   a task output named `summary`, and preserves it before cleaning up the temporary
   working environment.

The task therefore does not need to know where the FASTA file lived on the original
computer. It refers to the `fasta` input, and the execution engine manages the concrete
path used for that run.

## Check the task

Before running the task, use Sprocket to check the WDL. `format overwrite` confirms that
Sprocket can parse the file and applies its standard layout. `lint` then looks for valid
code that could be clearer, safer, or easier to maintain.

```bash
sprocket format overwrite wdl/tasks/summarize_reference.wdl
# No output is expected.
sprocket lint wdl/tasks/summarize_reference.wdl
# ...
# note[MetaSections]: task `summarize_reference` is missing both `meta` and `parameter_meta` sections
# warning[BashSetSyntax]: missing `set` command
# note[ContainerUri]: container URI uses a mutable tag
```

No formatter output means that formatting succeeded. The linter should report the three
messages shown above: the task needs documentation, stricter Bash behavior, and an
immutable container reference. These are recommendations, not errors, so the task can
still run. We will apply each recommendation later in this section.

In [Automating quality](/docs/production/automating-quality/), we will configure GitHub
Actions to run these and other project checks automatically for every proposed change.

## Run the task

Run the task with the small FASTA file:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
sprocket run \
  --target summarize_reference \
  --output-dir output \
  wdl/tasks/summarize_reference.wdl \
  fasta=tests/fixtures/small-reference.fasta
# outputs were also written to `output/runs/summarize_reference/.../outputs.json`
# {
#   "summarize_reference.summary": ".../summary.json"
# }
```
:::
:::tab{label="Linux"}
```bash
sprocket run \
  --target summarize_reference \
  --output-dir output \
  wdl/tasks/summarize_reference.wdl \
  fasta=tests/fixtures/small-reference.fasta
# outputs were also written to `output/runs/summarize_reference/.../outputs.json`
# {
#   "summarize_reference.summary": ".../summary.json"
# }
```
:::
:::tab{label="Windows"}
```powershell
sprocket run `
  --target summarize_reference `
  --output-dir output `
  wdl\tasks\summarize_reference.wdl `
  fasta=tests\fixtures\small-reference.fasta
# outputs were also written to `output\runs\summarize_reference\...\outputs.json`
# {
#   "summarize_reference.summary": "...\summary.json"
# }
```
:::
::::

This command has four important arguments:

- `--target summarize_reference` matches the name in
  `task summarize_reference { ... }`. A WDL document can define more than one runnable
  target, so this option tells Sprocket which one to execute.
- `--output-dir output` tells Sprocket to store its run records and preserved results
  under the local `output` directory. This command-line option controls where Sprocket
  writes results; it is separate from `File summary = "summary.json"`, which declares
  what the task itself produces.
- `wdl/tasks/summarize_reference.wdl` is the source document containing the task
  definition. Sprocket reads this file to find the named target, its input declaration,
  Bash script, output declaration, and container requirement.
- `fasta=tests/fixtures/small-reference.fasta` assigns a local file to `File fasta` in
  the task's `input` block. The name to the left of `=` must match the WDL input name;
  the value to the right is the file supplied for this run.

Notice that, when you ran the container directly in the previous section, you had to use
`--volume` to map the FASTA file into the container. Sprocket handles that mapping
automatically. You supply the file's path as the `fasta` input; Sprocket creates a
temporary working directory, makes the file available inside the container, and replaces
`~{fasta}` with its container path. It then starts `ref-summary:v0.1.0`, runs the Bash
script, and collects the declared `summary.json` output.

Similarly, Sprocket handles files moving in the other direction. The
`File summary = "summary.json"` declaration tells it which file to preserve after the
Bash script finishes. Sprocket maps that file out of the container and into the run
directory under `output` on your computer, records its path in `outputs.json`, and can
pass it directly to later tasks. The file remains available after Sprocket removes the
container and temporary working directory.

The `summarize_reference.summary` key in `outputs.json` combines the task name and output
name from the WDL source. On macOS and Linux, Sprocket also maintains an `_latest` link
to the newest run:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
cat output/runs/summarize_reference/_latest/outputs.json
# {
#   "summarize_reference.summary": ".../summary.json"
# }
```
:::
:::tab{label="Linux"}
```bash
cat output/runs/summarize_reference/_latest/outputs.json
# {
#   "summarize_reference.summary": ".../summary.json"
# }
```
:::
:::tab{label="Windows"}
Open the newest directory under `output\runs\summarize_reference`, then run:

```powershell
Get-Content output\runs\summarize_reference\<RUN-DIRECTORY>\outputs.json
# {
#   "summarize_reference.summary": "...\summary.json"
# }
```
:::
::::

## Productionize the task

The basic task works, but a production task must behave predictably across repeated runs
and different computers. Several improvements below respond directly to the earlier lint
messages: strict Bash behavior addresses `BashSetSyntax`, accepting a configurable
container lets production callers replace a mutable tag with a digest, and task
documentation addresses `MetaSections`. We will also declare resources, retry temporary
failures, and return typed data—runtime concerns that the linter cannot determine from
this basic task alone.

### Make the command strict

Start with the `BashSetSyntax` warning by making the command stricter:

```wdl
command <<<
    set -euo pipefail
    ref-summary "~{fasta}" --output summary.json
>>>
```

The task's command is a small Bash script. `set -euo pipefail` turns on Bash's strict
behavior: stop when a command fails, stop when the script uses an unset variable, and
notice a failure anywhere in a chain of piped commands. Without these settings, a script
can continue after an error and produce an incomplete output that looks successful. This
change addresses Sprocket's `BashSetSyntax` warning. You do not need to remember what
each option means yet; for now, know that they are solid defaults for Bash commands in
WDL tasks.

### Make the container configurable

The basic task hard-codes `ref-summary:v0.1.0`. That local image tag is useful while
developing, but it can point to different image contents over time. Replace it with an
input:

```wdl
input {
    File fasta
    String container = "ref-summary:v0.1.0"
}

requirements {
    container: container
}
```

The input is named `container` and defaults to the `ref-summary:v0.1.0` image you built
in the previous section. Because the input has a default, local callers do not have to
provide it. A production caller can override the default with a published image.

Published tasks identify an image by its **digest**, a content fingerprint that always
points to the same image. A readable tag can move to newer contents; a digest cannot.
Accepting either value as an input keeps local use convenient while allowing production
runs to select an exact environment.

### Declare resource requirements

A local Docker run can use whatever resources are available on your computer. A cloud or
HPC **scheduler** must choose a worker before the task starts. The scheduler needs a
resource request to make that decision. Like the container reference, make each request
an input with a default so callers can adjust it for their data and execution
environment:

```wdl
input {
    File fasta
    String container = "ref-summary:v0.1.0"
    Int cpu = 1
    String memory = "256 MiB"
}

requirements {
    container: container
    cpu: cpu
    memory: memory
}
```

The defaults request one processor core and 256 mebibytes of memory, so existing callers
do not need to supply new values. A caller can override `cpu` or `memory` when a larger
FASTA or a particular platform requires different resources.

These values are requests rather than measurements of what the task will actually use. A
request that is too small can make the task fail. One that is too large can increase
cost, waste shared capacity, or leave the task waiting longer for a suitable worker.

Start with representative inputs, observe actual use, and update the defaults from
evidence. The small values here are appropriate for `ref-summary`, which reads the FASTA
one record at a time instead of loading an entire genome into memory.

WDL [`requirements`] describe conditions an execution engine must satisfy. A [`hints`]
section describes preferences that an engine may ignore. Put a value in `requirements`
when the task cannot run correctly without it.

### Retry temporary failures

Compute workers and networked storage can occasionally fail for reasons unrelated to the
input or command. For example, a worker may shut down or briefly lose access to storage.
Allow one retry:

```wdl
requirements {
    container: container
    cpu: cpu
    memory: memory
    max_retries: 1
}
```

`max_retries: 1` permits one additional attempt after the first attempt fails. A second
attempt may recover from a temporary infrastructure problem. It cannot fix invalid input,
a broken command, or a repeatable software error; it will only run the same failing work
again. Keep the number small so permanent failures remain visible and do not repeatedly
consume compute resources.

### Return typed measurements

The JSON report is a portable artifact that people can inspect or archive and that tools
outside WDL can consume. To WDL, however, a `File` is only a path: the execution engine
cannot see fields such as `total_bases` or `sequence_count`. Any downstream task that
needed those measurements would have to mount the file and run its own JSON parser.

Returning the same data as a typed WDL value avoids that repeated work. The execution
engine can check how values connect before running the pipeline, and workflows can read,
compare, gather, or pass individual measurements without another command-line program.

Add a `FastaMetrics` struct above the task in the same file:

```wdl
struct FastaMetrics {
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

Read the JSON output into that type:

```wdl
output {
    File metrics_json = "summary.json"
    FastaMetrics metrics = read_json(metrics_json)
}
```

The task now returns two views of the same result: `metrics_json` preserves the original
report, while `metrics` exposes its fields to WDL. In the next section, the workflow will
run this task for several reference genomes and gather the typed results into an
`Array[FastaMetrics]`.

`read_json` reads the file and checks whether its fields can become a `FastaMetrics`
value. If the program removes a required field or writes the wrong kind of value, the task
fails instead of passing malformed data forward.

### Document the task and struct

A person should not need to read the command implementation to understand how to use the
task. WDL provides `meta` and `parameter_meta` sections for documentation. Add them to
the task and `FastaMetrics`. For the task:

```wdl
meta {
    description: "Calculate deterministic sequence metrics for one FASTA reference."
    outputs: {
        metrics_json: "JSON sequence metrics emitted by ref-summary.",
        metrics: "Typed sequence metrics read from the JSON output.",
    }
}

parameter_meta {
    fasta: "Uncompressed nucleotide FASTA file to summarize."
    container: "Container image containing ref-summary, preferably pinned by digest."
    cpu: "Number of processor cores to request."
    memory: "Amount of memory to request, including its unit."
}
```

`meta` describes the task or struct as a whole. Its `outputs` map explains each returned
value. `parameter_meta` describes each input or struct field. Sprocket displays this
information in editor help and generated documentation, keeping the explanation beside
the interface it describes.

### Review the complete task

Your production-ready `wdl/tasks/summarize_reference.wdl` should now contain:

```wdl
version 1.3

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
        container: "Container image containing ref-summary, preferably pinned by digest."
        cpu: "Number of processor cores to request."
        memory: "Amount of memory to request, including its unit."
    }

    input {
        File fasta
        String container = "ref-summary:v0.1.0"
        Int cpu = 1
        String memory = "256 MiB"
    }

    command <<<
        set -euo pipefail
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

### Check the production-ready task

Format and lint the WDL file:

```bash
sprocket format overwrite wdl/tasks/summarize_reference.wdl
# No output is expected.
sprocket lint wdl/tasks/summarize_reference.wdl
# No warnings or errors are expected.
```

Run the task with the local development image:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
sprocket run \
  --target summarize_reference \
  --output-dir output \
  wdl/tasks/summarize_reference.wdl \
  fasta=tests/fixtures/small-reference.fasta
# outputs were also written to `output/runs/summarize_reference/.../outputs.json`
# {
#   "summarize_reference.metrics_json": ".../summary.json",
#   "summarize_reference.metrics": {
#     "schema_version": 1,
#     ...
#   }
# }
```
:::
:::tab{label="Linux"}
```bash
sprocket run \
  --target summarize_reference \
  --output-dir output \
  wdl/tasks/summarize_reference.wdl \
  fasta=tests/fixtures/small-reference.fasta
# outputs were also written to `output/runs/summarize_reference/.../outputs.json`
# {
#   "summarize_reference.metrics_json": ".../summary.json",
#   "summarize_reference.metrics": {
#     "schema_version": 1,
#     ...
#   }
# }
```
:::
:::tab{label="Windows"}
```powershell
sprocket run `
  --target summarize_reference `
  --output-dir output `
  wdl\tasks\summarize_reference.wdl `
  fasta=tests\fixtures\small-reference.fasta
# outputs were also written to `output\runs\summarize_reference\...\outputs.json`
# {
#   "summarize_reference.metrics_json": "...\summary.json",
#   "summarize_reference.metrics": {
#     "schema_version": 1,
#     ...
#   }
# }
```
:::
::::

The local tag is appropriate for this development check. Before release, we will replace
it with the published image digest.

## Save your progress

Save the completed task in a local commit:

```bash
git add wdl/tasks/summarize_reference.wdl
git commit -m "Add production-ready summary task"
git status --short
# No output is expected.
```

## What you learned

You learned that a WDL task packages command-line work behind declared inputs and outputs.
You created a basic task that runs `ref-summary` in its container, checked it with
Sprocket, ran it against a FASTA file, and found the collected JSON output.

You then made the task production-ready by adding strict command behavior, a configurable
container, resource requirements, a limited retry, typed outputs, and documentation. Each
addition solves a specific problem that appears when work moves from one local run to
repeated execution across cloud or HPC workers.

[`requirements`]: https://github.com/openwdl/wdl/blob/wdl-1.3/SPEC.md#-requirements-section
[`hints`]: https://github.com/openwdl/wdl/blob/wdl-1.3/SPEC.md#-hints-section
