import { describe, it, expect, beforeEach, vi } from "vitest";
import { Command } from "commander";

describe("create-smithery CLI", () => {
	let program: Command;

	beforeEach(() => {
		program = new Command();
		program.argument("[name]", "Name of the project");
		program.option("-t, --transport <transport>", "Transport to use. HTTP or STDIO");
		program.option("--gpt", "Initialise a chatgpt app");
	});

	describe("Command parsing", () => {
		it("should parse project name and transport", () => {
			const argv = ["node", "main.ts", "my-app", "--transport=http"];
			program.parse(argv);

			expect(program.args[0]).toBe("my-app");
			expect(program.opts().transport).toBe("http");
		});

		it("should parse project name without transport", () => {
			const argv = ["node", "main.ts", "my-app"];
			program.parse(argv);

			expect(program.args[0]).toBe("my-app");
			expect(program.opts().transport).toBeUndefined();
		});

		it("should parse GPT flag without project name", () => {
			const argv = ["node", "main.ts", "--gpt"];
			program.parse(argv);

			expect(program.args[0]).toBeUndefined();
			expect(program.opts().gpt).toBe(true);
		});

		it("should parse with no arguments", () => {
			const argv = ["node", "main.ts"];
			program.parse(argv);

			expect(program.args[0]).toBeUndefined();
			expect(program.opts().gpt).toBeUndefined();
			expect(program.opts().transport).toBeUndefined();
		});
	});

	describe("npx create-smithery@latest my-app --transport=http", () => {
		it("should have project name and transport specified", () => {
			const argv = ["node", "main.ts", "my-app", "--transport=http"];
			program.parse(argv);

			// Should NOT prompt for project name
			// Should NOT prompt for transport
			// Should git clone repo
			// Should install packages

			expect(program.args[0]).toBe("my-app");
			expect(program.opts().transport).toBe("http");
		});
	});

	describe("npx create-smithery@latest", () => {
		it("should have no project name or transport specified", () => {
			const argv = ["node", "main.ts"];
			program.parse(argv);

			// Should prompt for project name
			// Should prompt for transport
			// Should git clone repo
			// Should install packages

			expect(program.args[0]).toBeUndefined();
			expect(program.opts().transport).toBeUndefined();
		});
	});

	describe("npx create-smithery --gpt", () => {
		it("should have GPT flag without project name", () => {
			const argv = ["node", "main.ts", "--gpt"];
			program.parse(argv);

			// Should prompt for project name
			// Should NOT prompt for transport
			// Should git clone gpt repo
			// Should install packages

			expect(program.args[0]).toBeUndefined();
			expect(program.opts().gpt).toBe(true);
			expect(program.opts().transport).toBeUndefined();
		});
	});

	describe("npx create-smithery my-app", () => {
		it("should have project name without transport", () => {
			const argv = ["node", "main.ts", "my-app"];
			program.parse(argv);

			// Should NOT prompt for project name
			// Should prompt for transport
			// Should git clone stdio transport repo
			// Should install packages

			expect(program.args[0]).toBe("my-app");
			expect(program.opts().transport).toBeUndefined();
		});
	});
});
