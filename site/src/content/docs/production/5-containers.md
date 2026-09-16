---
title: "Containers"
description: "Learn how containers make command-line tools portable, then package and run ref-summary with Docker."
slug: /docs/production/containers/
section: production
group: "Pipeline development"
order: 10
kind: tutorial
minutes: 25
legacy: []
---

# Containers

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/05-containers origin/chapter/05-containers
# Switched to a new branch 'chapter/05-containers'
```

Your edits and commits will remain on this local branch.

## Introduction

You ran `ref-summary` on your computer in the previous section. That worked because you
downloaded an executable built for your operating system and architecture. A pipeline
may run the same program on many other computers, and those computers may have different
tools, libraries, and settings.

A **container** packages a program with the files and system libraries it needs. This
gives the program a consistent environment wherever the container can run. Packaging
`ref-summary` in a container will let us use the same tool on a laptop, a cloud worker,
or an HPC compute node.

We'll use **Docker**, the container tool you installed earlier, to build and run our
container. Docker reads a file describing the environment, packages that environment as
an image, and starts containers from the image.

## Images and containers

Several pieces work together when you build and run a container:

1. The **host** is the computer running Docker. In this section, the host is your
   computer. Later, it may be a cloud or HPC worker.
2. A **Dockerfile** is the recipe for the packaged environment.
3. A **base image** provides a starting filesystem and installed tools. Docker downloads
   base images from an image registry, such as Docker Hub.
4. The completed **container image** is the saved, read-only package produced by the
   build. It contains the program, its supporting environment, and instructions for
   starting it.
5. A **container** is a running instance of the image. It gets an isolated filesystem
   and process, plus the command-line arguments and explicitly mapped files needed for
   that run.

Think of the image as a blueprint. It defines what a container starts with but does no
work by itself. Starting a container is like constructing a building from that blueprint.
You can start many separate containers from the same image, and each begins with the same
program and supporting files.

The image can define an **entrypoint**, which is the program that starts automatically
when the container runs. Arguments after the image name are passed to that program. A
**volume mount** can map selected files from the host into the isolated container
filesystem. These pieces let the same packaged program run with different inputs without
rebuilding the image.

Unlike a virtual machine, which simulates a complete computer with its own operating
system, a container packages only the program and its supporting environment. It starts
faster and uses fewer resources because the host still provides the operating-system
kernel, processor, memory, and disk.

Keep this flow in mind: Docker follows the Dockerfile to build an image, then starts a
container from that image, maps in the requested input files, runs the entrypoint, and
returns the program's output.

## Describe the image with a Dockerfile

To build a container image reproducibly, Docker needs a formula for assembling every
file and setting in the bundle. That formula is a **Dockerfile**: a text file containing
the ordered instructions Docker follows to build the image. Keeping the formula as source
code lets other people inspect it and build the same environment again.

Create `Dockerfile` in the root of the course repository:

```dockerfile
# Every image builds on an existing base image instead of assembling an operating-system
# environment from nothing. Start a temporary build stage from the official Rust image,
# which already contains the Rust compiler and its supporting tools.
FROM rust:1.98.1-bookworm AS builder

# The working directory is the folder where later commands run by default. Use /build
# so copied source and generated build files stay together in a known location.
WORKDIR /build

# COPY moves files from the course directory on your computer into the image. Copy the
# complete ref-summary package, including its source and dependency files, into /build.
COPY tools/ref-summary/ .

# Compile an optimized executable using the locked dependencies.
RUN cargo build --locked --release

# A second FROM starts a new build stage. Start the final, production image from a
# smaller Debian base because running ref-summary does not require the Rust compiler.
FROM debian:trixie-slim

# --from=builder copies across stages instead of from your computer. Take only the
# finished executable from the temporary builder and leave its source and build tools.
COPY --from=builder /build/target/release/ref-summary /usr/local/bin/ref-summary

# Run ref-summary when a container starts from this image.
ENTRYPOINT ["ref-summary"]
```

This Dockerfile uses a **multi-stage build**, which gives different parts of the build
different environments:

1. The `builder` stage starts from an image containing Rust, copies the `ref-summary`
   source, and compiles it.
2. The final stage starts from a smaller Debian image and copies in only the compiled
   executable.

`COPY --from=builder` reaches into the completed builder stage and copies one file into
the final stage. The builder stage is temporary; it is not part of the image we run.

This separation lets us use a large development environment to build the program without
shipping that entire environment to production. The production image does not contain
the Rust compiler, Cargo, dependency downloads, source code, or intermediate build files.
It is therefore smaller, faster to transfer, and has fewer installed components that
could contain defects or security vulnerabilities.

`ENTRYPOINT ["ref-summary"]` makes `ref-summary` the program Docker starts when you run
the image. Any arguments placed after the image name will be passed to `ref-summary`.

## Build the image

Build the image from the repository root:

```bash
docker build --tag ref-summary:v0.1.0 .
# ...
# => naming to docker.io/library/ref-summary:v0.1.0
```

`docker build` reads `Dockerfile` and creates an image. The final `.` tells Docker to use
files from the current directory while building the image.

`--tag ref-summary:v0.1.0` gives the image a local name using Docker's `name:tag`
convention. The name before the colon, `ref-summary`, groups versions of the same image.
The tag after the colon, `v0.1.0`, distinguishes this version from other builds of the
image.

Tags are short labels. Projects commonly use release numbers, often with a `v` prefix,
such as `v0.1.0`, or descriptive labels such as `dev`. If you omit the tag, Docker uses
`latest`; despite its name, `latest` is only the default tag and does not guarantee that
an image is the newest available version. This guide uses the explicit `v0.1.0` tag so
every command refers to a specific version.

Confirm that Docker saved the image:

```bash
docker image ls ref-summary:v0.1.0
# REPOSITORY    TAG       IMAGE ID       CREATED          SIZE
# ref-summary   v0.1.0    ...            ...              ...
```

## Run `ref-summary` in a container

A running container has an isolated filesystem, so it does not automatically have access
to files on your computer. This isolation prevents a container from reading or changing
unrelated files unless you explicitly make them available.

Try to run `ref-summary` before making the FASTA file available:

```console
$ docker run --rm ref-summary:v0.1.0 /data/small-reference.fasta
error: failed to open FASTA ... No such file or directory ...
```

The command passes `/data/small-reference.fasta` to `ref-summary`, but that path does not
exist inside the container. The file remains in `tests/fixtures` on your computer, and
Docker does not copy or expose it automatically.

A **volume mount** maps a file or directory on your computer to a path inside the
container. Mapping means that both paths refer to the same underlying files while the
container runs. The container uses its internal path, while you continue to use the
original path on your computer.

Run the command again with a volume mount that makes the fixtures directory available
inside the container:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
docker run --rm \
  --volume "$PWD/tests/fixtures:/data:ro" \
  ref-summary:v0.1.0 /data/small-reference.fasta
# {"schema_version":1,"sequence_count":1,...}
```
:::
:::tab{label="Linux"}
```bash
docker run --rm \
  --volume "$PWD/tests/fixtures:/data:ro" \
  ref-summary:v0.1.0 /data/small-reference.fasta
# {"schema_version":1,"sequence_count":1,...}
```
:::
:::tab{label="Windows"}
```powershell
docker run --rm `
  --volume "${PWD}\tests\fixtures:/data:ro" `
  ref-summary:v0.1.0 /data/small-reference.fasta
# {"schema_version":1,"sequence_count":1,...}
```
:::
::::

The volume has three parts:

- `$PWD/tests/fixtures` or `${PWD}\tests\fixtures` is the directory on your computer;
- `/data` is where that directory appears inside the container;
- `ro` means the container can read the files but cannot change them.

`--rm` removes the stopped container after the command finishes. It does not remove the
saved image.

Compare the container output with the expected result:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
# Run the same temporary container and read-only volume as above.
# > writes standard output to build/container-summary.json.
docker run --rm \
  --volume "$PWD/tests/fixtures:/data:ro" \
  ref-summary:v0.1.0 /data/small-reference.fasta \
  > build/container-summary.json
diff -u tests/expected/small-reference.json build/container-summary.json
# No output means the files match.
```
:::
:::tab{label="Linux"}
```bash
# Run the same temporary container and read-only volume as above.
# > writes standard output to build/container-summary.json.
docker run --rm \
  --volume "$PWD/tests/fixtures:/data:ro" \
  ref-summary:v0.1.0 /data/small-reference.fasta \
  > build/container-summary.json
diff -u tests/expected/small-reference.json build/container-summary.json
# No output means the files match.
```
:::
:::tab{label="Windows"}
```powershell
# Run the same temporary container and read-only volume as above.
# Set-Content writes standard output to build\container-summary.json.
docker run --rm `
  --volume "${PWD}\tests\fixtures:/data:ro" `
  ref-summary:v0.1.0 /data/small-reference.fasta `
  | Set-Content build\container-summary.json
$Difference = Compare-Object `
  (Get-Content tests\expected\small-reference.json) `
  (Get-Content build\container-summary.json)
if ($Difference) { $Difference; throw "Container output does not match" }
# No output means the files match.
```
:::
::::

The matching results show that the containerized tool behaves like the executable you
ran directly, even though it now runs inside a packaged environment.

## Save your progress

Save the container recipe in a local commit:

```bash
git add Dockerfile
git commit -m "Containerize ref-summary"
git status --short
# No output is expected.
```

## What you learned

You learned why pipelines package tools in containers and how an image differs from a
running container. You wrote a Dockerfile, built the `ref-summary:v0.1.0` image, mounted
a local FASTA file into a container, and confirmed that the packaged tool produced the
expected result.
