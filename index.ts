#!/usr/bin/env node

import { $ } from "execa"
import inquirer from "inquirer"
import { Command } from "commander"
import boxen from "boxen"
import chalk from "chalk"
import figlet from "figlet"
import fs from "node:fs/promises"
import path from "node:path"

function detectPackageManager(): string {
	const userAgent = process.env.npm_config_user_agent

	if (userAgent) {
		if (userAgent.startsWith("yarn")) return "yarn"
		if (userAgent.startsWith("pnpm")) return "pnpm"
		if (userAgent.startsWith("bun")) return "bun"
		if (userAgent.startsWith("npm")) return "npm"
	}

	return "npm"
}

// Establish CLI args/flags
const program = new Command()
program.argument("[projectName]", "Name of the project").parse(process.argv)
program.option("--package-manager", "Package manager to use")
program.option("--template <template>", "Template to use (basic or chatgpt-app)")

let [projectName] = program.args
const options = program.opts()
const packageManager = options.packageManager || detectPackageManager()
let templateChoice = options.template

// If no project name is provided, prompt the user for it
if (!projectName) {
	try {
		const { projectName: promptedName } = await inquirer.prompt([
			{
				type: "input",
				name: "projectName",
				message: "What is your project name?",
				validate: (input: string) => {
					if (!input.trim()) {
						return "Project name cannot be empty"
					}
					return true
				},
			},
		])
		// Use the prompted name
		console.log(`Creating project: ${promptedName}`)
		projectName = promptedName
	} catch (error) {
		console.log("\nCancelled")
		process.exit(0)
	}
} else {
	// Use the provided name
	console.log(`Creating project: ${projectName}`)
}

// Prompt for template selection if not provided via flag
if (!templateChoice) {
	try {
		const { template } = await inquirer.prompt([
			{
				type: "list",
				name: "template",
				message: "Select template:",
				choices: [
					{
						name: `basic ${chalk.gray("(Simple MCP server scaffold)")}`,
						value: "basic",
					},
					{
						name: `chatgpt-app ${chalk.yellow("[beta]")} ${chalk.gray("(OpenAI app scaffold)")}`,
						value: "chatgpt-app",
					},
				],
				default: "basic",
			},
		])
		templateChoice = template
	} catch (error) {
		console.log("\nCancelled")
		process.exit(0)
	}
}

// Validate template choice
const validTemplates = ["basic", "chatgpt-app"]
if (!validTemplates.includes(templateChoice)) {
	console.error(`Invalid template: ${templateChoice}. Choose from: ${validTemplates.join(", ")}`)
	process.exit(1)
}

// Template configurations
const templates = {
	basic: {
		repo: "https://github.com/smithery-ai/create-smithery.git",
		path: "basic",
	},
	"chatgpt-app": {
		repo: "https://github.com/smithery-ai/sdk.git",
		path: "examples/open-ai-hello-server",
	},
}

const selectedTemplate = templates[templateChoice as keyof typeof templates]

async function load<T>(
	startMsg: string,
	endMsg: string,
	command: () => Promise<T>,
): Promise<T> {
	process.stdout.write(`[ ] ${startMsg}\r`)
	const loadingChars = ["|", "/", "-", "\\"]
	let i = 0
	const loadingInterval = setInterval(() => {
		process.stdout.write(`[${loadingChars[i]}] ${startMsg}\r`)
		i = (i + 1) % loadingChars.length
	}, 250)

	const result = await command()
	clearInterval(loadingInterval)
	process.stdout.write(`\r\x1b[K[${chalk.green("✓")}] ${endMsg}\n`)
	return result
}

await load("Cloning template from GitHub...", "Template cloned", async () => {
	// Clone the template repo
	await $`git clone ${selectedTemplate.repo} ${projectName}`

	if (selectedTemplate.path !== ".") {
		// If template is in a subdirectory, extract it
		const templatePath = path.join(projectName, selectedTemplate.path)
		
		// Copy template contents to a temp directory
		const tempDir = path.join(projectName, "_temp_template")
		await fs.cp(templatePath, tempDir, { recursive: true })

		// Remove all files in project root
		const files = await fs.readdir(projectName)
		for (const fileName of files) {
			if (fileName !== "_temp_template") {
				const filePath = path.join(projectName, fileName)
				await fs.rm(filePath, { recursive: true, force: true })
			}
		}

		// Move temp directory contents to project root
		const tempFiles = await fs.readdir(tempDir)
		for (const file of tempFiles) {
			const src = path.join(tempDir, file)
			const dest = path.join(projectName, file)
			await fs.rename(src, dest)
		}

		// Remove temp directory
		await fs.rm(tempDir, { recursive: true, force: true })
	}
})

await load("Navigating to project...", "Project navigated", async () => {
	// await $`cd ${projectName}`; Not needed - we use cwd option instead
})
// Clean up unnecessary files using native fs operations
await fs
	.rm(path.join(projectName, ".git"), { recursive: true, force: true })
	.catch(() => {})
await fs
	.rm(path.join(projectName, "package-lock.json"), { force: true })
	.catch(() => {})
await fs
	.rm(path.join(projectName, "node_modules"), { recursive: true, force: true })
	.catch(() => {})

await load("Installing dependencies...", "Dependencies installed", async () => {
	await $({ cwd: projectName })`${packageManager} install`
})

await load(
	"Initializing git repository...",
	"Git repository initialized",
	async () => {
		await $({ cwd: projectName })`git init`
	},
)

// Generate ASCII art for "Smithery" using figlet
const asciiArt = figlet.textSync("Smithery", { font: "Sub-Zero" })

console.log(
	"\n\n\n" +
		boxen(
			`${chalk.hex("#ea580c").bold(asciiArt)}\n\n${chalk.green.bold("* Welcome to your MCP server!")}\n\nTo get started, run:\n\n${chalk.bold.hex(
				"#ff8c00",
			)(
				`cd ${projectName} && ${packageManager} run dev`,
			)}\n\nTry saying something like ${chalk.bold.hex("#ff8c00")("'Say hello to John'")}`,
			{
				padding: 2,
				textAlignment: "left",
				borderStyle: "round",
				borderColor: "#ea580c",
				title: chalk.hex("#ea580c").bold("Smithery MCP Server"),
				titleAlignment: "left",
			},
		),
)
