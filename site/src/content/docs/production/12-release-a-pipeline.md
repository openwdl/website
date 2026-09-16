---
title: "Release a pipeline"
description: "Publish a versioned pipeline with native executables, checksums, a multi-platform container image, and a GitHub Release."
slug: /docs/production/release-a-pipeline/
section: production
group: "Versioning and release"
order: 30
kind: tutorial
minutes: 30
legacy:
  - /docs/production/releases/
---

# Release a pipeline

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/12-release-a-pipeline origin/chapter/12-release-a-pipeline
# Switched to a new branch 'chapter/12-release-a-pipeline'
```

Your branch and its commits will remain local. Later, you will publish only the release
tag needed to start the GitHub release workflow.

## Introduction

The pipeline now has a version, a changelog, automated tests, and published
documentation. A release turns that reviewed source into artifacts that people can
download and run.

For this project, a release includes:

- native `ref-summary` executables for supported operating systems and architectures;
- checksums that let users verify those downloads;
- a multi-platform `ref-summary` container image;
- the tagged source code;
- one GitHub Release page that collects the artifacts and release notes.

We'll automate that process so every version is built and checked the same way. The
workflow will start when we push a semantic version tag such as `v0.1.0`.

## Create the release workflow

Open `.github/workflows/release.yml`:

```bash
code .github/workflows/release.yml
# Visual Studio Code opens release.yml.
```

We'll build this file from top to bottom. Append each YAML block below the previous one
and preserve the indentation shown.

Start with the workflow name and tag trigger:

```yaml
name: Release
on:
  push:
    tags: ["v*.*.*"]
permissions:
  contents: read
```

The tag pattern starts the workflow for names such as `v0.1.0`. Read-only permission is
the safe default; the publishing job will request write access only where it needs it.

## Build native executables

Users need an executable compiled for their operating system and processor architecture.
A **matrix** runs the same job several times with different settings:

```yaml
jobs:
  binaries:
    strategy:
      fail-fast: false
      matrix:
        include:
          - runner: ubuntu-24.04
            target: x86_64-unknown-linux-gnu
            executable: ref-summary
            archive: tar
          - runner: ubuntu-24.04-arm
            target: aarch64-unknown-linux-gnu
            executable: ref-summary
            archive: tar
          - runner: macos-15-intel
            target: x86_64-apple-darwin
            executable: ref-summary
            archive: tar
          - runner: macos-14
            target: aarch64-apple-darwin
            executable: ref-summary
            archive: tar
          - runner: windows-2022
            target: x86_64-pc-windows-msvc
            executable: ref-summary.exe
            archive: zip
    runs-on: ${{ matrix.runner }}
    steps:
```

GitHub creates one `binaries` job for each matrix entry. `fail-fast: false` lets the
other platforms finish when one fails, giving us a complete picture of the problem.

Append the build steps:

```yaml
      - name: Check out source
        uses: actions/checkout@v7
      - name: Install Rust target
        shell: bash
        run: |
          rustup toolchain install 1.98.1 --profile minimal
          rustup default 1.98.1
          rustup target add "${{ matrix.target }}"
      - name: Build and test native executable
        shell: bash
        run: |
          cargo test --manifest-path tools/ref-summary/Cargo.toml --locked
          cargo build \
            --manifest-path tools/ref-summary/Cargo.toml \
            --locked \
            --release \
            --target "${{ matrix.target }}"
          binary="tools/ref-summary/target/${{ matrix.target }}/release/${{ matrix.executable }}"
          "$binary" tests/fixtures/small-reference.fasta --output native-summary.json
          cmp tests/expected/small-reference.json native-summary.json
```

The job compiles the executable, runs it against `small-reference.fasta`, and compares
the complete JSON result with the expected file. A binary that builds but produces the
wrong answer cannot become a release artifact.

## Package each executable

Append a step that creates a `.tar.gz` archive on macOS and Linux or a `.zip` archive on
Windows:

```yaml
      - name: Package native executable
        shell: bash
        run: |
          mkdir -p dist/package
          cp \
            "tools/ref-summary/target/${{ matrix.target }}/release/${{ matrix.executable }}" \
            dist/package/
          if [[ "${{ matrix.archive }}" == "zip" ]]; then
            7z a "dist/ref-summary-${GITHUB_REF_NAME}-${{ matrix.target }}.zip" ./dist/package/*
          else
            tar \
              -C dist/package \
              -czf "dist/ref-summary-${GITHUB_REF_NAME}-${{ matrix.target }}.tar.gz" \
              "${{ matrix.executable }}"
          fi
      - name: Upload native executable
        uses: actions/upload-artifact@v7
        with:
          name: ref-summary-${{ matrix.target }}
          path: dist/ref-summary-*
          if-no-files-found: error
```

These temporary workflow artifacts carry each platform build into the publishing job.
They are not the final GitHub Release downloads.

## Collect the release artifacts

Add a second job after `binaries`:

```yaml
  publish:
    needs: binaries
    runs-on: ubuntu-24.04
    permissions:
      contents: write
      packages: write
    steps:
```

`needs: binaries` prevents publication unless every platform build succeeds. This job
needs `contents: write` to create the GitHub Release and `packages: write` to publish the
container image.

Append the steps that check out the tagged source, validate the tag, and collect the
native archives:

```yaml
      - name: Check out source
        uses: actions/checkout@v7
      - name: Validate semantic version tag
        run: |
          if [[ ! "$GITHUB_REF_NAME" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "tag must match vMAJOR.MINOR.PATCH" >&2
            exit 1
          fi
      - name: Download native executables
        uses: actions/download-artifact@v8
        with:
          pattern: ref-summary-*
          path: dist
          merge-multiple: true
      - name: Create checksums
        run: (cd dist && sha256sum ref-summary-* > SHA256SUMS)
```

`SHA256SUMS` records a checksum for every archive. Users can compare a downloaded file
with this list to detect corruption or an incomplete download.

## Publish the container image

A container image is built for a specific operating system and processor architecture.
If we publish only the image built natively by the GitHub runner, it will support
`linux/amd64` but may fail with an executable-format error on an Arm worker. Cloud and
HPC environments can contain both `amd64` and `arm64` machines.

A **multi-platform image** publishes a separate image for each architecture under one
tag. When a worker pulls that tag, the container registry selects the compatible image
automatically. The WDL can therefore use one container reference without knowing which
processor its execution engine will choose.

Append the Docker setup and publishing steps:

```yaml
      - name: Register emulators
        uses: docker/setup-qemu-action@v4
      - name: Configure Docker Buildx
        uses: docker/setup-buildx-action@v4
      - name: Publish versioned container image
        env:
          GHCR_TOKEN: ${{ github.token }}
        run: |
          echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
          version=${GITHUB_REF_NAME#v}
          image="ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/ref-summary"
          docker buildx build \
            --platform linux/amd64,linux/arm64 \
            --tag "$image:$version" \
            --push .
```

QEMU lets the runner build for another processor architecture. Buildx creates both image
variants and publishes them under one version tag in GitHub Container Registry.

## Compare the published image

A successful upload does not prove that the published image runs correctly. Append one
last comparison:

```yaml
      - name: Compare native and published container output
        run: |
          version=${GITHUB_REF_NAME#v}
          image="ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/ref-summary:$version"
          digest=$(docker buildx imagetools inspect \
            "$image" \
            --format '{{json .Manifest.Digest}}' | tr -d '"')
          mkdir -p build/native
          tar \
            -C build/native \
            -xzf "dist/ref-summary-${GITHUB_REF_NAME}-x86_64-unknown-linux-gnu.tar.gz"
          build/native/ref-summary \
            tests/fixtures/small-reference.fasta \
            --output build/native-summary.json
          docker run --rm \
            --volume "$PWD/tests/fixtures:/data:ro" \
            "ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/ref-summary@$digest" \
            /data/small-reference.fasta \
            > build/container-summary.json
          cmp build/native-summary.json build/container-summary.json
```

The job resolves the published image tag to an immutable digest, then compares its output
with the native Linux executable. The GitHub Release is created only when those two
published forms behave the same way.

## Create the GitHub Release

Append the final step:

```yaml
      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release create "$GITHUB_REF_NAME" --generate-notes dist/*
```

`gh release create` creates the release page for the tag, generates release notes, and
attaches every file under `dist`, including the native archives and `SHA256SUMS`. GitHub
also provides source archives for the tagged commit.

## Review the complete workflow

Your completed `.github/workflows/release.yml` should contain:

```yaml
name: Release
on:
  push:
    tags: ["v*.*.*"]
permissions:
  contents: read
jobs:
  binaries:
    strategy:
      fail-fast: false
      matrix:
        include:
          - runner: ubuntu-24.04
            target: x86_64-unknown-linux-gnu
            executable: ref-summary
            archive: tar
          - runner: ubuntu-24.04-arm
            target: aarch64-unknown-linux-gnu
            executable: ref-summary
            archive: tar
          - runner: macos-15-intel
            target: x86_64-apple-darwin
            executable: ref-summary
            archive: tar
          - runner: macos-14
            target: aarch64-apple-darwin
            executable: ref-summary
            archive: tar
          - runner: windows-2022
            target: x86_64-pc-windows-msvc
            executable: ref-summary.exe
            archive: zip
    runs-on: ${{ matrix.runner }}
    steps:
      - name: Check out source
        uses: actions/checkout@v7
      - name: Install Rust target
        shell: bash
        run: |
          rustup toolchain install 1.98.1 --profile minimal
          rustup default 1.98.1
          rustup target add "${{ matrix.target }}"
      - name: Build and test native executable
        shell: bash
        run: |
          cargo test --manifest-path tools/ref-summary/Cargo.toml --locked
          cargo build \
            --manifest-path tools/ref-summary/Cargo.toml \
            --locked \
            --release \
            --target "${{ matrix.target }}"
          binary="tools/ref-summary/target/${{ matrix.target }}/release/${{ matrix.executable }}"
          "$binary" tests/fixtures/small-reference.fasta --output native-summary.json
          cmp tests/expected/small-reference.json native-summary.json
      - name: Package native executable
        shell: bash
        run: |
          mkdir -p dist/package
          cp \
            "tools/ref-summary/target/${{ matrix.target }}/release/${{ matrix.executable }}" \
            dist/package/
          if [[ "${{ matrix.archive }}" == "zip" ]]; then
            7z a "dist/ref-summary-${GITHUB_REF_NAME}-${{ matrix.target }}.zip" ./dist/package/*
          else
            tar \
              -C dist/package \
              -czf "dist/ref-summary-${GITHUB_REF_NAME}-${{ matrix.target }}.tar.gz" \
              "${{ matrix.executable }}"
          fi
      - name: Upload native executable
        uses: actions/upload-artifact@v7
        with:
          name: ref-summary-${{ matrix.target }}
          path: dist/ref-summary-*
          if-no-files-found: error
  publish:
    needs: binaries
    runs-on: ubuntu-24.04
    permissions:
      contents: write
      packages: write
    steps:
      - name: Check out source
        uses: actions/checkout@v7
      - name: Validate semantic version tag
        run: |
          if [[ ! "$GITHUB_REF_NAME" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
            echo "tag must match vMAJOR.MINOR.PATCH" >&2
            exit 1
          fi
      - name: Download native executables
        uses: actions/download-artifact@v8
        with:
          pattern: ref-summary-*
          path: dist
          merge-multiple: true
      - name: Create checksums
        run: (cd dist && sha256sum ref-summary-* > SHA256SUMS)
      - name: Register emulators
        uses: docker/setup-qemu-action@v4
      - name: Configure Docker Buildx
        uses: docker/setup-buildx-action@v4
      - name: Publish versioned container image
        env:
          GHCR_TOKEN: ${{ github.token }}
        run: |
          echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GITHUB_ACTOR" --password-stdin
          version=${GITHUB_REF_NAME#v}
          image="ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/ref-summary"
          docker buildx build \
            --platform linux/amd64,linux/arm64 \
            --tag "$image:$version" \
            --push .
      - name: Compare native and published container output
        run: |
          version=${GITHUB_REF_NAME#v}
          image="ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/ref-summary:$version"
          digest=$(docker buildx imagetools inspect \
            "$image" \
            --format '{{json .Manifest.Digest}}' | tr -d '"')
          mkdir -p build/native
          tar \
            -C build/native \
            -xzf "dist/ref-summary-${GITHUB_REF_NAME}-x86_64-unknown-linux-gnu.tar.gz"
          build/native/ref-summary \
            tests/fixtures/small-reference.fasta \
            --output build/native-summary.json
          docker run --rm \
            --volume "$PWD/tests/fixtures:/data:ro" \
            "ghcr.io/${GITHUB_REPOSITORY_OWNER,,}/ref-summary@$digest" \
            /data/small-reference.fasta \
            > build/container-summary.json
          cmp build/native-summary.json build/container-summary.json
      - name: Create GitHub Release
        env:
          GH_TOKEN: ${{ github.token }}
        run: gh release create "$GITHUB_REF_NAME" --generate-notes dist/*
```

Confirm that `publish` depends on `binaries`, write permissions exist only on `publish`,
and the GitHub Release step is last.

## Save the release workflow

Save the release workflow in a local commit:

```bash
git add .github/workflows/release.yml
git commit -m "Add release automation"
git status --short
# No output is expected.
```

## Create version `0.1.0`

Create an annotated tag and push it to your fork:

```bash
git tag -a v0.1.0 -m "Release v0.1.0"
git push fork v0.1.0
# * [new tag] v0.1.0 -> v0.1.0
```

The branch remains local. Pushing the tag sends the tagged commit and its release
workflow to GitHub, which starts the `Release` workflow. Do not move a published tag. If
a release is wrong, fix the problem and publish a new version.

## Inspect the release

Open your fork on GitHub:

1. Select the **Actions** tab and open the newest **Release** run.
2. Confirm that every `binaries` matrix job passed.
3. Confirm that `publish` ran only after those jobs.
4. Open the repository's **Releases** page.
5. Open `v0.1.0` and confirm that every native archive and `SHA256SUMS` is attached.
6. Open the repository's **Packages** page and confirm that the `ref-summary` image has a
   `0.1.0` tag.

## Verify the published release

Test the release as a new user would:

1. Clone the `v0.1.0` source into a new directory.
2. Download the native archive for your platform and `SHA256SUMS`.
3. Verify the archive checksum.
4. Run the native executable against `small-reference.fasta`.
5. Pull the container image by its published digest.
6. Run the container against the same fixture.
7. Confirm that both results match `tests/expected/small-reference.json`.

This final smoke test checks the downloadable files, permissions, package visibility, and
instructions that local source tests cannot see.

## Save your progress

Your release branch and commit remain local. GitHub has the `v0.1.0` tag, the tagged
source and workflow, and the artifacts created from them. Confirm that your working tree
remains clean:

```bash
git status --short
# No output is expected.
```

## What you learned

You turned a reviewed pipeline version into published artifacts. The release workflow
builds and tests native executables, packages them for each platform, creates checksums,
publishes a multi-platform container image, and verifies that the native and container
forms agree.

You also created a GitHub Release from an immutable version tag and checked the result as
a new user would. Someone can now download `v0.1.0`, verify what they received, and run
the same version of the pipeline's tool.
