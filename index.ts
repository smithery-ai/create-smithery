#!/usr/bin/env node

import inquirer from "inquirer"
import { Command } from "commander"
import chalk from "chalk"
import boxen from "boxen"
import { cloneRepository } from "./utils/git.js"
import { GIT_REPOS, LINKS } from "./constants.js"
import { installPackages } from "./utils/install.js"
import { load } from "./utils/loader.js"
import { SMITHERY_ASCII } from "./utils/smithery-ascii.js"
import cliSpinners from "cli-spinners"
import { existsSync } from "node:fs"
import packageJson from "./package.json" with { type: "json" }

const program = new Command()
program.argument("[name]", "Name of the project")
program.option("-t, --transport <transport>", "Transport to use. HTTP or STDIO")
program.option(
	"-p, --package-manager <manager>",
	"Package manager to use (npm, bun)",
)
program.parse(process.argv)

const args = program.args
const opts = program.opts()

interface Config {
	projectName: string
	transport: string
	packageManager: string
	betaMessage: string | null
}

async function promptForMissingValues(
	projectName?: string,
	transport?: string,
	packageManager?: string,
): Promise<Config> {
	const questions: any[] = []

	if (!projectName) {
		questions.push({
			type: "input",
			name: "projectName",
			message: "What is your project name?",
			default: "my-smithery-app",
			validate: (input: string) => {
				if (existsSync(input)) {
					return `Directory already exists. Please choose a different name`
				}
				return true
			},
		})
	} else if (existsSync(projectName)) {
		console.error(
			chalk.yellow(
				`✖ Directory already exists. Please choose a different name`,
			),
		)
		console.error(
			chalk.cyan(`Use a different name: npx create-smithery <name>`),
		)
		process.exit(1)
	}

	// Ask for package manager after project name
	if (!packageManager) {
		questions.push({
			type: "list",
			name: "packageManager",
			message: "Select a package manager:",
			choices: [
				{
					name: "npm",
					value: "npm",
				},
				{
					name: "bun",
					value: "bun",
				},
			],
			default: "npm",
		})
	}

	// Then ask for transport if needed
	if (!transport) {
		questions.push({
			type: "list",
			name: "transport",
			message: "Select the transport you want to use:",
			choices: [
				{
					name: "HTTP (runs on a server)",
					value: "http",
				},
				{
					name: "STDIO (runs on the user's machine)",
					value: "stdio",
				},
			],
			default: "http",
		})
	}

	const answers = questions.length > 0 ? await inquirer.prompt(questions) : {}

	return {
		projectName: projectName || answers.projectName,
		transport: transport || answers.transport || "http",
		packageManager: packageManager || answers.packageManager || "npm",
		betaMessage: null, // Default to null, will be set later if needed
	}
}

async function main() {
	const config = await promptForMissingValues(
		args[0],
		opts.transport,
		opts.packageManager,
	)

	// Determine repo URL based on config
	let repoUrl: string
	let templatePath: string
	let betaMessage: string | null = null
	if (config.transport === "stdio") {
		repoUrl = GIT_REPOS.stdio.repo
		templatePath = GIT_REPOS.stdio.path
		betaMessage = GIT_REPOS.stdio.betaMessage
	} else {
		repoUrl = GIT_REPOS.http.repo
		templatePath = GIT_REPOS.http.path
		betaMessage = GIT_REPOS.http.betaMessage
	}

	// Clone the repository
	console.log(
		chalk.gray(`  $ git clone --depth 1 '${repoUrl}' ${config.projectName}`),
	)
	const cloneResult = await load(
		"Cloning repository...",
		"Repository cloned",
		() => cloneRepository(repoUrl, config.projectName, templatePath),
		cliSpinners.star,
		"yellow",
	)

	if (!cloneResult.success) {
		console.error("Clone failed:", cloneResult.error)
		process.exit(1)
	}

	// Install packages
	console.log(chalk.gray(`  $ ${config.packageManager} install`))
	const installResult = await load(
		"Installing packages...",
		`Packages installed`,
		() => installPackages(config.projectName, config.packageManager),
		cliSpinners.star,
		"yellow",
	)

	if (!installResult.success) {
		console.error("Install failed:", installResult.error)
		process.exit(1)
	}

	// Display SMITHERY ASCII art
	const smitheryOutput = chalk.hex("#ea580c")(SMITHERY_ASCII)

	const message = `${smitheryOutput}

${chalk.white("To get started, run:")}
  ${chalk.cyan(`cd ${config.projectName} && ${config.packageManager} run dev`)}

${chalk.white("Try saying something like")} ${chalk.cyan("'Say hello to John'")}

${chalk.white("To publish:")} ${chalk.cyan(LINKS.publish)}
${chalk.white("Report issues:")} ${chalk.cyan.dim(LINKS.reportIssues)}`

	console.log(
		boxen(message, {
			padding: 1,
			margin: 1,
			borderStyle: "round",
			borderColor: "#ea580c",
			width: Math.min(Math.max(process.stdout.columns - 4, 60), 120),
			title: `${packageJson.name} ${chalk.dim(`v${packageJson.version}`)}`,
			titleAlignment: "left",
		}),
	)

	if (betaMessage) {
		console.log(`${chalk.yellow(betaMessage)}\n`)
	}
}

export { promptForMissingValues, main }

// Handle Ctrl+C gracefully
process.on("SIGINT", () => {
	console.log(`\n${chalk.yellow("Setup cancelled")}`)
	process.exit(0)
})

main().catch(error => {
	// Check if this is a user cancellation from inquirer
	if (
		error.isTtyError ||
		error.message === "User force closed the prompt" ||
		error.message?.includes("SIGINT")
	) {
		console.log(chalk.yellow("Cancelled"))
		process.exit(0)
	} else {
		console.error(chalk.red("An error occurred:"), error.message)
		process.exit(1)
	}
})
