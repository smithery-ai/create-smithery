# create-smithery

The official CLI to get started with [Smithery](https://www.smithery.ai/).

This package helps you set up a new Smithery project for building MCPs.

## Usage

To create a new Smithery project, run:

```bash
npx create-smithery@latest
```

Or with `bun`:

```bash
bunx create-smithery@latest
```

You will be prompted to configure your project interactively.

Alternatively, specify the project name directly:

```bash
npx create-smithery <project-name>
```

or

```bash
bunx create-smithery <project-name>
```

## Options

### Project Name

Set the project name as the first argument:

```bash
npx create-smithery my-awesome-mcp
```

### Transport Type

Choose how your MCP will communicate. Use the `-t` or `--transport` flag:

```bash
npx create-smithery --transport http
npx create-smithery --transport stdio
```

- **HTTP**: Runs on a server (remotely accessible)
- **STDIO**: Runs on the user's machine (when you need filesystem access)

If not specified, you'll be prompted to choose (defaults to HTTP).

### Package Manager

Specify which package manager to use for installing dependencies:

```bash
npx create-smithery --package-manager npm
npx create-smithery --package-manager yarn
npx create-smithery --package-manager pnpm
npx create-smithery --package-manager bun
```

Defaults to `npm` if not specified.

### ChatGPT App

Initialize a ChatGPT app instead of a standard MCP:

```bash
npx create-smithery --gpt
```

## Combined Example

```bash
npx create-smithery --transport stdio --package-manager bun
```

## Development

To work on this package locally:

1. Clone the repository
2. Run `bun install` to install dependencies
3. Run `bun run build` to build the project
4. To test your local changes, run `bun run start`
5. To run the test suite, run `bun run test`
