---
title: "Git crash course"
description: "Learn the Git commands needed to track, review, compare, and recover changes while building a production pipeline."
slug: /docs/production/git-crash-course/
section: production
group: "Environment setup"
order: 15
kind: guide
legacy: []
---

# Git crash course

## Start this section

From the course directory, switch to this section's starting branch:

```bash
git fetch origin
# No output is expected.
git switch chapter/03-git-crash-course
# Already on 'chapter/03-git-crash-course'
# or: Switched to branch 'chapter/03-git-crash-course'
git status --short
# No output is expected.
```

`git fetch origin` checks GitHub for updated branches without changing your files.
`git switch` selects the starting branch for this section. The empty output from
`git status --short` means you have a clean copy with no unfinished changes.

## Introduction

Software changes constantly. Git records meaningful versions of a project so you can see
what changed, explain why it changed, and return to an earlier version when something
goes wrong. Each saved version includes the changes, their author, the time, and a short
description.

Git also lets teammates work on the same source code without passing files back and forth
or replacing one another's unfinished work. Each person can work on a separate branch
(which we'll define in a minute), review the exact differences, and combine completed
work in a controlled way.

Finally, Git connects the project to services such as [GitHub]. Those services make it
easier to share repositories with colleagues and the community, discuss changes, run
automated checks, and publish releases.

## Git and GitHub are different

Imagine a workshop that builds chairs. **Git is the workshop's versioning system:** it
keeps each saved chair design, records what changed, and organizes work on new variations.
The workshop has a main design: the canonical, production version of the chair currently
being manufactured. Every time someone wants to revise the chair, they start with a copy
of that design, assign it to a clean workbench in the corner of the workshop, and begin
making modifications. In Git, that separate workbench is a branch.

One team can try a different back while another tests stronger legs, without changing
the chair already in production. When a variation works, the workshop can review it and
add that change to the main design.

**GitHub is a shared online workshop and community built around Git.** It stores copies
of Git repositories and adds tools for sharing, discussing, reviewing, and combining
changes.

Git is software that works on your computer. You can use it without GitHub, including
when you are offline. GitHub is one of several online services that host Git repositories.
We use GitHub in this tutorial because the course repository and its collaboration tools
live there.

## Read the repository state

A **repository** is a project that Git tracks. It includes the current files and the
saved history behind them. In the chair analogy above, the repository is the entire
workshop: the main production design, every variation being tested on a separate
workbench, and the history of saved designs. Your terminal should still be inside the
`production-guide-tutorial` repository that you cloned in the previous section.

Ask Git where you are:

```bash
git branch --show-current
# chapter/03-git-crash-course

git status
# On branch chapter/03-git-crash-course
# Your branch is up to date with 'origin/chapter/03-git-crash-course'.
# nothing to commit, working tree clean

git remote -v
# origin  https://github.com/openwdl/production-guide-tutorial.git (fetch)
# origin  https://github.com/openwdl/production-guide-tutorial.git (push)
```

A **branch** is a named line of changes. The current branch tells Git which line of
changes you are working on. A **remote** is a named connection to another copy of the
repository, usually one hosted online. Here, `origin` points to the OpenWDL copy on
GitHub. Your URL may begin with `git@github.com:` instead of `https://`; both forms can
identify the same repository.

Unlike cloud collaboration tools you may be used to, Git does not automatically keep
your local files and the repository on GitHub in sync. You **push** local commits to send
them to GitHub, and **pull** remote commits to bring them to your computer. We'll explain
and practice those steps later in this section.

## Understand Git's three states

Git moves changes through three states:

| State | Where it appears in your work | How to inspect it |
| --- | --- | --- |
| Working tree | You are creating or editing files | `git status` and `git diff` |
| Staging area | You are choosing changes for the next saved version | `git diff --staged` |
| Committed history | Git has saved the selected changes as a version | `git log` |

You interact with the **working tree** whenever you edit the project in Visual Studio
Code or another program. It is the project directory on your computer, including changes
that Git has not saved. In our workshop analogy, think of it like the chair currently
being modified on a workbench.

You interact with the **staging area** after editing, when you use `git add` to select the
changes that belong in the next saved version. The staging area exists because you are
usually bundling related changes into a package to commit together. Often you want that
package to include every change you made, but not always. Some changes may be unrelated
or not ready yet, so they remain in the working tree. In the workshop, think of the
staging area as the parts of the new chair design that are ready to go into the next
version, while unfinished ideas remain at the workbench.

You interact with the **committed history** when you use `git commit` to save the staged
changes. Each saved version is called a **commit**. Commands such as `git log` let you
read that history, while later commits can build on or correct earlier ones. Think of it
like the workshop's archive of approved chair designs and the changes made in each
version.

Use `git status` throughout this section. It shows which files are in each state and often
suggests the next command.

## Create a practice branch

Do not make practice changes on a supplied chapter branch. Create your own branch from
the current starting point:

```bash
git switch -c practice/git-crash-course
# Switched to a new branch 'practice/git-crash-course'

git branch --show-current
# practice/git-crash-course
```

You _branched_ `practice/git-crash-course` off of `chapter/03-git-crash-course`. That is
why the new branch starts with the same files and history as the chapter branch. New
commits will belong to the practice branch, leaving the supplied course branch unchanged.

## Make and inspect a change

Create a small Markdown file for this exercise:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
printf '%s\n' '# Git practice' '' 'This file records my first Git practice change.' > git-practice.md
# No output is expected.

cat git-practice.md
# # Git practice
#
# This file records my first Git practice change.
```
:::
:::tab{label="Linux"}
```bash
printf '%s\n' '# Git practice' '' 'This file records my first Git practice change.' > git-practice.md
# No output is expected.

cat git-practice.md
# # Git practice
#
# This file records my first Git practice change.
```
:::
:::tab{label="Windows"}
```powershell
@(
    "# Git practice"
    ""
    "This file records my first Git practice change."
) | Set-Content git-practice.md
# No output is expected.

Get-Content git-practice.md
# # Git practice
#
# This file records my first Git practice change.
```
:::
::::

The `>` operator on macOS and Linux, and `Set-Content` on Windows, create the file. Now
ask Git what changed:

```bash
git status --short
# ?? git-practice.md
```

`??` means that the file is **untracked**. By default, Git leaves new files untracked
until you explicitly tell it to track them with `git add`. The file exists in the working
tree, but Git will not include it in a commit yet. Read the file before staging it and
confirm that it contains only the intended text.

After you add and commit the file, it becomes **tracked**. That means Git recognizes the
file as part of the repository, remembers its saved contents, and reports when you modify
or delete it. Tracking does not automatically save new edits; you still choose when to
stage and commit them.

## Stage and commit the change

Add the file to the staging area:

```bash
git add git-practice.md
# No output is expected.

git status --short
# A  git-practice.md
```

`A` in the first column means the new file is staged. Review the exact change that the
next commit will save:

```bash
git diff --staged
# diff --git a/git-practice.md b/git-practice.md
# new file mode 100644
# ...
# +# Git practice
# +
# +This file records my first Git practice change.
```

Lines beginning with `+` are additions. If the staged diff contains only the intended
change, commit it:

```bash
git commit -m "Add Git practice notes"
# [practice/git-crash-course ...] Add Git practice notes
#  1 file changed, 3 insertions(+)
#  create mode 100644 git-practice.md

git status --short
# No output is expected.

git log --oneline -3
# ... Add Git practice notes
# ...
```

The commit moved the staged change into the saved history. The short message explains
the result of the change rather than the command used to make it.

## Recover safely

Git can recover changes from each of its three states. These exercises make temporary
changes to `git-practice.md` and then return it to the version you just committed.

### Discard a working-tree change

Add a line without staging it:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
printf '%s\n' 'This line is temporary.' >> git-practice.md
# No output is expected.
```
:::
:::tab{label="Linux"}
```bash
printf '%s\n' 'This line is temporary.' >> git-practice.md
# No output is expected.
```
:::
:::tab{label="Windows"}
```powershell
Add-Content git-practice.md "This line is temporary."
# No output is expected.
```
:::
::::

Inspect and discard that working-tree change:

```bash
git status --short
#  M git-practice.md
```

Git now shows `M` instead of `??`. `M` means that the tracked file has been **modified**.
The space before `M` means the modification is still in the working tree and has not been
staged.

```bash
git diff -- git-practice.md
# ...
# +This line is temporary.
```

Open `git-practice.md` in Visual Studio Code:

```bash
code git-practice.md
# No output is expected. Visual Studio Code opens git-practice.md.
```

The `code` command starts Visual Studio Code, while `git-practice.md` tells it which file
to open. Keep the file visible, return to the terminal, and restore the committed version:

```bash
git restore git-practice.md
# No output is expected.

git status --short
# No output is expected.
```

Watch the temporary line disappear from the open editor when Git restores the file.
`git restore git-practice.md` replaces the working-tree copy with the committed version.
The discarded line was never committed, so this command cannot recover it. Always inspect
`git diff` before discarding work.

### Unstage a change without losing it

Add the temporary line again, then stage it:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
printf '%s\n' 'This line is temporary.' >> git-practice.md
git add git-practice.md
# No output is expected.
```
:::
:::tab{label="Linux"}
```bash
printf '%s\n' 'This line is temporary.' >> git-practice.md
git add git-practice.md
# No output is expected.
```
:::
:::tab{label="Windows"}
```powershell
Add-Content git-practice.md "This line is temporary."
git add git-practice.md
# No output is expected.
```
:::
::::

The first column shows that the change is staged:

```bash
git status --short
# M  git-practice.md

git restore --staged git-practice.md
# No output is expected.

git status --short
#  M git-practice.md
```

`git restore --staged` moved the change out of the staging area, but kept it in the
working tree. The `M` moved from the first column to the second column. Discard the
remaining practice edit before continuing:

```bash
git restore git-practice.md
git status --short
# No output is expected.
```

### Revert a committed change

Now save a temporary change so you can practice undoing a commit:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
printf '%s\n' 'This committed line is temporary.' >> git-practice.md
git add git-practice.md
git commit -m "Add temporary Git practice note"
# [practice/git-crash-course ...] Add temporary Git practice note
#  1 file changed, 1 insertion(+)
```
:::
:::tab{label="Linux"}
```bash
printf '%s\n' 'This committed line is temporary.' >> git-practice.md
git add git-practice.md
git commit -m "Add temporary Git practice note"
# [practice/git-crash-course ...] Add temporary Git practice note
#  1 file changed, 1 insertion(+)
```
:::
:::tab{label="Windows"}
```powershell
Add-Content git-practice.md "This committed line is temporary."
git add git-practice.md
git commit -m "Add temporary Git practice note"
# [practice/git-crash-course ...] Add temporary Git practice note
#  1 file changed, 1 insertion(+)
```
:::
::::

`git revert` safely undoes a commit by making a new commit with the opposite change:

```bash
git revert HEAD --no-edit
# [practice/git-crash-course ...] Revert "Add temporary Git practice note"
#  1 file changed, 1 deletion(-)

git log --oneline -4
# ... Revert "Add temporary Git practice note"
# ... Add temporary Git practice note
# ... Add Git practice notes
# ...

git status --short
# No output is expected.
```

The history keeps both the mistake and its correction. This is safer for shared work than
rewriting commits that teammates may already have.

## Create your GitHub fork

A **fork** is a copy of someone else's GitHub repository stored under your own GitHub
account. It remains connected to the original repository, but you control your copy and
can push branches to it. It has this name because it represents a fork in the project's
path: your copy can develop separately from the original. This differs from a clone: a
clone lives on your computer, while a fork lives on GitHub.

Living on GitHub gives the fork its own web page and collaboration features. You can
share it with other people, discuss work in issues and pull requests, run automated
checks, publish releases, and control who can contribute. GitHub also keeps the fork
connected to the original repository, making it easier to bring in upstream updates from
the original project or propose your changes back to it.

Unlike the original repository, the fork belongs to your GitHub account. You control its
branches, settings, and pull requests. However, owning the fork does not transfer
copyright in the original code to you. The original authors still own their work, and the
project's license defines what you may do with it.

This is central to open source. An [open-source license] generally gives you permission
to use, copy, modify, and share a project as long as you follow its conditions. A fork
gives you a practical place to make those modifications; the license gives you the legal
permission. Do not assume that every public repository is open source—check its license
before using or distributing its code.

Forks are useful when you do not have permission to write directly to a repository or
when you want a separate place to experiment. If you later want to contribute a change,
you can open a pull request from a branch in your fork to the original repository.

You can read the OpenWDL course repository, but this practice exercise should not create
branches or pull requests there. We'll use your fork so you can practice the complete
GitHub workflow without changing the course repository or creating review work for its
maintainers.

Create the fork:

```bash
gh repo fork --remote --remote-name fork
# ✓ Created fork YOUR-USERNAME/production-guide-tutorial
# ✓ Added remote fork
```

If you already have a fork, GitHub CLI may report that it already exists. Add it as the
`fork` remote if the command asks.

Inspect the connections:

```bash
git remote -v
# fork    https://github.com/YOUR-USERNAME/production-guide-tutorial.git (fetch)
# fork    https://github.com/YOUR-USERNAME/production-guide-tutorial.git (push)
# origin  https://github.com/openwdl/production-guide-tutorial.git (fetch)
# origin  https://github.com/openwdl/production-guide-tutorial.git (push)
```

Recall that a **remote** is a named connection from your local repository to another
copy, usually one hosted online. You now have two remotes. `origin` points to the course
repository maintained by OpenWDL, while `fork` points to your copy on GitHub. When you
fetch, pull, or push, the remote name tells Git which online copy to use. You can publish
practice branches and pull requests to `fork` without affecting the OpenWDL project.

## Publish the branch

A branch exists only in your local repository until you push it. Your fork already
contains the supplied course branches, so publish only your practice branch:

```bash
git push --set-upstream fork practice/git-crash-course
# ...
# * [new branch] practice/git-crash-course -> practice/git-crash-course
# branch 'practice/git-crash-course' set up to track 'fork/practice/git-crash-course'.
```

Your local branch is the copy on your computer. `fork/practice/git-crash-course` records
the latest copy published to your fork on GitHub. Future `git push` commands send new
commits to that tracked branch.

## Open and review a pull request

A **pull request** is a proposal on GitHub to combine changes from one branch into
another. The branch containing the proposed changes is the **head branch**. The branch
that would receive them is the **base branch**. The name comes from asking the owner of
the base repository to _pull_ your changes into their project.

In the chair analogy, a pull request is like asking the factory to accept the changes you
made at your workbench and add them to the main production design. The factory can inspect
the variation and test it before deciding whether future chairs should use it.

Opening a pull request does not change the base branch. GitHub creates a page that
compares the branches and keeps the proposal open for discussion. Reviewers can comment
on individual lines, ask questions, request changes, or approve the work. Automated
checks can test the proposed combination before anyone merges it. If you push more
commits to the head branch, the pull request updates automatically.

Pull requests are especially powerful for open source because contributors do not need
permission to write directly to the original repository. Anyone allowed by the project's
license and contribution rules can work in a fork and propose a focused change.
Maintainers can inspect the code, discuss it in public, verify the checks, and decide
whether to merge it. The pull request preserves that code, discussion, review, and
decision as part of the project's history.

Open a pull request when a focused change is ready for feedback or review. That change
might fix a bug, add a feature, improve documentation, or update a dependency. You do not
need a pull request for every edit or commit; related commits can form one proposal. Use
a **draft pull request** when you want to share work or ask for early feedback before it
is ready to merge. Mark it ready for review once the change is coherent, you have
reviewed the diff yourself, and its local checks pass. You can read more in
[GitHub's pull request documentation].

For this exercise, both branches belong to your fork. Remember that you own and control
the fork under your GitHub account. This means you can both propose the pull request and
decide whether to accept and merge it. In a shared project, a maintainer would usually
make the final decision. The `--repo` value is important because it keeps this practice
pull request in your fork instead of opening it against OpenWDL.

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
owner="$(gh api user --jq .login)"
# No output is expected.

gh pr create \
  --repo "$owner/production-guide-tutorial" \
  --base chapter/03-git-crash-course \
  --head practice/git-crash-course \
  --draft \
  --title "Practice the Git workflow" \
  --body "This pull request contains my Git crash-course exercise."
# https://github.com/YOUR-USERNAME/production-guide-tutorial/pull/1
```
:::
:::tab{label="Linux"}
```bash
owner="$(gh api user --jq .login)"
# No output is expected.

gh pr create \
  --repo "$owner/production-guide-tutorial" \
  --base chapter/03-git-crash-course \
  --head practice/git-crash-course \
  --draft \
  --title "Practice the Git workflow" \
  --body "This pull request contains my Git crash-course exercise."
# https://github.com/YOUR-USERNAME/production-guide-tutorial/pull/1
```
:::
:::tab{label="Windows"}
```powershell
$owner = gh api user --jq .login
# No output is expected.

gh pr create `
  --repo "$owner/production-guide-tutorial" `
  --base chapter/03-git-crash-course `
  --head practice/git-crash-course `
  --draft `
  --title "Practice the Git workflow" `
  --body "This pull request contains my Git crash-course exercise."
# https://github.com/YOUR-USERNAME/production-guide-tutorial/pull/1
```
:::
::::

The command creates a draft pull request, which marks the work as not ready to merge.
Open it in your browser:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
gh pr view --repo "$owner/production-guide-tutorial" --web
# Opening https://github.com/YOUR-USERNAME/production-guide-tutorial/pull/1 in your browser.
```
:::
:::tab{label="Linux"}
```bash
gh pr view --repo "$owner/production-guide-tutorial" --web
# Opening https://github.com/YOUR-USERNAME/production-guide-tutorial/pull/1 in your browser.
```
:::
:::tab{label="Windows"}
```powershell
gh pr view --repo "$owner/production-guide-tutorial" --web
# Opening https://github.com/YOUR-USERNAME/production-guide-tutorial/pull/1 in your browser.
```
:::
::::

Confirm that the repository owner in the URL is your GitHub username, not `openwdl`.
Review these parts of the pull request:

- **Conversation** shows the description, discussion, and review activity.
- **Commits** shows each saved version on the practice branch.
- **Checks** shows automated checks when the repository defines them.
- **Files changed** shows the combined difference between the two branches.

The **Merge pull request** action combines the head branch into the base branch. Do not
merge this exercise yet; leaving it as a draft keeps the example available for later
reference.

## What you learned

You learned that Git saves a project's history on your computer, while GitHub hosts Git
repositories and adds tools for sharing and collaboration. You also learned how
repositories, branches, remotes, forks, and pull requests fit together.

You practiced the complete Git workflow:

- reading the current branch, repository status, and remotes;
- moving changes through the working tree, staging area, and committed history;
- creating a branch without changing the supplied course branch;
- inspecting, staging, and committing a focused change;
- discarding a working-tree change, unstaging an edit, and reverting a commit;
- creating and publishing to a fork that you control;
- opening and reviewing a draft pull request inside that fork.

Your practice branch, commits, and draft pull request remain available for reference.

[GitHub]: https://github.com/
[GitHub's pull request documentation]: https://docs.github.com/en/pull-requests/reference/pull-requests
[open-source license]: https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository
