---
slug: introducing-sprocket
title: "Introducing Sprocket"
date: 2024-09-19T15:24:15-06:00
authors: [venkat-malladi]
genre: tool
standfirst: "Sprocket brings specification-focused parsing, linting, and developer tooling to WDL."
legacyPath: "/wdl/bioinformatics/workflows/vscode/lint/announcing-sprocket/"
---

# Introducing Sprocket

We are excited to announce **Sprocket**, a validator and linter for the Workflow Description Language (WDL). Beyond just validation and linting, Sprocket is under active development towards becoming a workflow execution engine for bioinformatics and computational research. Sprocket uses WDL as it's workflow language of choice, making it a valuable addition to the growing ecosystem of WDL tools.


## What is Sprocket?


Sprocket is written in Rust. The code that drives Sprocket is split across the [`wdl`](https://github.com/stjude-rust-labs/wdl) family of crates, the [`sprocket`](https://github.com/stjude-rust-labs/sprocket) command line tool, and the [Visual Studio Code extension](https://marketplace.visualstudio.com/items?itemName=stjude-rust-labs.sprocket-vscode).

Sprocket aims for the following:

- **WDL Compatibility**: Full support for workflows written in WDL, allowing users to define complex workflows in a readable and intuitive format.
- **Lightweight and Fast**: Optimized for speed and minimal resource usage, Sprocket is a perfect fit for small-to-medium-sized computational projects.
- **Flexible Deployment**: Sprocket can run on local machines, clusters, and cloud environments, giving users the freedom to scale their workflows as needed.
- **Open-Source**: Developed under an open-source license, Sprocket encourages contributions from the community to extend its capabilities.

## Why Use Sprocket?

Sprocket aims at providing a minimal yet robust alternative for testing and running WDL workflows.

- **Simplicity**: For users who need to run WDL workflows quickly without complex infrastructure setup, Sprocket offers a straightforward solution.
- **Speed**: Sprocket is optimized to run workflows with low overhead, helping users execute their tasks faster and more efficiently.
- **Community-Driven**: As an open-source project, Sprocket is actively developed and improved by its community, making it adaptable to the needs of users in bioinformatics and beyond.

## VS Code Extension for Sprocket

To streamline the workflow development process, **Sprocket** provides a dedicated **Visual Studio Code extension**. This extension integrates Sprocket directly into the popular code editor, offering a powerful environment for writing, running, and debugging WDL workflows.

Here are some of the features the VS Code extension offers:

- **Syntax Highlighting**: The extension provides WDL syntax highlighting, making your code more readable and easier to navigate.
- **Auto-completion**: It supports auto-completion for WDL tasks, inputs, and outputs, helping you write WDL scripts faster and with fewer errors.
- **Integrated Workflow Execution**: You can execute Sprocket workflows directly within VS Code, eliminating the need to switch between the editor and the terminal.
- **Real-time Error Checking**: Catch issues in your WDL code as you write with integrated real-time error checking.
- **Output Logs**: View detailed execution logs within the VS Code interface, making debugging faster and more intuitive.

### Getting Started with the VS Code Extension

To begin using the Sprocket VS Code extension, follow these simple steps:

1. **Install the Extension**: Open Visual Studio Code, navigate to the Extensions tab, and search for "Sprocket." Install the extension from the marketplace.
2. **Configure Sprocket**: Set up the Sprocket executable path by going to your VS Code settings and pointing to the Sprocket installation on your machine.
3. **Run WDL Workflows**: Open a WDL file in VS Code, and you'll see the Sprocket toolbar to execute and monitor workflows directly from the editor.

For more detailed instructions, you can follow the official [Getting Started Guide for VS Code](https://sprocket.bio/vscode/getting-started.html).


## Getting Started with Sprocket

Interested in trying out Sprocket for your next project? Head over to the [official Sprocket documentation](https://sprocket.bio/overview.html) for detailed installation instructions and usage guides. Whether you are working on local workflows or deploying large-scale computations, Sprocket's flexibility ensures you can adapt it to fit your needs.


## What's Next?

Sprocket is under active development, and we welcome contributions from the community! Whether you want to suggest new features, report bugs, or contribute code, check out our [GitHub repository](https://github.com/stjude-rust-labs/sprocket) and join the conversation on the OpenWDL [Slack](https://join.slack.com/t/openwdl/shared_invite/zt-ctmj4mhf-cFBNxIiZYs6SY9HgM9UAVw) and discuss in `#sprocket` channel.


## Conclusion

Sprocket is a new fast, lightweight, and user-friendly WDL engine designed to make workflow execution easier and more efficient. With a focus on simplicity and performance, Sprocket is a great choice for anyone working with WDL workflows, from small research projects to large-scale bioinformatics pipelines.
