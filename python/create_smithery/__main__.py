import os
import subprocess
import sys
import questionary
import click
from rich.console import Console
from rich.progress import Progress

console = Console()

def detect_package_manager():
    # This is a placeholder. In a real-world scenario, you might want to check for poetry, pipenv, etc.
    return "uv"

@click.command()
@click.argument("project_name", required=False)
@click.option("--package-manager", default=detect_package_manager(), help="Package manager to use")
def main(project_name, package_manager):
    if not project_name:
        project_name = questionary.text("What is your project name?").ask()
        if not project_name:
            console.print("[red]Project name cannot be empty.[/red]")
            sys.exit(1)

    console.print(f"Creating project: {project_name}")

    with Progress(console=console) as progress:
        task1 = progress.add_task("[cyan]Cloning scaffold...", total=1)
        subprocess.run(["git", "clone", "https://github.com/smithery-ai/create-smithery.git", project_name], check=True, capture_output=True)
        
        # Move scaffold files to the root of the project directory
        scaffold_path = os.path.join(project_name, "python", "scaffold")
        for item in os.listdir(scaffold_path):
            s = os.path.join(scaffold_path, item)
            d = os.path.join(project_name, item)
            if os.path.isdir(s):
                subprocess.run(["cp", "-r", s, d], check=True)
            else:
                subprocess.run(["cp", s, d], check=True)
        progress.update(task1, advance=1)

        task2 = progress.add_task("[cyan]Cleaning up...", total=1)
        subprocess.run(["rm", "-rf", os.path.join(project_name, "js")], check=True)
        subprocess.run(["rm", "-rf", os.path.join(project_name, "python")], check=True)
        subprocess.run(["rm", "-rf", os.path.join(project_name, ".git")], check=True)
        progress.update(task2, advance=1)

        task3 = progress.add_task(f"[cyan]Installing dependencies with {package_manager}...", total=1)
        subprocess.run([package_manager, "pip", "install", "-e", "."], cwd=project_name, check=True, capture_output=True)
        progress.update(task3, advance=1)

    console.print(
        f"\n[bold green]Welcome to your MCP server![/bold green] To get started, run:\n\n"
        f"  cd {project_name} && {package_manager} run dev\n\n"
        f"Try saying something like 'Say hello to John' to execute your tool!"
    )

if __name__ == "__main__":
    main()
