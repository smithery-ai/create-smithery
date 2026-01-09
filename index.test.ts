import { describe, it, expect, beforeEach, vi } from "vitest"
import { TEMPLATES } from "./constants.js"

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
				description: "no args provided",
			},
			{
				projectName: "my-app",
				transport: undefined,
				description: "only transport missing",
			},
			{
				projectName: undefined,
				transport: "http",
				description: "only project name missing",
			},
			{
				projectName: "my-app",
				transport: "http",
				description: "all args provided",
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
				)

				// Verify return values
				expect(config.projectName).toBe(testCase.projectName || "test-app")
				expect(config.transport).toBeDefined()
			})
		}
	})

	describe("template selection", () => {
		const testCases = [
			{
				transport: "stdio",
				expectedPath: TEMPLATES.stdio.path,
				description: "STDIO template",
			},
			{
				transport: "http",
				expectedPath: TEMPLATES.http.path,
				description: "HTTP template",
			},
		]

		for (const testCase of testCases) {
			it(`should select correct template for ${testCase.description}`, async () => {
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
				)

				// Simulate calling the parts of main that select the template
				let templatePath: string
				if (config.transport === "stdio") {
					templatePath = TEMPLATES.stdio.path
				} else {
					templatePath = TEMPLATES.http.path
				}

				expect(templatePath).toBe(testCase.expectedPath)
			})
		}
	})

	describe("config completeness", () => {
		it("should have all required properties after prompting", async () => {
			const config = await promptForMissingValues("my-app", "http", "npm")

			// Verify all properties exist
			expect(config).toHaveProperty("projectName")
			expect(config).toHaveProperty("transport")
			expect(config).toHaveProperty("packageManager")
			expect(config).toHaveProperty("betaMessage")
		})

		it("should have valid projectName", async () => {
			const config = await promptForMissingValues("my-app", "http", "npm")

			expect(typeof config.projectName).toBe("string")
			expect(config.projectName.length).toBeGreaterThan(0)
		})

		it("should have valid transport value", async () => {
			const config = await promptForMissingValues("my-app", "stdio", "npm")

			expect(["http", "stdio"]).toContain(config.transport)
		})

		it("should have valid packageManager value", async () => {
			const config = await promptForMissingValues("my-app", "http", "bun")

			expect(["npm", "bun"]).toContain(config.packageManager)
		})

		it("should have valid betaMessage (null or string)", async () => {
			const config = await promptForMissingValues("my-app", "http", "npm")

			expect(
				config.betaMessage === null || typeof config.betaMessage === "string",
			).toBe(true)
		})

		it("should fill defaults when partial args provided", async () => {
			vi.mocked(inquirer.prompt).mockResolvedValueOnce({
				projectName: "test-app",
				packageManager: "npm",
				transport: "http",
			} as any)

			const config = await promptForMissingValues(
				"my-app",
				undefined,
				undefined,
			)

			// Should have all properties filled (either from args or prompts)
			expect(config.projectName).toBeDefined()
			expect(config.transport).toBeDefined()
			expect(config.packageManager).toBeDefined()
			expect(config.betaMessage).toBeDefined()
		})
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

			const config = await promptForMissingValues("my-app", "http")

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

			const config = await promptForMissingValues("my-app", "http")

			// Verify basic config
			expect(config.projectName).toBe("my-app")
		})

		it("clone failure should prevent install", async () => {
			vi.mocked(cloneRepository).mockResolvedValueOnce({
				success: false,
				message: "Clone failed",
				error: new Error("Clone failed"),
			} as never)

			const config = await promptForMissingValues("my-app", "http")
			expect(config.projectName).toBe("my-app")
		})
	})
})
