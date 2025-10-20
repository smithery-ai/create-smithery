export const GIT_REPOS = {
	http: {
		repo: "https://github.com/smithery-ai/sdk.git",
		path: "examples/basic-server",
		betaMessage: null,
	},
	stdio: {
		repo: "https://github.com/smithery-ai/sdk.git",
		path: "examples/local-filesystem",
		betaMessage: null,
	},
	gpt: {
		repo: "https://github.com/smithery-ai/sdk.git",
		path: "examples/open-ai-hello-server",
		betaMessage: "⚠ Notice: ChatGPT apps support is currently in beta.",
	},
} as const

export const LINKS = {
	publish: "https://smithery.ai/new",
	reportIssues: "https://github.com/smithery-ai/create-smithery/issues/new",
} as const
