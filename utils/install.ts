import { execa } from "execa"

interface InstallResult {
	success: boolean
	message: string
	error?: Error
}

export async function installPackages(
	projectPath: string,
	packageManager = "npm",
): Promise<InstallResult> {
	try {
		await execa(packageManager, ["install"], { cwd: projectPath })
		return {
			success: true,
			message: "",
		}
	} catch (error) {
		return {
			success: false,
			message: `Failed to install packages in ${projectPath}`,
			error: error instanceof Error ? error : new Error(String(error)),
		}
	}
}
