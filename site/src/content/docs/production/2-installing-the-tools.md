---
title: "Installing the tools"
description: "Install and verify Git, Docker, Visual Studio Code, Sprocket, and the shell tools used to develop the course pipeline."
slug: /docs/production/installing-the-tools/
section: production
group: "Environment setup"
order: 10
kind: tutorial
minutes: 25
legacy:
  - /docs/production/development-environment/
---

# Installing the tools

A known development environment makes the rest of the tutorial easier to follow and
debug. We'll install Git, GitHub CLI, Docker, Sprocket, Visual Studio Code, and the
Sprocket extension. After installing each tool, you'll run a check that proves it is
ready.

Use the platform tabs to choose macOS, Linux, or Windows. The site remembers your choice
for other platform-specific examples.

## Identify your system

Installers often provide different files for different operating systems and processor
architectures. Check yours now so you can choose the correct download later.

First, open a terminal. A terminal is an application where you run text commands:

::::tabs{sync="platform"}
:::tab{label="macOS"}
1. Press :kbd[⌘] + :kbd[Space] to open Spotlight.
2. Type `Terminal`.
3. Press :kbd[Return].
:::
:::tab{label="Linux"}
1. Press :kbd[Ctrl] + :kbd[Alt] + :kbd[T].
2. If that shortcut does not work, open the applications menu, search for `Terminal`,
   and select the terminal application.
:::
:::tab{label="Windows"}
1. Press the :kbd[Windows] key to open Start.
2. Type `PowerShell`.
3. Select **Windows PowerShell** or open a PowerShell tab in **Windows Terminal**.
:::
::::

The terminal shows a prompt where you can type. For each command block in this tutorial,
type or paste the command after the prompt, then press :kbd[Enter]. Wait for the command
to finish before running the next one.

Lines that start with `#` are comments, so they do not execute any code in the terminal.
In this tutorial, a comment either explains a command or shows what its output should
look like. It does no harm if you type or paste comments into the terminal.

Now run the commands for your platform:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
uname -s
# Darwin
uname -m
# arm64 or x86_64
```
:::
:::tab{label="Linux"}
```bash
uname -s
# Linux
uname -m
# aarch64 or x86_64
```
:::
:::tab{label="Windows"}
```powershell
[System.Runtime.InteropServices.RuntimeInformation]::OSDescription
# Microsoft Windows ...
[System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture
# Arm64 or X64
```
:::
::::

Architecture names commonly appear as `arm64` or `aarch64` for ARM and `x86_64` or
`AMD64` for Intel or AMD processors. You will use this architecture to select the correct
downloads for the tools below. A download built for another architecture may not run on
your computer, so keep both your operating system and architecture handy.

## Install Git and GitHub CLI

Git records changes to the pipeline, while GitHub CLI connects that local history to
GitHub. We'll explain branches, commits, checkpoints, and pull requests in the
[Git crash course](/docs/production/git-crash-course/). For now, we're only installing
and setting up the tools.

Follow the official [Git installation] and [GitHub CLI installation] instructions for
your operating system. On Windows, install [Git for Windows] with Git Bash. Git Bash also
provides the Bash executable used by WDL command sections.

Once done, check that both commands are available:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
git --version
# git version 2...
gh --version
# gh version 2...
```
:::
:::tab{label="Linux"}
```bash
git --version
# git version 2...
gh --version
# gh version 2...
```
:::
:::tab{label="Windows"}
```powershell
git --version
# git version 2...
gh --version
# gh version 2...
& "C:\Program Files\Git\bin\bash.exe" --version
# GNU bash, version 5...
```
:::
::::

While we're here, Git records a name and email associated with each change you make to
source code. Configure the values you want this course to use:

```bash
git config --global user.name "Your Name"
git config --global user.email "you@example.org"
# No output is expected.
```

Connect GitHub CLI to your account. Choose GitHub.com, HTTPS, and browser authentication
when prompted unless your organization requires another method:

```bash
gh auth login
# ? What account do you want to log into? GitHub.com
# ? What is your preferred protocol for Git operations? HTTPS
# ? How would you like to authenticate GitHub CLI? Login with a web browser
# ... Follow the remaining instructions to complete authentication.

gh auth status
# github.com
# ✓ Logged in to github.com account YOUR-USERNAME (...)
```

This section is complete when Git reports a version and GitHub CLI reports an
authenticated account.

## Install Docker

Containers package tools with the system libraries they need, helping the same work run
consistently on your computer, in the cloud, and on HPC. Docker builds and runs those
containers. We'll explain them in more detail and build one in
[Containers](/docs/production/containers/). For now, we'll just install
and configure the tools needed to work with containers.

Choose your platform:

::::::tabs{sync="platform"}
:::::tab{label="macOS"}
Install [Docker Desktop for Mac].
:::::
:::::tab{label="Linux"}
Select your distribution:

::::tabs
:::tab{label="Ubuntu"}
Follow Docker's official [Install Docker Engine on Ubuntu] guide.
:::
:::tab{label="Debian"}
Follow Docker's official [Install Docker Engine on Debian] guide.
:::
:::tab{label="Fedora"}
Follow Docker's official [Install Docker Engine on Fedora] guide.
:::
:::tab{label="CentOS"}
Follow Docker's official [Install Docker Engine on CentOS] guide.
:::
:::tab{label="RHEL"}
Follow Docker's official [Install Docker Engine on RHEL] guide.
:::
:::tab{label="Raspberry Pi OS"}
Follow Docker's official [Install Docker Engine on Raspberry Pi OS] guide.
:::
::::
:::::
:::::tab{label="Windows"}
Install [Docker Desktop for Windows].
:::::
::::::

Docker Desktop has licensing conditions for some larger organizations. Check the current
terms before using it for institutional work.

Installing the Docker command is only part of the setup. The command sends work to
Docker Engine, a background service that builds and runs containers. Start Docker
Desktop on macOS or Windows, or start Docker Engine on Linux, and wait until it is ready.
Then check both the command and the running service:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
docker version
# Client: Docker Engine ...
# Server: Docker Engine ...
docker run --rm hello-world
# Hello from Docker!
```
:::
:::tab{label="Linux"}
```bash
docker version
# Client: Docker Engine ...
# Server: Docker Engine ...
docker run --rm hello-world
# Hello from Docker!
```
:::
:::tab{label="Windows"}
```powershell
docker version
# Client: Docker Engine ...
# Server: Docker Engine ...
docker run --rm hello-world
# Hello from Docker!
```
:::
::::

`docker version` must report both a client and a server. If it reports only a client,
the Docker service is not running or your account cannot reach it. The `hello-world`
container must finish successfully. Once both checks pass, leave Docker running while
you work through the tutorial. Later sections will use it to build and run containers.

## Install Sprocket

[Sprocket] is a complete and modern development suite for WDL written in Rust. It
helps you write, check, format, document, and run WDL. We'll use it throughout this
tutorial.

This course requires Sprocket `0.30.1` or later. Choose whether you want Homebrew to
manage updates or whether you want to install the latest binary yourself:

::::::tabs{sync="platform"}
:::::tab{label="macOS"}
Choose an installation approach:

::::tabs
:::tab{label="Homebrew"}
Use Homebrew if you want to keep Sprocket updated to the latest release. If Homebrew is
not installed, follow the instructions at [brew.sh]. Then run:

```bash
brew install sprocket
# ==> Installing sprocket
# ...
```

To update Sprocket later, run `brew update && brew upgrade sprocket`.
:::
:::tab{label="Manual binary"}
Use the manual binary if you do not want to manage Sprocket with Homebrew. These commands
select the correct asset for your Mac's architecture, download it from the latest
Sprocket release, install it in `/usr/local/bin`, and remove the downloaded files:

```bash
case "$(uname -m)" in
  arm64) pattern="sprocket-v*-aarch64-apple-darwin.tar.gz" ;;
  x86_64) pattern="sprocket-v*-x86_64-apple-darwin.tar.gz" ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

install_dir="$(mktemp -d)"
gh release download --repo stjude-rust-labs/sprocket --pattern "$pattern" --dir "$install_dir"
# No output is expected.
tar -xzf "$install_dir"/sprocket-*.tar.gz -C "$install_dir"
sudo mkdir -p /usr/local/bin
sudo install -m 755 "$install_dir/sprocket" /usr/local/bin/sprocket
rm -r "$install_dir"
# No output is expected from the final four commands.
```

Repeat these steps when you want to install a newer release.
:::
::::
:::::
:::::tab{label="Linux"}
Choose an installation approach:

::::tabs
:::tab{label="Homebrew"}
Use Homebrew if you want to keep Sprocket updated to the latest release. If Homebrew is
not installed, follow the instructions at [brew.sh]. Then run:

```bash
brew install sprocket
# ==> Installing sprocket
# ...
```

To update Sprocket later, run `brew update && brew upgrade sprocket`.
:::
:::tab{label="Manual binary"}
Use the manual binary if you do not want to manage Sprocket with Homebrew. These commands
select the correct asset for your architecture, download it from the latest Sprocket
release, install it in `/usr/local/bin`, and remove the downloaded files:

```bash
case "$(uname -m)" in
  aarch64|arm64) pattern="sprocket-v*-aarch64-unknown-linux-gnu.tar.gz" ;;
  x86_64) pattern="sprocket-v*-x86_64-unknown-linux-gnu.tar.gz" ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

install_dir="$(mktemp -d)"
gh release download --repo stjude-rust-labs/sprocket --pattern "$pattern" --dir "$install_dir"
# No output is expected.
tar -xzf "$install_dir"/sprocket-*.tar.gz -C "$install_dir"
sudo install -m 755 "$install_dir/sprocket" /usr/local/bin/sprocket
rm -r "$install_dir"
# No output is expected from the final three commands.
```

Repeat these steps when you want to install a newer release.
:::
::::
:::::
:::::tab{label="Windows"}
Windows does not support Homebrew here, so you'll install the latest binary
manually. Choose how to download it:

::::tabs
:::tab{label="Web browser"}
Open the [latest Sprocket release]. Under **Assets**, download the Windows ZIP that
matches your architecture. Choose the file containing `aarch64-pc-windows-msvc` for
`Arm64` or `x86_64-pc-windows-msvc` for `X64`.
:::
:::tab{label="GitHub CLI"}
Run these commands to select the asset for your architecture and download it to your
**Downloads** folder:

```powershell
$pattern = switch ([System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture) {
    "Arm64" { "sprocket-v*-aarch64-pc-windows-msvc.zip" }
    "X64" { "sprocket-v*-x86_64-pc-windows-msvc.zip" }
    default { throw "Unsupported architecture" }
}

gh release download --repo stjude-rust-labs/sprocket --pattern $pattern --dir "$HOME\Downloads"
# No output is expected.
```
:::
::::

After downloading the ZIP:

1. Open your **Downloads** folder, right-click the ZIP, and select **Extract All**.
2. Create the folder `C:\Tools\Sprocket`, then move `sprocket.exe` from the extracted
   folder into it.
3. Press the :kbd[Windows] key, type `environment variables`, and select **Edit the
   system environment variables**.
4. Select **Environment Variables**, select `Path` under **User variables**, then select
   **Edit**.
5. Select **New**, enter `C:\Tools\Sprocket`, and select **OK** in each open dialog.
6. Close PowerShell and open it again so it can read the updated `Path`.

Repeat these steps when you want to install a newer release.
:::::
::::::

Check the installation:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
sprocket --version
# sprocket 0.30.1 ... or later
```
:::
:::tab{label="Linux"}
```bash
sprocket --version
# sprocket 0.30.1 ... or later
```
:::
:::tab{label="Windows"}
```powershell
sprocket.exe --version
# sprocket 0.30.1 ... or later
```
:::
::::

The command should identify Sprocket `0.30.1` or later. If it reports an older version,
update Sprocket or install the [latest Sprocket release].

## Install Visual Studio Code and the extension

[Visual Studio Code] is the text editor we'll use to write WDL. The [Sprocket extension]
connects the editor to Sprocket, which analyzes your WDL while you type. It adds syntax
highlighting, formatting, snippets, and live error and lint messages directly beside the
code they describe.

This immediate feedback helps you learn the language and fix problems while the relevant
code is still in front of you. It also catches many mistakes before you send a workflow
to a cloud or HPC system, where discovering the same mistake can take longer and consume
compute resources.

Install Visual Studio Code and make its `code` command available in the terminal:

::::tabs{sync="platform"}
:::tab{label="macOS"}
1. Follow the official [Visual Studio Code setup for macOS].
2. Open Visual Studio Code.
3. Press :kbd[⌘] + :kbd[Shift] + :kbd[P] to open the Command Palette.
4. Type `shell command`.
5. Select **Shell Command: Install 'code' command in PATH**.
6. Close the terminal and open it again so it can find the new command.
:::
:::tab{label="Linux"}
1. Follow the official [Visual Studio Code setup for Linux] for your distribution. The
   official `.deb`, `.rpm`, and Snap packages install the `code` command.
2. Close the terminal and open it again so it can find the new command.
:::
:::tab{label="Windows"}
1. Follow the official [Visual Studio Code setup for Windows]. The recommended User Setup
   installer adds the `code` command to your `Path`.
2. Close every open PowerShell or Windows Terminal window, then open a new one. Opening
   only a new tab may not load the updated `Path`.
:::
::::

Check that the terminal can start Visual Studio Code:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
code --version
# 1...
# ...
```
:::
:::tab{label="Linux"}
```bash
code --version
# 1...
# ...
```
:::
:::tab{label="Windows"}
```powershell
code --version
# 1...
# ...
```
:::
::::

Install the Sprocket extension from the terminal:

```bash
code --install-extension stjude-rust-labs.sprocket-vscode
# Installing extensions...
# Extension 'stjude-rust-labs.sprocket-vscode' was successfully installed.
```

Now use the terminal and Visual Studio Code to create a temporary WDL file:

1. Return to the terminal and run:

```bash
code environment-check.wdl
# Visual Studio Code opens a new, empty file named environment-check.wdl.
```

2. Paste this WDL into the empty editor:

```wdl
version 1.3

workflow environment_check {}
```

This is a complete, valid WDL file, so the editor should not report any errors after you
save it.

3. Select **File** > **Save**. The `.wdl` filename tells VS Code and the Sprocket
   extension which language the file contains.
4. Open the Problems panel. The official [Visual Studio Code errors and warnings guide]
   shows what the panel looks like and how VS Code marks problems in a file:

::::tabs{sync="platform"}
:::tab{label="macOS"}
Select **View** > **Problems**, or press
:kbd[⌘] + :kbd[Shift] + :kbd[M].
:::
:::tab{label="Linux"}
Select **View** > **Problems**, or press
:kbd[Ctrl] + :kbd[Shift] + :kbd[M].
:::
:::tab{label="Windows"}
Select **View** > **Problems**, or press
:kbd[Ctrl] + :kbd[Shift] + :kbd[M].
:::
::::

With the valid spelling, the Problems panel should be empty. Change `workflow` to
`workflo` and save the file again. The panel should list a syntax error with its message,
filename, and location, while the editor marks the affected line. Select the problem to
jump to that line. Restore the valid spelling, save the file, and confirm that the
problem disappears from both places. You can then delete the temporary file.

Seeing the error and then clearing it proves that the editor, extension, language server,
and WDL file association work together.

## Download the course repository

The code for this tutorial lives in the [`openwdl/production-guide-tutorial`] repository.
We'll use GitHub CLI to copy, or in Git parlance, _clone_, that repository to your
computer:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
gh repo clone openwdl/production-guide-tutorial
# Cloning into 'production-guide-tutorial'...
# ...
cd production-guide-tutorial
```
:::
:::tab{label="Linux"}
```bash
gh repo clone openwdl/production-guide-tutorial
# Cloning into 'production-guide-tutorial'...
# ...
cd production-guide-tutorial
```
:::
:::tab{label="Windows"}
```powershell
gh repo clone openwdl/production-guide-tutorial
# Cloning into 'production-guide-tutorial'...
# ...
Set-Location production-guide-tutorial
```
:::
::::

The course repository has a branch for the start of each section. A branch is a named line
of changes to the source code. It lets many people work on the same project at once
without mixing unfinished changes. In this course, each starting branch contains
everything completed before that section.

Each section has a `chapter/NN-topic` branch containing its starting point. We will use
one of these branches to begin the hands-on course. Later sections will create their own
local branches from the corresponding branch on `origin`, the OpenWDL repository. You
will commit your work locally rather than push routine coursework to your fork.

Since we're about to start section three, [Git crash course], we'll go ahead and switch to
that branch to make the files in your local copy match the section's starting point:

```bash
git fetch origin
# No output is expected.
git switch chapter/03-git-crash-course
# Switched to branch 'chapter/03-git-crash-course'
# Your branch is up to date with 'origin/chapter/03-git-crash-course'.
git status --short
# No output is expected.
```

The first time you switch to a chapter branch, Git may instead say that it created a new
local branch that tracks the branch on `origin`. `origin` is Git's name for the GitHub
repository you cloned. Both messages mean you are on the correct starting branch.

You should see a project directory with source code, tests, examples, documentation, and
configuration appropriate for this point in the course. The exact files may change as
the course evolves. The important checks are that Git names the expected branch and
`git status --short` prints nothing, which means you have a clean starting copy.

The [Git crash course](/docs/production/git-crash-course/) will use a fork to teach
GitHub collaboration. After that exercise, each section will start from its own branch on
`origin` and keep your work on your computer unless the lesson specifically requires a
GitHub service.

## Confirm that you are ready

Run this final checklist before continuing:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
git --version
gh auth status
docker version
sprocket --version
# Visual Studio Code reports WDL diagnostics
```
:::
:::tab{label="Linux"}
```bash
git --version
gh auth status
docker version
sprocket --version
# Visual Studio Code reports WDL diagnostics
```
:::
:::tab{label="Windows"}
```powershell
git --version
gh auth status
docker version
sprocket --version
# Visual Studio Code reports WDL diagnostics
```
:::
::::

If a check fails, fix that tool before continuing. The next section gives you the Git
skills you'll use to track the project safely. Continue to
[Git crash course](/docs/production/git-crash-course/).

[Docker Desktop for Mac]: https://docs.docker.com/desktop/setup/install/mac-install/
[Docker Desktop for Windows]: https://docs.docker.com/desktop/setup/install/windows-install/
[Git for Windows]: https://gitforwindows.org/
[Git installation]: https://git-scm.com/downloads
[GitHub CLI installation]: https://cli.github.com/
[Install Docker Engine on CentOS]: https://docs.docker.com/engine/install/centos/
[Install Docker Engine on Debian]: https://docs.docker.com/engine/install/debian/
[Install Docker Engine on Fedora]: https://docs.docker.com/engine/install/fedora/
[Install Docker Engine on Raspberry Pi OS]: https://docs.docker.com/engine/install/raspberry-pi-os/
[Install Docker Engine on RHEL]: https://docs.docker.com/engine/install/rhel/
[Install Docker Engine on Ubuntu]: https://docs.docker.com/engine/install/ubuntu/
[brew.sh]: https://brew.sh/
[`openwdl/production-guide-tutorial`]: https://github.com/openwdl/production-guide-tutorial
[Sprocket]: https://github.com/stjude-rust-labs/sprocket
[Sprocket extension]: https://marketplace.visualstudio.com/items?itemName=stjude-rust-labs.sprocket-vscode
[latest Sprocket release]: https://github.com/stjude-rust-labs/sprocket/releases/latest
[Visual Studio Code]: https://code.visualstudio.com/
[Visual Studio Code errors and warnings guide]: https://code.visualstudio.com/docs/editing/codebasics#_errors-warnings
[Visual Studio Code setup for Linux]: https://code.visualstudio.com/docs/setup/linux
[Visual Studio Code setup for macOS]: https://code.visualstudio.com/docs/setup/mac
[Visual Studio Code setup for Windows]: https://code.visualstudio.com/docs/setup/windows
