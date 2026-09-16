---
title: "Deploy a pipeline"
description: "Connect a released WDL pipeline to a cloud or HPC execution engine without changing its analysis."
slug: /docs/production/deploy-a-pipeline/
section: production
group: "Deployment"
order: 10
kind: tutorial
legacy:
  - /docs/production/deployment/
---

# Deploy a pipeline

## Start this section

Confirm that your current branch has no unfinished changes, then create a local branch
from this section's starting point on `origin`:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/13-deploy-a-pipeline origin/chapter/13-deploy-a-pipeline
# Switched to a new branch 'chapter/13-deploy-a-pipeline'
```

Your edits and commits will remain on this local branch.

## Introduction

This chapter will show how a released WDL pipeline connects to cloud and HPC systems.

It will cover:

- choosing a WDL execution engine for the target platform;
- configuring storage, identity, and compute access;
- mapping task resource requests to the available infrastructure;
- keeping platform settings separate from the analysis;
- confirming that the released pipeline produces the expected results.

:::note
This guide is still being written.
:::

## What you learned

You learned how to choose an execution engine, connect storage and identity, map resource
requests to infrastructure, and keep platform settings outside the analysis. You also
learned how to confirm that the deployed release produces the expected results.
