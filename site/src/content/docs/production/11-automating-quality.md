---
title: "Automating quality"
description: "Build one deterministic CI check from top to bottom and run it automatically on every pull request."
slug: /docs/production/automating-quality/
section: production
group: "Versioning and release"
order: 20
kind: tutorial
minutes: 25
legacy:
  - /docs/production/github-actions/
---

# Automating quality

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/11-github-actions origin/chapter/11-github-actions
# Switched to a new branch 'chapter/11-github-actions'
```

Your work remains local until the end of this section, when you will publish this branch
once so GitHub can run the automation.

## Introduction

The checks we have run so far protect the pipeline only when someone remembers to run
them. A contributor can skip a command, use an older tool, or have an uncommitted local
file that hides a problem.

**Continuous integration**, usually shortened to **CI**, runs the same checks
automatically whenever someone proposes a change. It starts from a clean copy of the
repository and reports the result on the pull request. This gives every change the same
baseline and lets reviewers see whether the pipeline still works before merging it.

We'll use **GitHub Actions**, GitHub's automation system, to build one CI check from top
to bottom.

## How GitHub Actions works

GitHub Actions reads YAML files from `.github/workflows/`. These files are called
**GitHub Actions workflows**. They are automation definitions and are separate from the
WDL workflows that describe our data analysis.

An Actions workflow has a few main pieces:

- an **event** decides when the automation starts, such as opening a pull request;
- a **job** groups work that runs on one machine;
- a **runner** is the machine that performs a job;
- a **step** is one operation inside the job;
- an **action** is reusable code that performs a common step.

GitHub creates a fresh runner for each job. That clean environment exposes dependencies
that exist on one contributor's computer but were never recorded in the project.

See [Understanding GitHub Actions] for the complete model. Here, we'll introduce each
piece as we add it to one workflow.

## Create the workflow

Create the workflow directory and open `.github/workflows/ci.yml`:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
mkdir -p .github/workflows
code .github/workflows/ci.yml
# Visual Studio Code opens ci.yml.
```
:::
:::tab{label="Linux"}
```bash
mkdir -p .github/workflows
code .github/workflows/ci.yml
# Visual Studio Code opens ci.yml.
```
:::
:::tab{label="Windows"}
```powershell
New-Item -ItemType Directory -Force .github\workflows | Out-Null
code .github\workflows\ci.yml
# Visual Studio Code opens ci.yml.
```
:::
::::

We'll build this file from top to bottom. Add each YAML block below the previous one,
leaving the earlier content in place. Preserve the indentation shown because YAML uses
spaces to determine which settings belong together.

Start by adding the workflow name:

```yaml
name: CI
```

`CI` is the name GitHub will display on pull requests and in the repository's
**Actions** tab.

## Trigger the check

Append the `on` section below `name`. It lists the repository events that start the
workflow:

```yaml
on:
  pull_request:
  push:
    branches: [main]
```

With no branch filter under `pull_request`, the workflow checks every pull request.
The `push` filter also runs it whenever a commit reaches `main`, including after a pull
request merges. Feature-branch pushes do not start a second, redundant run.

## Limit its permissions

Automation should receive only the access it needs. This workflow reads source code but
does not change the repository. Append:

```yaml
permissions:
  contents: read
```

Read-only access limits what a broken command or third-party action could do. A later
release workflow will need separate write access, but those permissions do not belong in
pull-request checks.

## Add a job and runner

Append the `jobs` section below `permissions`:

```yaml
jobs:
  verify:
    runs-on: ubuntu-24.04
    steps:
```

`verify` is the job's identifier. `runs-on` asks GitHub for a fresh `ubuntu-24.04`
runner. Every step we add beneath `steps` will run in order on that same temporary
machine.

The runner starts without the course source or project-specific tools. The workflow must
prepare everything it needs.

## Check out the source

The first step copies the exact repository revision onto the runner. Append it directly
below the existing `steps:` line:

```yaml
      - name: Check out source
        uses: actions/checkout@v7
```

`name` gives the step a readable label. `uses` runs a reusable action instead of a shell
command. `actions/checkout@v7` follows compatible releases within major version 7 without
automatically moving to a future major version.

## Install the project tools

Append the Sprocket setup step at the same indentation as the checkout step:

```yaml
      - name: Install Sprocket
        uses: stjude-rust-labs/setup-sprocket@v1
        with:
          version: latest
          github-token: ${{ github.token }}
```

`stjude-rust-labs/setup-sprocket@v1` selects the correct Sprocket executable for the
runner, verifies the download, caches it for later runs, and adds it to `PATH`. The
`github-token` input lets the action query GitHub's release API without the lower
anonymous rate limit.

## Run deterministic checks

Add a step that builds the image used by the WDL task. `Dockerfile` compiles
`ref-summary` inside its builder stage, so the runner does not need a separate Rust
installation:

```yaml
      - name: Build ref-summary image
        run: docker build --tag ref-summary:v0.1.0 .
```

Append the WDL checks:

```yaml
      - name: Check WDL
        run: |
          sprocket format check wdl
          sprocket lint wdl
```

Append one command that runs both Sprocket test cases:

```yaml
      - name: Test summarize_reference
        run: |
          sprocket dev test wdl/tasks/summarize_reference.wdl \
            --workspace . \
            --fixtures-dir "$PWD/tests/fixtures" \
            --clean-all
```

Sprocket discovers `summarize_reference.yaml`, runs `valid-fasta` and `malformed-fasta`,
and applies their assertions. `--clean-all` removes the temporary execution directories
when the command finishes.

Every check is now visible in `ci.yml`. A failed job names the exact step that stopped,
making the log easier to navigate.

## Publish documentation to GitHub Pages

The `verify` job runs for every pull request and for pushes to `main`. We want
documentation deployment to be more restrictive: it should publish the generated WDL
reference only after verified code reaches `main`.

Now enable GitHub Actions as the Pages source:

1. Open the repository on GitHub.
2. Select **Settings**.
3. Select **Pages** under **Code, planning, and automation**.
4. Under **Build and deployment**, set **Source** to **GitHub Actions**.

GitHub Pages sites are public, even when some account plans allow Pages for private
repositories. Do not publish documentation containing secrets or private data. See
[GitHub Pages custom workflows] for the current setup requirements.

Now append a second job after the complete `verify` job:

```yaml
  deploy-docs:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: verify
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
```

`if` limits this job to pushes on `main`, so pull requests run the checks without
publishing a site. `needs: verify` waits for the CI job and prevents publication when a
check fails.

GitHub Pages requires `pages: write` and `id-token: write` to publish the site securely.
The `github-pages` environment records the deployment and its URL.

Append the steps that prepare the runner:

```yaml
      - name: Check out source
        uses: actions/checkout@v7

      - name: Install Sprocket
        uses: stjude-rust-labs/setup-sprocket@v1
        with:
          version: latest
          github-token: ${{ github.token }}

      - name: Configure GitHub Pages
        uses: actions/configure-pages@v6
```

Generate the static documentation:

```yaml
      - name: Generate WDL documentation
        run: |
          sprocket dev doc wdl \
            --output build/wdl-docs \
            --overwrite \
            --index-page docs/index.md \
            --github-url "${{ github.server_url }}/${{ github.repository }}"
```

Pass the generated files to GitHub Pages and deploy them:

```yaml
      - name: Upload GitHub Pages site
        uses: actions/upload-pages-artifact@v5
        with:
          path: build/wdl-docs

      - name: Deploy GitHub Pages site
        id: deployment
        uses: actions/deploy-pages@v5
```

`actions/upload-pages-artifact` packages the site for the deployment job. This is the
required handoff to GitHub Pages, not a general documentation download.
`actions/deploy-pages` publishes the site and returns its public URL through the
`deployment` step.

## Review the complete workflow

You have now appended every part of the workflow. Your completed
`.github/workflows/ci.yml` should contain:

```yaml
name: CI
on:
  pull_request:
  push:
    branches: [main]
permissions:
  contents: read
jobs:
  verify:
    runs-on: ubuntu-24.04
    steps:
      - name: Check out source
        uses: actions/checkout@v7
      - name: Install Sprocket
        uses: stjude-rust-labs/setup-sprocket@v1
        with:
          version: latest
          github-token: ${{ github.token }}
      - name: Build ref-summary image
        run: docker build --tag ref-summary:v0.1.0 .
      - name: Check WDL
        run: |
          sprocket format check wdl
          sprocket lint wdl
      - name: Test summarize_reference
        run: |
          sprocket dev test wdl/tasks/summarize_reference.wdl \
            --workspace . \
            --fixtures-dir "$PWD/tests/fixtures" \
            --clean-all
  deploy-docs:
    if: github.event_name == 'push' && github.ref == 'refs/heads/main'
    needs: verify
    runs-on: ubuntu-24.04
    permissions:
      contents: read
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Check out source
        uses: actions/checkout@v7
      - name: Install Sprocket
        uses: stjude-rust-labs/setup-sprocket@v1
        with:
          version: latest
          github-token: ${{ github.token }}
      - name: Configure GitHub Pages
        uses: actions/configure-pages@v6
      - name: Generate WDL documentation
        run: |
          sprocket dev doc wdl \
            --output build/wdl-docs \
            --overwrite \
            --index-page docs/index.md \
            --github-url "${{ github.server_url }}/${{ github.repository }}"
      - name: Upload GitHub Pages site
        uses: actions/upload-pages-artifact@v5
        with:
          path: build/wdl-docs
      - name: Deploy GitHub Pages site
        id: deployment
        uses: actions/deploy-pages@v5
```

YAML indentation determines which settings belong to each event, job, and step. Compare
the complete file with the smaller pieces above before saving it.

## Save your progress

Forked repositories may start with Actions disabled. Before you push, open the
**Actions** tab in your fork and select **I understand my workflows, go ahead and enable
them** if GitHub displays that message.

Most sections keep your work local. This section needs a pull request because GitHub
Actions can run only code available on GitHub. Commit `ci.yml`, then publish the exercise
branch to your fork:

```bash
git add .github/workflows/ci.yml
git commit -m "Add continuous integration and documentation deployment"
git push fork chapter/11-github-actions
# ... chapter/11-github-actions -> chapter/11-github-actions
```

Create a pull request inside your fork:

1. Open your `production-wdl-course` fork on GitHub. Check the repository owner at the
   top of the page to make sure you are in your fork, not `openwdl/production-wdl-course`.
2. Select **Pull requests**, then select **New pull request**.
3. If GitHub initially compares your fork with the OpenWDL repository, select
   **compare across forks** so you can choose both repositories.
4. Set **base repository** to your fork and **base** to `main`. The base is where the
   proposed changes would go.
5. Set **head repository** to the same fork and **compare** to
   `chapter/11-github-actions`. The compare branch contains the proposed changes.
6. Check the summary and file list. GitHub should show the commits and files you added
   in this section, with `main` receiving the changes.
7. Select **Create pull request**. Use `Add continuous integration and documentation
   deployment` as the title, add a short description, and select **Create pull request**
   again.

Opening the pull request sends the `pull_request` event and starts `CI`. Only `verify`
runs because the pull request has not changed `main`.

## See the check on GitHub

Follow the workflow from the pull request:

1. Open the pull request's **Checks** tab. A pending `CI / verify` check should appear
   shortly after the pull request opens.
2. Select the `verify` job. GitHub shows the workflow steps in order: check out the
   source, install Sprocket, build the image, check the WDL, and run the tests.
3. Expand a completed step to see its command and output. The final test step should
   report successful `valid-fasta` and `malformed-fasta` cases.
4. Wait for the job to finish. A green check beside `verify` means every step passed.
   `deploy-docs` is skipped because this event is a pull request rather than a push to
   `main`.

If the job fails, select the failed step and read the first error in its log. Run the same
command locally, fix the underlying problem, commit the fix, and push the new commit to
`chapter/11-github-actions`. GitHub adds the commit to the existing pull request and runs
`verify` again.

## Close the practice pull request

After `verify` passes, return to the pull request's **Conversation** tab and select
**Close pull request**. Do not merge it. GitHub marks the pull request as closed and
leaves `main` unchanged.

Closing the pull request ends this exercise without publishing the practice changes. In
a production repository, merging a verified pull request would create a push to `main`.
That push would run `verify` again and then run `deploy-docs` to update the GitHub Pages
site.

## Require the check before merge

In a production repository, maintainers can protect the default branch with a branch rule
that requires `verify` to pass before merging. A required check turns CI from advice into
a guard: GitHub will not merge a pull request while the project reports a known failure.

Checks do not replace review. They answer repeatable questions that software can verify,
leaving reviewers more time for scientific intent, design decisions, and risks that
require judgment.

## What you learned

You built one deterministic CI check from top to bottom. You chose when it runs, limited
its permissions, prepared a clean runner, checked out the proposed source, installed the
project tools, and ran the local test suite.

GitHub now applies the same baseline to every pull request and push to `main`. After a
successful push to `main`, a second job generates the WDL reference and publishes it as
a GitHub Pages site.

[GitHub Pages custom workflows]: https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages
[Understanding GitHub Actions]: https://docs.github.com/en/actions/get-started/understand-github-actions
