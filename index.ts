#!/usr/bin/env node

import { $, execa } from "execa";
import inquirer from "inquirer";
import { Command } from "commander";
import boxen from "boxen";
import chalk from "chalk";
import { createWriteStream } from "fs";
import { once } from "events";

// Establish CLI args/flags
const program = new Command();
program.argument("[projectName]", "Name of the project").parse(process.argv);
program.option("--package-manager", "Package manager to use", "npm");

let [projectName] = program.args;
let packageManager = program.opts().packageManager;

// If no project name is provided, prompt the user for it
if (!projectName) {
  const { projectName: promptedName } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "What is your project name?",
      validate: (input: string) => {
        if (!input.trim()) {
          return "Project name cannot be empty";
        }
        return true;
      },
    },
  ]);
  // Use the prompted name
  console.log(`Creating project: ${promptedName}`);
  projectName = promptedName;
} else {
  // Use the provided name
  console.log(`Creating project: ${projectName}`);
}

async function load<T>(
  startMsg: string,
  endMsg: string,
  command: () => Promise<T>
): Promise<T> {
  process.stdout.write(`[ ] ${startMsg}\r`);
  const loadingChars = ["|", "/", "-", "\\"];
  let i = 0;
  const loadingInterval = setInterval(() => {
    process.stdout.write(`[${loadingChars[i]}] ${startMsg}\r`);
    i = (i + 1) % loadingChars.length;
  }, 250);

  const result = await command();
  clearInterval(loadingInterval);
  process.stdout.write(`\r\x1b[K[\u2713] ${endMsg}\n`);
  return result;
}

await load("Cloning scaffold from GitHub...", "Scaffold cloned", async () => {
  // Clone the scaffold and only keep the scaffold directory
  await $`git clone https://github.com/smithery-ai/create-smithery.git ${projectName}`;
  const files = await $`ls -al ${projectName}`;
  for (const file of files.stdout.split("\n")) {
    const fileName = file.split(" ").pop();
    if (
      fileName &&
      fileName !== "scaffold" &&
      fileName !== "." &&
      fileName !== ".."
    ) {
      await $`rm -rf ${projectName}/${fileName}`;
    }
  }
  await $`cp -r ${projectName}/scaffold/. ${projectName}/`;
  await $`rm -rf ${projectName}/scaffold`;
});

await load("Navigating to project...", "Project navigated", async () => {
  // await $`cd ${projectName}`; Not needed - we use cwd option instead
});
await $`rm -rf ${projectName}/.git`;
await $`rm -rf ${projectName}/package-lock.json`;
await $`rm -rf ${projectName}/node_modules`;

await load("Installing dependencies...", "Dependencies installed", async () => {
  console.log("\n\n");
  await $({ cwd: projectName, stdio: "inherit" })`${packageManager} install`;
});

console.log(
  "\n\n\n" +
  boxen(
    `Welcome to your MCP server! To get started, run: ${chalk.rgb(
      234,
      88,
      12
    )(
      `\n\ncd ${projectName} && ${packageManager} run dev`
    )}\n\nTry saying something like 'Say hello to John' to execute your tool!`,
    {
      padding: 2,
      textAlignment: "center",
    }
  )
);
