import ora from "ora";
import cliSpinners from "cli-spinners";

export async function load<T>(
	startMsg: string,
	endMsg: string,
	command: () => Promise<T>,
	spinner = cliSpinners.star,
	color: "black" | "red" | "green" | "yellow" | "blue" | "magenta" | "cyan" | "white" | "gray" = "yellow",
): Promise<T> {
	const oraSpinner = ora({
		text: startMsg,
		spinner: spinner,
		color: color,
	}).start();

	try {
		const result = await command();
		oraSpinner.succeed(endMsg);
		return result;
	} catch (error) {
		oraSpinner.fail(endMsg);
		throw error;
	}
}
