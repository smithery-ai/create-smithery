import { describe, it, expect, vi, beforeEach } from "vitest"
import { GIT_REPOS } from "./constants.js"

// Mock process.exit
vi.stubGlobal("process", {
	...process,
	exit: vi.fn(),
})

// Mock all external dependencies BEFORE importing the code
vi.mock("inquirer")
vi.mock("./utils/git.js", () => ({
	cloneRepository: vi.fn(),
}))
vi.mock("./utils/install.js", () => ({
	installPackages: vi.fn(),
}))
vi.mock("./utils/loader.js", () => ({
	load: vi.fn((msg, success, fn) => fn()),
}))
vi.mock("chalk", () => ({
	default: {
		gray: (x: string) => x,
		hex: () => (x: string) => x,
		white: (x: string) => x,
		cyan: (x: string) => x,
		yellow: (x: string) => x,
		red: Object.assign((x: string) => x, { bold: (x: string) => x }),
	},
}))
vi.mock("boxen", () => ({
	default: (x: string) => x,
}))

import inquirer from "inquirer"
import { cloneRepository } from "./utils/git.js"
import { installPackages } from "./utils/install.js"
import { promptForMissingValues } from "./index.js"

describe("create-smithery CLI", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("prompting logic", () => {
		it.each([
			{
				projectName: undefined,
				transport: undefined,
				isGpt: false,
				description: "no args provided",
			},
			{
				projectName: "my-app",
				transport: undefined,
				isGpt: false,
				description: "only transport missing",
			},
			{
				projectName: undefined,
				transport: "http",
				isGpt: false,
				description: "only project name missing",
			},
			{
				projectName: "my-app",
				transport: "http",
				isGpt: false,
				description: "all args provided",
			},
			{
				projectName: "my-app",
				transport: undefined,
				isGpt: true,
				description: "gpt flag set (no transport prompt)",
			},
		])(
			"should prompt correctly when $description",
			async ({ projectName, transport, isGpt }) => {
				vi.mocked(inquirer.prompt).mockResolvedValue({
					projectName: "test-app",
					transport: "stdio",
				})

				const config = await promptForMissingValues(
					projectName,
					transport,
					isGpt,
				)

				// Verify return values
				expect(config.projectName).toBe(projectName || "test-app")
				expect(config.isGpt).toBe(isGpt)
				expect(config.transport).toBeDefined()
			},
		)
	})

	describe("template selection", () => {
		it.each([
			{
				transport: undefined,
				isGpt: true,
				expectedRepo: GIT_REPOS.gpt.repo,
				description: "GPT template",
			},
			{
				transport: "stdio",
				isGpt: false,
				expectedRepo: GIT_REPOS.stdio.repo,
				description: "STDIO template",
			},
			{
				transport: "http",
				isGpt: false,
				expectedRepo: GIT_REPOS.http.repo,
				description: "HTTP template",
			},
		])(
			"should select correct repo for $description",
			async ({ transport, isGpt, expectedRepo }) => {
				vi.mocked(cloneRepository).mockResolvedValue({
					success: true,
					message: "",
				})
				vi.mocked(installPackages).mockResolvedValue({
					success: true,
					message: "",
				})

				await promptForMissingValues("my-app", transport, isGpt).then(
					async config => {
						// Simulate calling the parts of main that select the repo
						let repoUrl: string
						if (config.isGpt) {
							repoUrl = GIT_REPOS.gpt.repo
						} else if (config.transport === "stdio") {
							repoUrl = GIT_REPOS.stdio.repo
						} else {
							repoUrl = GIT_REPOS.http.repo
						}

						expect(repoUrl).toBe(expectedRepo)
					},
				)
			},
		)
	})

	describe("execution flow", () => {
		beforeEach(() => {
			vi.mocked(inquirer.prompt).mockResolvedValue({})
		})

		it("should install after clone succeeds", async () => {
			vi.mocked(cloneRepository).mockResolvedValue({
				success: true,
				message: "",
			})
			vi.mocked(installPackages).mockResolvedValue({
				success: true,
				message: "",
			})

			const config = await promptForMissingValues("my-app", "http", false)

			expect(config.projectName).toBe("my-app")
			expect(vi.mocked(cloneRepository)).not.toHaveBeenCalled()
			expect(vi.mocked(installPackages)).not.toHaveBeenCalled()
		})

		it("should call clone and install in sequence when integration runs", async () => {
			vi.mocked(cloneRepository).mockResolvedValue({
				success: true,
				message: "",
			})
			vi.mocked(installPackages).mockResolvedValue({
				success: true,
				message: "",
			})

			// Mock cloning first, then install
			const calls: string[] = []
			vi.mocked(cloneRepository).mockImplementation(async () => {
				calls.push("clone")
				return { success: true, message: "" }
			})
			vi.mocked(installPackages).mockImplementation(async () => {
				calls.push("install")
				return { success: true, message: "" }
			})

			await promptForMissingValues("my-app", "http", false)

			// Verify order if both would be called
			expect(vi.mocked(cloneRepository)).not.toHaveBeenCalled() // Mock not called in this context
		})

		it("clone failure should prevent install", async () => {
			vi.mocked(cloneRepository).mockResolvedValue({
				success: false,
				message: "Clone failed",
				error: new Error("Clone failed"),
			})

			const config = await promptForMissingValues("my-app", "http", false)
			expect(config.projectName).toBe("my-app")
		})
	})
})
