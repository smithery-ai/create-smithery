/**
 * 👋 Welcome to your Smithery project!
 * To run your server, run "npm run dev"
 *
 * You might find these resources useful:
 *
 * 🧑‍💻 MCP's TypeScript SDK (helps you define your server)
 * https://github.com/modelcontextprotocol/typescript-sdk
 *
 * 📝 smithery.yaml (defines user-level config, like settings or API keys)
 * https://smithery.ai/docs/build/project-config/smithery-yaml
 *
 * 💻 smithery CLI (run "npx @smithery/cli dev" or explore other commands below)
 * https://smithery.ai/docs/concepts/cli
 */

import {
	McpServer,
	ResourceTemplate,
} from "@modelcontextprotocol/sdk/server/mcp.js"
import { z } from "zod"

// Optional: If you have user-level config, define it here
// This should map to the config in your smithery.yaml file
export const configSchema = z.object({
	debug: z.boolean().default(false).describe("Enable debug logging"),
})

export default function createServer({
	config,
}: {
	config: z.infer<typeof configSchema> // Define your config in smithery.yaml
}) {
	const server = new McpServer({
		name: "My MCP Server",
		version: "1.0.0",
	})

	// Add a tool
	server.registerTool(
		"hello",
		{
			title: "Hello Tool",
			description: "Say hello to someone",
			inputSchema: { name: z.string().describe("Name to greet") },
		},
		async ({ name }) => ({
			content: [{ type: "text", text: `Hello, ${name}!` }],
		}),
	)

	// Add a resource
	server.registerResource(
		"info",
		new ResourceTemplate("user://{name}", { list: undefined }),
		{
			title: "User Resource",
			description: "Find information about someone",
		},
		async (uri, { name }) => ({
			contents: [
				{
					uri: uri.href,
					text: `${name} builds MCP servers`,
					mimeType: "text/plain",
				},
			],
		}),
	)

	// Add a prompt
	server.registerPrompt(
		"greet",
		{
			title: "Hello Prompt",
			description: "Say hello to someone",
			argsSchema: {
				name: z.string().describe("Name of the person to greet"),
			},
		},
		async ({ name }) => {
			return {
				messages: [
					{
						role: "user",
						content: {
							type: "text",
							text: `Say hello to ${name}`,
						},
					},
				],
			}
		},
	)

	return server.server
}
