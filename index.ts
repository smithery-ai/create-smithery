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

let [projectName] = program.args
const packageManager = program.opts().packageManager || detectPackageManager()

// If no project name is provided, prompt the user for it
if (!projectName) {
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
} else {
	// Use the provided name
	console.log(`Creating project: ${projectName}`)
}

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

await load("Cloning scaffold from GitHub...", "Scaffold cloned", async () => {
	// Clone the scaffold and only keep the scaffold directory
	await $`git clone https://github.com/smithery-ai/create-smithery.git ${projectName}`

	// Use native fs operations instead of shx
	const files = await fs.readdir(projectName)
	for (const fileName of files) {
		if (fileName !== "scaffold" && fileName !== "." && fileName !== "..") {
			const filePath = path.join(projectName, fileName)
			const stats = await fs.stat(filePath)
			if (stats.isDirectory()) {
				await fs.rm(filePath, { recursive: true, force: true })
			} else {
				await fs.unlink(filePath)
			}
		}
	}

	// Copy scaffold contents to project root
	const scaffoldPath = path.join(projectName, "scaffold")
	const scaffoldFiles = await fs.readdir(scaffoldPath)
	for (const file of scaffoldFiles) {
		const src = path.join(scaffoldPath, file)
		const dest = path.join(projectName, file)
		const stats = await fs.stat(src)
		if (stats.isDirectory()) {
			await fs.cp(src, dest, { recursive: true })
		} else {
			await fs.copyFile(src, dest)
		}
	}

	// Remove the scaffold directory
	await fs.rm(scaffoldPath, { recursive: true, force: true })
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
