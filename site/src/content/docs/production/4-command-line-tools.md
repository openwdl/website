---
title: "Command-line tools"
description: "Download and verify a command-line program, inspect its interface, summarize a FASTA file, and optionally compile the program from Rust source."
slug: /docs/production/command-line-tools/
section: production
group: "Environment setup"
order: 20
kind: tutorial
minutes: 45
legacy:
  - /docs/production/compile-with-rust/
---

# Command-line tools

## Start this section

Each section starts from a branch supplied by the OpenWDL course repository. Confirm that
your current branch has no unfinished changes, then create a local branch from this
section's starting point:

```bash
git status --short
# No output is expected.
git fetch --quiet origin
git switch --no-track -c chapter/04-command-line-tools origin/chapter/04-command-line-tools
# Switched to a new branch 'chapter/04-command-line-tools'
```

`origin/chapter/04-command-line-tools` identifies the supplied branch on GitHub.
`--no-track` makes an independent local branch with the same name. Your edits and commits
will stay on your computer rather than being pushed to `origin` or your fork.

## Introduction

Data analysis pipelines organize command-line programs. A command-line program is an
application that you control by typing a command instead of clicking through a graphical
interface. One program might prepare data for the next, while other programs can run at
the same time. The pipeline connects their inputs and outputs and defines the order of
the work.

Before we automate a program, we need to understand it on its own. We need to know how to
start it, what input it expects, what output it creates, and how it tells us whether it
succeeded.

For this course, we made a small command-line program called `ref-summary`. It reads a
reference genome stored in FASTA format and reports basic measurements, such as the
number of sequences and bases. We'll download the program, run it against a small
example, and inspect its result. A bonus at the end shows how to compile the program from
its Rust source, but you do not need to complete that for the Production guide.

## Choose the right download

A GitHub **release** is a published version of a project. The
[latest `production-wdl-course` release] includes a compiled copy of `ref-summary` for
each supported operating system and processor architecture. A compiled program is also
called an **executable** or **binary**.

The executable comes inside an **archive**, which is a compressed file used to package
one or more files for download. The archive names identify what each one contains:

```text
ref-summary-v0.1.0-aarch64-apple-darwin.tar.gz
ref-summary-v0.1.0-x86_64-apple-darwin.tar.gz
ref-summary-v0.1.0-aarch64-unknown-linux-gnu.tar.gz
ref-summary-v0.1.0-x86_64-unknown-linux-gnu.tar.gz
ref-summary-v0.1.0-x86_64-pc-windows-msvc.zip
SHA256SUMS
```

For example, `aarch64-apple-darwin` means macOS on an Arm processor, while
`x86_64-unknown-linux-gnu` means Linux on an Intel or AMD processor. This is why you
identified your architecture in [Installing the tools].

`SHA256SUMS` contains a **checksum** for every archive. A checksum is a content
fingerprint. Comparing the downloaded archive with its published checksum detects a
damaged or incomplete download and confirms that you received the file listed in the
release.

## Download and verify `ref-summary`

Choose your platform, then choose whether to use your web browser or GitHub CLI. Both
approaches download the same archive and checksum file into the course repository.

::::::tabs{sync="platform"}
:::::tab{label="macOS"}
Choose a download approach:

::::tabs
:::tab{label="Web browser"}
1. Open the [latest `production-wdl-course` release].
2. Expand **Assets**.
3. Download `SHA256SUMS`.
4. Download the archive that matches the architecture you identified during
   [Installing the tools]:
   - choose the filename containing `aarch64-apple-darwin` for `arm64`;
   - choose the filename containing `x86_64-apple-darwin` for `x86_64`.

Return to the terminal and move both files into the course directory:

```bash
mv "$HOME/Downloads/SHA256SUMS" "$HOME"/Downloads/ref-summary-v*-apple-darwin.tar.gz .
# No output is expected.
```
:::
:::tab{label="GitHub CLI"}
GitHub CLI can select the correct archive and download it with `SHA256SUMS`:

```bash
case "$(uname -m)" in
  arm64) pattern="ref-summary-v*-aarch64-apple-darwin.tar.gz" ;;
  x86_64) pattern="ref-summary-v*-x86_64-apple-darwin.tar.gz" ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

gh release download \
  --repo openwdl/production-wdl-course \
  --pattern "$pattern" \
  --pattern SHA256SUMS
# No output is expected.
```
:::
::::
:::::
:::::tab{label="Linux"}
Choose a download approach:

::::tabs
:::tab{label="Web browser"}
1. Open the [latest `production-wdl-course` release].
2. Expand **Assets**.
3. Download `SHA256SUMS`.
4. Download the archive that matches the architecture you identified during
   [Installing the tools]:
   - choose the filename containing `aarch64-unknown-linux-gnu` for `aarch64` or
     `arm64`;
   - choose the filename containing `x86_64-unknown-linux-gnu` for `x86_64`.

Return to the terminal and move both files into the course directory:

```bash
mv "$HOME/Downloads/SHA256SUMS" "$HOME"/Downloads/ref-summary-v*-unknown-linux-gnu.tar.gz .
# No output is expected.
```
:::
:::tab{label="GitHub CLI"}
GitHub CLI can select the correct archive and download it with `SHA256SUMS`:

```bash
case "$(uname -m)" in
  aarch64|arm64) pattern="ref-summary-v*-aarch64-unknown-linux-gnu.tar.gz" ;;
  x86_64) pattern="ref-summary-v*-x86_64-unknown-linux-gnu.tar.gz" ;;
  *) echo "Unsupported architecture: $(uname -m)"; exit 1 ;;
esac

gh release download \
  --repo openwdl/production-wdl-course \
  --pattern "$pattern" \
  --pattern SHA256SUMS
# No output is expected.
```
:::
::::
:::::
:::::tab{label="Windows"}
Choose a download approach:

::::tabs
:::tab{label="Web browser"}
1. Open the [latest `production-wdl-course` release].
2. Expand **Assets**.
3. Download `SHA256SUMS`.
4. Download the ZIP containing `x86_64-pc-windows-msvc`.

Return to PowerShell and move both files into the course directory:

```powershell
Move-Item "$HOME\Downloads\SHA256SUMS" .
Move-Item "$HOME\Downloads\ref-summary-v*-x86_64-pc-windows-msvc.zip" .
# No output is expected.
```
:::
:::tab{label="GitHub CLI"}
GitHub CLI can download the Windows archive with `SHA256SUMS`:

```powershell
gh release download `
  --repo openwdl/production-wdl-course `
  --pattern "ref-summary-v*-x86_64-pc-windows-msvc.zip" `
  --pattern SHA256SUMS
# No output is expected.
```
:::
::::
:::::
::::::

In these commands, `.` means the current directory, which should still be
`production-wdl-course`.

## Check and extract the download

Before running a downloaded executable, verify its checksum. If the checksum matches,
extract the archive and ask `ref-summary` to print its version:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
archive=$(echo ref-summary-v*-apple-darwin.tar.gz)
grep "  $archive$" SHA256SUMS | shasum -a 256 -c -
# ref-summary-v...-apple-darwin.tar.gz: OK
tar -xzf "$archive"
./ref-summary --version
# ref-summary 0.1.0
```
:::
:::tab{label="Linux"}
```bash
archive=$(echo ref-summary-v*-unknown-linux-gnu.tar.gz)
grep "  $archive$" SHA256SUMS | sha256sum -c -
# ref-summary-v...-unknown-linux-gnu.tar.gz: OK
tar -xzf "$archive"
./ref-summary --version
# ref-summary 0.1.0
```
:::
:::tab{label="Windows"}
```powershell
$Archive = Get-Item .\ref-summary-v*-x86_64-pc-windows-msvc.zip
$Expected = (Select-String -Path .\SHA256SUMS -Pattern $Archive.Name).Line.Split()[0]
$Actual = (Get-FileHash $Archive -Algorithm SHA256).Hash.ToLowerInvariant()
if ($Actual -ne $Expected) { throw "Checksum verification failed" }
# No output means the checksum matches.
Expand-Archive $Archive -DestinationPath .\ref-summary
.\ref-summary\ref-summary.exe --version
# ref-summary 0.1.0
```
:::
::::

The checksum command must report `OK` on macOS or Linux, or print no error on Windows.
The version command must identify `ref-summary`. Stop if either check fails. Do not edit
`SHA256SUMS` to make a mismatch disappear; download both files again from the same
release.

## Create a small genome

A **FASTA file** stores one or more biological sequences as plain text. Each sequence
starts with a header line beginning with `>`, followed by one or more lines containing
the sequence.

Create the directory and open a new FASTA file in Visual Studio Code:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
mkdir -p tests/fixtures
code tests/fixtures/small-reference.fasta
# Visual Studio Code opens small-reference.fasta.
```
:::
:::tab{label="Linux"}
```bash
mkdir -p tests/fixtures
code tests/fixtures/small-reference.fasta
# Visual Studio Code opens small-reference.fasta.
```
:::
:::tab{label="Windows"}
```powershell
New-Item -ItemType Directory -Force tests\fixtures | Out-Null
code tests\fixtures\small-reference.fasta
# Visual Studio Code opens small-reference.fasta.
```
:::
::::

Paste this text into the file, then save it:

```text
>chromosome
ACGTACGTNN
```

`>chromosome` names the sequence. The next line contains ten DNA bases. `A`, `C`, `G`,
and `T` identify specific bases, while `N` means that the base is unknown. This tiny
synthetic genome is not biologically useful, but its expected measurements are easy to
check by hand.

## Summarize the genome

`ref-summary` needs the path to an input FASTA file. The optional `--output` argument
tells it where to save the result. We'll put generated files in a `build` directory,
separate from the input and expected result.

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
mkdir -p build
./ref-summary tests/fixtures/small-reference.fasta \
  --output build/small-reference.json
# {"schema_version":1,"sequence_count":1,...}
cat build/small-reference.json
# {
#   "schema_version": 1,
#   ...
# }
```
:::
:::tab{label="Linux"}
```bash
mkdir -p build
./ref-summary tests/fixtures/small-reference.fasta \
  --output build/small-reference.json
# {"schema_version":1,"sequence_count":1,...}
cat build/small-reference.json
# {
#   "schema_version": 1,
#   ...
# }
```
:::
:::tab{label="Windows"}
```powershell
New-Item -ItemType Directory -Force build | Out-Null
.\ref-summary\ref-summary.exe tests\fixtures\small-reference.fasta `
  --output build\small-reference.json
# {"schema_version":1,"sequence_count":1,...}
Get-Content build\small-reference.json
# {
#   "schema_version": 1,
#   ...
# }
```
:::
::::

The program prints the result in the terminal and saves the same result in
`build/small-reference.json`. The result uses **JSON**, a text format that represents
named values in a structure that people and programs can read:

```json
{
  "schema_version": 1,
  "sequence_count": 1,
  "total_bases": 10,
  "gc_bases": 4,
  "n_bases": 2,
  "ambiguous_bases": 0,
  "minimum_length": 10,
  "maximum_length": 10
}
```

Each field has a specific meaning:

| Field | Meaning in this result |
| --- | --- |
| `schema_version` | Version of the JSON structure |
| `sequence_count` | One sequence named `chromosome` |
| `total_bases` | Ten bases across all sequences |
| `gc_bases` | Four bases that are `G` or `C` |
| `n_bases` | Two unknown bases marked `N` |
| `ambiguous_bases` | No other ambiguous IUPAC base symbols |
| `minimum_length` | The shortest sequence contains ten bases |
| `maximum_length` | The longest sequence contains ten bases |

The repository already contains `tests/expected/small-reference.json`, which records
these hand-counted values. Compare the generated result with it:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
diff -u tests/expected/small-reference.json build/small-reference.json
# No output means the files match.
```
:::
:::tab{label="Linux"}
```bash
diff -u tests/expected/small-reference.json build/small-reference.json
# No output means the files match.
```
:::
:::tab{label="Windows"}
```powershell
$Difference = Compare-Object `
  (Get-Content tests\expected\small-reference.json) `
  (Get-Content build\small-reference.json)
if ($Difference) { $Difference; throw "Summary does not match the expected result" }
# No output means the files match.
```
:::
::::

This comparison confirms that the program produced the result we calculated ourselves.
Keeping the expected result separate from the generated result helps us detect a broken
calculation instead of accepting whatever the program writes.

## Learn how the program reports success and failure

A command-line program communicates in three ways:

- **standard output** contains its normal result;
- **standard error** contains help and error messages;
- an **exit status** is a number that reports whether the command succeeded.

On macOS and Linux, `$?` contains the exit status of the most recent command, so
`echo $?` prints it. In PowerShell on Windows, the equivalent value is
`$LASTEXITCODE`. Check the status immediately after running the command because the next
command will replace it.

By convention, an exit status of `0` means success. Run `ref-summary` correctly and check
its status:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
./ref-summary tests/fixtures/small-reference.fasta \
  --output build/small-reference.json
# {"schema_version":1,"sequence_count":1,...}
echo $?
# 0
```
:::
:::tab{label="Linux"}
```bash
./ref-summary tests/fixtures/small-reference.fasta \
  --output build/small-reference.json
# {"schema_version":1,"sequence_count":1,...}
echo $?
# 0
```
:::
:::tab{label="Windows"}
```powershell
.\ref-summary\ref-summary.exe tests\fixtures\small-reference.fasta `
  --output build\small-reference.json
# {"schema_version":1,"sequence_count":1,...}
$LASTEXITCODE
# 0
```
:::
::::

`ref-summary` uses status `2` when the command is incomplete and status `1` when it
cannot process the requested input. Try both failures:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
./ref-summary
# error: the following required arguments were not provided: <FASTA>
echo $?
# 2

./ref-summary missing.fasta
# error: failed to open FASTA ...
echo $?
# 1
```
:::
:::tab{label="Linux"}
```bash
./ref-summary
# error: the following required arguments were not provided: <FASTA>
echo $?
# 2

./ref-summary missing.fasta
# error: failed to open FASTA ...
echo $?
# 1
```
:::
:::tab{label="Windows"}
```powershell
.\ref-summary\ref-summary.exe
# error: the following required arguments were not provided: <FASTA>
$LASTEXITCODE
# 2

.\ref-summary\ref-summary.exe missing.fasta
# error: failed to open FASTA ...
$LASTEXITCODE
# 1
```
:::
::::

These signals form part of the program's **contract**: the stable behavior that other
people and programs can rely on. Later, the pipeline will use the exit status to decide
whether this step succeeded.

## Build `ref-summary` from source :badge[Bonus]

:::tip

**This part is optional.** The released `ref-summary` binary is sufficient for the rest
of the Production guide. Complete this bonus if you want to inspect, test, and compile
the Rust source yourself.

:::

Your starting copy includes the source under `tools/ref-summary/`. Rust is not required
for the rest of this guide. This bonus simply shows how that source becomes the executable
you used above.

### Install the Rust toolchain

Rust source code must be compiled before your computer can run it. The Rust **toolchain**
includes `rustc`, which compiles Rust, and `cargo`, which manages Rust projects and runs
their builds and tests.

Install the toolchain with [rustup], the installer maintained by the Rust project:

::::tabs{sync="platform"}
:::tab{label="macOS"}
Open [rustup], follow its macOS installation instructions, and choose the default
installation when prompted. Close the terminal and open it again after the installation
finishes.
:::
:::tab{label="Linux"}
Open [rustup], follow its Linux installation instructions, and choose the default
installation when prompted. Close the terminal and open it again after the installation
finishes.
:::
:::tab{label="Windows"}
Open [rustup], download and run `rustup-init.exe`, and choose the default installation
when prompted. If the installer asks for the Visual Studio C++ build tools, follow its
link and install them. Close and reopen PowerShell after the installation finishes.
:::
::::

Check that both tools are available:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
rustc --version
# rustc 1...
cargo --version
# cargo 1...
```
:::
:::tab{label="Linux"}
```bash
rustc --version
# rustc 1...
cargo --version
# cargo 1...
```
:::
:::tab{label="Windows"}
```powershell
rustc --version
# rustc 1...
cargo --version
# cargo 1...
```
:::
::::

### See how the source is organized

A Rust project is called a **package**. The complete `ref-summary` package lives under
`tools/ref-summary/`:

```text
tools/ref-summary/
  Cargo.lock
  Cargo.toml
  src/
    lib.rs
    main.rs
  tests/
    cli.rs
```

`Cargo.toml` describes the package and the libraries it depends on. `Cargo.lock` records
the exact versions of those libraries selected for the build. The lock file helps another
developer build with the same dependency versions instead of silently receiving newer
ones.

The program accepts the same command-line interface you used above:

```text
ref-summary [--output <PATH>] <FASTA>
```

`src/lib.rs` reads and measures the FASTA records. `src/main.rs` handles the command-line
arguments, opens the requested files, and reports errors. Separating those responsibilities
makes the measurements easy to test without starting a separate command-line process.

### Build and test the source

Move into the package directory, check the source, run its tests, and compile an optimized
executable:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
cd tools/ref-summary
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
# test result: ok. ...
cargo build --release
# Finished `release` profile ...
```
:::
:::tab{label="Linux"}
```bash
cd tools/ref-summary
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
# test result: ok. ...
cargo build --release
# Finished `release` profile ...
```
:::
:::tab{label="Windows"}
```powershell
Set-Location tools\ref-summary
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
# test result: ok. ...
cargo build --release
# Finished `release` profile ...
```
:::
::::

Each command has a distinct purpose:

- `cargo fmt --check` confirms that the source follows the project's standard format.
- `cargo clippy` looks for common mistakes and unclear Rust code.
- `cargo test` checks the FASTA measurements, errors, and command-line behavior.
- `cargo build --release` creates an optimized executable.

The compiled executable appears under `target/release/` inside the package directory.

### Compare the local and released programs

Run your compiled executable against `small-reference.fasta`, then compare its output
with the expected result:

::::tabs{sync="platform"}
:::tab{label="macOS"}
```bash
./target/release/ref-summary ../../tests/fixtures/small-reference.fasta \
  --output /tmp/local-summary.json
# {"schema_version":1,"sequence_count":1,...}
diff /tmp/local-summary.json ../../tests/expected/small-reference.json
# No output means the files match.
```
:::
:::tab{label="Linux"}
```bash
./target/release/ref-summary ../../tests/fixtures/small-reference.fasta \
  --output /tmp/local-summary.json
# {"schema_version":1,"sequence_count":1,...}
diff /tmp/local-summary.json ../../tests/expected/small-reference.json
# No output means the files match.
```
:::
:::tab{label="Windows"}
```powershell
.\target\release\ref-summary.exe ..\..\tests\fixtures\small-reference.fasta `
  --output $env:TEMP\local-summary.json
# {"schema_version":1,"sequence_count":1,...}
Compare-Object `
  (Get-Content $env:TEMP\local-summary.json) `
  (Get-Content ..\..\tests\expected\small-reference.json)
# No output means the files match.
```
:::
::::

Your locally compiled program should produce exactly the same result as the released
program. This byte-for-byte comparison works because `ref-summary` writes fields in a
stable order and does not add timestamps or paths from your computer.

### Understand reproducible compilation

`Cargo.lock` makes dependency selection repeatable, but it does not make executables from
different operating systems identical. Each operating system needs its own executable,
which is why the GitHub release provides several archives.

The release process builds each supported version in a controlled environment and
publishes its checksum. Keeping the source version, compiler version, and checksums
together makes it possible to trace each executable back to the source used to build it.

## Save your progress

Save the FASTA fixture in a local commit:

```bash
git add tests/fixtures/small-reference.fasta
git commit -m "Add small reference fixture"
git status --short
# No output is expected.
```

The commit stays on your local `chapter/04-command-line-tools` branch. The next section
will start from its own supplied branch, which already contains the expected result of
this section.

## What you learned

You learned how command-line programs fit into a data analysis pipeline and how to choose
and verify the correct executable for your computer. You created a small FASTA genome,
ran `ref-summary`, read its JSON measurements, checked the result against hand-counted
values, and observed how the program reports success and failure.

If you completed the bonus, you also learned how Rust organizes the `ref-summary`
package, how to check and compile its source, and why locked dependencies and recorded
build information improve reproducibility.

[rustup]: https://rustup.rs/
[Installing the tools]: /docs/production/installing-the-tools/
[latest `production-wdl-course` release]: https://github.com/openwdl/production-wdl-course/releases/latest
