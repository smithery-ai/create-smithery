import { execa } from "execa";

interface InstallResult {
	success: boolean;
	message: string;
	error?: Error;
}

export async function installPackages(
	projectPath: string
): Promise<InstallResult> {
	try {
		await execa("npm", ["install"], { cwd: projectPath });
		return {
			success: true,
			message: "",
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to install packages in ${projectPath}`,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}
