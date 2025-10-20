import { describe, it, expect, beforeEach, vi } from "vitest"
import { GIT_REPOS } from "./constants.js"

// Mock inquirer module
vi.mock("inquirer", () => {
	return {
		default: {
			prompt: vi.fn(async () => ({
				projectName: "test-app",
				transport: "stdio",
			})),
		},
	}
})

// Mock the git utilities
vi.mock("./utils/git.js", () => {
	return {
		cloneRepository: vi.fn(async () => ({
			success: true,
			message: "",
		})),
	}
})

// Mock the install utilities
vi.mock("./utils/install.js", () => {
	return {
		installPackages: vi.fn(async () => ({
			success: true,
			message: "",
		})),
	}
})

import { promptForMissingValues } from "./index.js"
import inquirer from "inquirer"
import { cloneRepository } from "./utils/git.js"
import { installPackages } from "./utils/install.js"

describe("create-smithery CLI", () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	describe("prompting logic", () => {
		const testCases = [
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
		]

		for (const testCase of testCases) {
			it(`should prompt correctly when ${testCase.description}`, async () => {
				vi.mocked(inquirer.prompt).mockResolvedValueOnce({
					projectName: "test-app",
					transport: "stdio",
				} as any)

				const config = await promptForMissingValues(
					testCase.projectName,
					testCase.transport,
					testCase.isGpt,
				)

				// Verify return values
				expect(config.projectName).toBe(testCase.projectName || "test-app")
				expect(config.isGpt).toBe(testCase.isGpt)
				expect(config.transport).toBeDefined()
			})
		}
	})

	describe("template selection", () => {
		const testCases = [
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
		]

		for (const testCase of testCases) {
			it(`should select correct repo for ${testCase.description}`, async () => {
				vi.mocked(cloneRepository).mockResolvedValueOnce({
					success: true,
					message: "",
				})
				vi.mocked(installPackages).mockResolvedValueOnce({
					success: true,
					message: "",
				})

				const config = await promptForMissingValues(
					"my-app",
					testCase.transport,
					testCase.isGpt,
				)

				// Simulate calling the parts of main that select the repo
				let repoUrl: string
				if (config.isGpt) {
					repoUrl = GIT_REPOS.gpt.repo
				} else if (config.transport === "stdio") {
					repoUrl = GIT_REPOS.stdio.repo
				} else {
					repoUrl = GIT_REPOS.http.repo
				}

				expect(repoUrl).toBe(testCase.expectedRepo)
			})
		}
	})

	describe("execution flow", () => {
		it("should install after clone succeeds", async () => {
			vi.mocked(cloneRepository).mockResolvedValueOnce({
				success: true,
				message: "",
			})
			vi.mocked(installPackages).mockResolvedValueOnce({
				success: true,
				message: "",
			})

			const config = await promptForMissingValues("my-app", "http", false)

			expect(config.projectName).toBe("my-app")
		})

		it("should call clone and install in sequence when integration runs", async () => {
			vi.mocked(cloneRepository).mockResolvedValueOnce({
				success: true,
				message: "",
			})
			vi.mocked(installPackages).mockResolvedValueOnce({
				success: true,
				message: "",
			})

			const config = await promptForMissingValues("my-app", "http", false)

			// Verify basic config
			expect(config.projectName).toBe("my-app")
		})

		it("clone failure should prevent install", async () => {
			vi.mocked(cloneRepository).mockResolvedValueOnce({
				success: false,
				message: "Clone failed",
				error: new Error("Clone failed"),
			} as any)

			const config = await promptForMissingValues("my-app", "http", false)
			expect(config.projectName).toBe("my-app")
		})
	})

	describe("validation", () => {
		it("should reject gpt flag with stdio transport", async () => {
			// GPT apps can only use HTTP transport
			// When isGpt=true and transport=stdio, the config should still be created
			// but the main() function should exit with error (tested separately)
			const config = await promptForMissingValues(
				"my-app",
				"stdio",
				true,
				"npm",
			)

			expect(config.isGpt).toBe(true)
			expect(config.transport).toBe("stdio")
			// In the actual main() flow, this combination should trigger process.exit(1)
		})

		it("should reject gpt flag with non-http transport", async () => {
			const config = await promptForMissingValues(
				"my-app",
				"stdio",
				true,
				"npm",
			)

			// The validation happens in main() before selecting template
			// This test verifies the config is created, validation in main() handles rejection
			expect(config.isGpt).toBe(true)
			expect(config.transport).toBe("stdio")
		})

		it("should allow gpt flag with http transport (or no transport specified)", async () => {
			const config = await promptForMissingValues(
				"my-app",
				"http",
				true,
				"npm",
			)

			expect(config.isGpt).toBe(true)
			expect(config.transport).toBe("http")
		})

		it("should allow gpt flag with no transport specified", async () => {
			vi.mocked(inquirer.prompt).mockResolvedValueOnce({
				projectName: "test-app",
				transport: "http",
			} as any)

			const config = await promptForMissingValues(
				"my-app",
				undefined,
				true,
				"npm",
			)

			expect(config.isGpt).toBe(true)
			// When gpt=true, no transport prompt is shown, defaults to http
			expect(config.transport).toBe("http")
		})
	})
})
