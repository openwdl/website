---
title: "Getting started"
description: "Build, test, and release a reproducible WDL 1.3 pipeline using Sprocket, containers, GitHub, and local reference data."
slug: /docs/production/getting-started/
section: production
group: "Overview"
order: 10
kind: tutorial
minutes: 6
legacy:
  - /docs/production/
---

# Getting started

This tutorial is for anyone who wants to become an expert at building and deploying
production data analysis pipelines for the cloud or high-performance computing (HPC).
You do not need experience with WDL, Git, containers, or continuous integration.
We explain each concept in detail, starting with the basics and building toward practical
expertise. For a faster-paced introduction, use [Getting started](/docs/start/overview/).

## What you will build

You will build a WDL 1.3 pipeline from an empty directory to a tested GitHub release. It
measures one or more reference genomes supplied as local FASTA files and combines the
results into an audit report.

For each reference, you provide a stable identifier, a descriptive label, and the FASTA
file to analyze. The workflow runs `ref-summary`, a small tool made specifically for this
tutorial, against each file in parallel and gathers the measurements into JSON and TSV
reports.

The course uses tiny local fixtures whose expected measurements you can inspect by hand.
In your own pipeline, the same inputs can point to reference genomes prepared by your
team or by a separate data-acquisition process.

The main output is a JSON audit report with the identity and measurements for every
reference. The pipeline also produces a separate JSON summary for each reference and, by
default, a TSV report with one reference per row.

## How you will build it

### Installing the tools

First, you'll identify your operating system and processor architecture, then install
and verify Git, GitHub CLI, Docker, Sprocket, Visual Studio Code, and the Sprocket
extension. We'll also download the course repository and confirm that the editor can
analyze its WDL. A known working environment makes later problems easier to isolate
([link](/docs/production/installing-the-tools/)).

### Git crash course

Before building the pipeline, we'll explain how Git records changes and how GitHub adds
sharing and collaboration. You'll practice reading repository state, working on a
branch, moving changes through Git's three states, committing them, and recovering
safely. Then you'll create your own fork, publish the branch, and review a draft pull
request
([link](/docs/production/git-crash-course/)).

### Command-line tools

Most WDL tasks run command-line tools, so we'll first use `ref-summary` directly. You'll
select and verify the right release for your computer, create a small FASTA genome, run
the program, check its JSON against values you can count by hand, and see how exit
statuses report success or failure. An optional bonus shows how to compile the tool from
its Rust source ([link](/docs/production/command-line-tools/)).

### Containers

Next, you'll learn how to package your tools and the system libraries they need into a
portable unit called a container. We'll distinguish images from running containers,
write a multi-stage Dockerfile, build `ref-summary:v0.1.0`, map a local FASTA file into
the container, and compare the packaged tool's result with the native program. This
consistent environment prevents differences between computers from changing the work
([link](/docs/production/containers/)).

### Units of work (Tasks)

With the tool packaged, we'll make a basic WDL task that runs `ref-summary` against a
FASTA file and returns its JSON output. Once it works, we'll strengthen the same task with
strict shell behavior, a configurable container, resource requirements, a limited retry,
typed measurements, and documentation. Adding these changes one at a time shows what
each one does and why it matters
([link](/docs/production/units-of-work-tasks/)).

### Execution graphs (Workflows)

After running the task in isolation, we'll connect it to an existing pipeline. You'll
call the task once, scatter it across several references, validate inputs before
expensive work, and gather the ordered results into one report. The resulting data
dependencies tell an execution engine what can run in parallel and what must wait
([link](/docs/production/execution-graphs-workflows/)).

### Polishing the code

Once the complete pipeline runs, we'll prepare it for review. You'll format the WDL and
run a linter, a tool that finds common mistakes and portability problems. Then you'll
improve the names and documentation, inspect generated inputs, run the polished workflow,
and confirm that its results still look correct
([link](/docs/production/polishing-the-code/)).

### Testing your pipeline

We'll turn two promises made by `summarize_reference` into automated tests. You will
create small FASTA fixtures, assert the measurements produced for valid data, require
malformed data to fail for the right reason, run both cases, and compare the complete
JSON result with a reviewed file. Together, these tests document the behavior you expect
and warn you when a later change breaks it, giving you confidence to improve the pipeline
([link](/docs/production/testing-your-pipeline/)).

### Versioning and changelogs

Before publishing the pipeline, we'll give its releases meaningful version numbers and
record notable changes for users. You'll learn semantic versioning, decide what counts as
a breaking change, and maintain a changelog that explains what changed between releases
([link](/docs/production/versioning-and-changelogs/)).

### Automating quality

Once the local checks pass, we'll build a GitHub Actions workflow one piece at a time.
It will prepare a clean runner, build the course container, check the WDL, and run the
Sprocket tests for each change. You'll publish this exercise branch so GitHub can run the
workflow. After the checks pass, a second job will publish a custom guide to importing
and using the pipeline alongside generated reference pages for its tasks, workflows,
inputs, and outputs. You'll also learn how a branch rule can require the quality check
before work can merge
([link](/docs/production/automating-quality/)).

### Release a pipeline

Once the pipeline passes its checks, we'll prepare its first release. A version tag will
start a release workflow that builds and packages native `ref-summary` executables for
each platform, creates checksums, publishes a multi-platform container image, and
verifies that the native and container forms agree. You will collect those artifacts and
the tagged source on a GitHub Release page, then verify the release as a new user would
([link](/docs/production/release-a-pipeline/)).

### Deploy a pipeline

Finally, you'll have a portable, versioned WDL release. We can connect that release to an
execution engine while keeping platform-specific storage, identity, scheduler, and cost
settings outside the analysis. This separation lets you deploy the same analysis to
different systems without rewriting its scientific logic
([link](/docs/production/deploy-a-pipeline/)).

## Check your progress

The source code for this tutorial lives in the
[`openwdl/production-guide-tutorial`](https://github.com/openwdl/production-guide-tutorial)
repository. Its `chapter/NN-topic` branches provide reference points. During the Git
crash course, you will create your own fork and use it to practice GitHub collaboration.
Every later section starts from its own branch on `origin`, the OpenWDL repository. You
will make changes and commits on a local copy of that branch without pushing routine
coursework to your fork.

Each new starting branch already contains the expected result of the previous section.
Your earlier local branches keep the work you completed, so you can compare your version
with the supplied progression or return to it later. The GitHub Actions and release
sections publish only what GitHub needs to run those exercises.

The [`openwdl/template`] repository provides a development container, pull-request
templates, Dockstore configuration, and example automation. This tutorial starts with
fewer files so you can see why each one exists. Use the template to start your next
pipeline.

## Before you start

You need a computer where you can install software and a free GitHub account. Native
Windows is supported. Windows readers will use PowerShell for host commands and Git Bash
where Sprocket needs a Bash executable.

Continue to [Installing the tools](/docs/production/installing-the-tools/).

[`openwdl/template`]: https://github.com/openwdl/template
