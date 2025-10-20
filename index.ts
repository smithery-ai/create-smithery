import inquirer from "inquirer"
import { Command } from "commander"
import chalk from "chalk"
import boxen from "boxen"
import cfonts from "cfonts"
import { cloneRepository } from "./git.js"
import { GIT_REPOS } from "./constants.js"
import { installPackages } from "./install.js"
import { load } from "./loader.js"
import cliSpinners from "cli-spinners"

const program = new Command()
program.argument("[name]", "Name of the project")
program.option("-t, --transport <transport>", "Transport to use. HTTP or STDIO")
program.option("--gpt", "Initialise a chatgpt app")
// program.option("--package-manager <manager>", "Package manager to use") ignore for now
program.parse(process.argv)

const args = program.args
const opts = program.opts()

interface Config {
	projectName: string
	transport: string
	isGpt: boolean
}

async function promptForMissingValues(
	projectName?: string,
	transport?: string,
	isGpt?: boolean
): Promise<Config> {
	const questions: any[] = []

	if (!projectName) {
		questions.push({
			type: "input",
			name: "projectName",
			message: "What is your project name?",
			default: "my-smithery-app",
		})
	}

	// Then ask for transport if needed
	if (!transport && !isGpt) {
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
		isGpt: isGpt || false,
	}
}

async function main() {
	const config = await promptForMissingValues(args[0], opts.transport, opts.gpt)

	// Determine repo URL based on config
	let repoUrl: string
	let templatePath: string
	if (config.isGpt) {
		repoUrl = GIT_REPOS.gpt.repo
		templatePath = GIT_REPOS.gpt.path
	} else if (config.transport === "stdio") {
		repoUrl = GIT_REPOS.stdio.repo
		templatePath = GIT_REPOS.stdio.path
	} else {
		repoUrl = GIT_REPOS.http.repo
		templatePath = GIT_REPOS.http.path
	}

	// Clone the repository
	console.log(chalk.gray(`  $ git clone --depth 1 '${repoUrl}' ${config.projectName}`))
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
	console.log(chalk.gray(`  $ npm install`))
	const installResult = await load(
		"Installing packages...",
		"Packages installed",
		() => installPackages(config.projectName),
		cliSpinners.star2,
		"yellow",
	)

	if (!installResult.success) {
		console.error("Install failed:", installResult.error)
		process.exit(1)
	}

	// Display SMITHERY in tiny font using cfonts
	const smitheryOutput = cfonts.render("SMITHERY", {
		font: "tiny",
		colors: ["#ea580c"],
		spaceless: true,
	})

	const message = `${smitheryOutput}
${chalk.white("To get started, run:")}
  ${chalk.white(`cd ${config.projectName} && npm run dev`)}

${chalk.white("Try saying something like")} ${chalk.bold.hex("#ff8c00")("'Say hello to John'")}

${chalk.white("To publish:")} ${chalk.hex("#00d4ff")("https://smithery.ai/new")}`

	console.log(
		boxen(message, {
			padding: 1,
			margin: 1,
			borderStyle: "round",
			borderColor: "cyan",
		})
	)
}

main().catch(console.error)
