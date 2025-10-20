import { execa } from "execa";
import fs from "fs/promises";
import path from "path";
import chalk from "chalk";

interface CloneResult {
	success: boolean;
	message: string;
	error?: Error;
}

export async function cloneRepository(
	repoUrl: string,
	targetLocation: string,
	basePath?: string
): Promise<CloneResult> {
	try {
		// Clone the repository
		await execa("git", ["clone", "--depth", "1", repoUrl, targetLocation]);

		// If a base path is specified, extract that subdirectory to the target location
		if (basePath && basePath !== ".") {
			const templatePath = path.join(targetLocation, basePath);

			// Copy template contents to a temp directory
			const tempDir = path.join(targetLocation, "_temp_template");
			await fs.cp(templatePath, tempDir, { recursive: true });

			// Remove all files in target location except temp directory
			const files = await fs.readdir(targetLocation);
			for (const fileName of files) {
				if (fileName !== "_temp_template") {
					const filePath = path.join(targetLocation, fileName);
					await fs.rm(filePath, { recursive: true, force: true });
				}
			}

			// Move temp directory contents to target location
			const tempFiles = await fs.readdir(tempDir);
			for (const file of tempFiles) {
				const src = path.join(tempDir, file);
				const dest = path.join(targetLocation, file);
				await fs.rename(src, dest);
			}

			// Remove temp directory
			await fs.rm(tempDir, { recursive: true, force: true });
		}

		// Clean up unnecessary files
		await fs.rm(path.join(targetLocation, ".git"), { recursive: true, force: true }).catch(() => {});
		await fs.rm(path.join(targetLocation, "package-lock.json"), { force: true }).catch(() => {});
		await fs.rm(path.join(targetLocation, "node_modules"), { recursive: true, force: true }).catch(() => {});

		return {
			success: true,
			message: `Successfully cloned repository to ${targetLocation}`,
		};
	} catch (error) {
		return {
			success: false,
			message: `Failed to clone repository from ${repoUrl} to ${targetLocation}`,
			error: error instanceof Error ? error : new Error(String(error)),
		};
	}
}
