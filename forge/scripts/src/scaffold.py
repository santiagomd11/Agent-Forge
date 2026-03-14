import os
import shutil
import subprocess
from dataclasses import dataclass, field
from pathlib import Path

# Templates directory -- source of truth for all standard files
_TEMPLATES_DIR = Path(__file__).resolve().parent.parent.parent / "utils" / "scaffold"
# Export scripts that get copied into every generated agent's scripts/src/
_EXPORT_SCRIPTS_DIR = Path(__file__).resolve().parent


@dataclass
class ScaffoldConfig:
    """Everything needed to generate a scaffold deterministically."""

    workflow_name: str  # kebab-case, e.g. "code-reviewer"
    workflow_description: str  # plain English description
    folder_name: str  # output folder name (may be UUID or workflow_name)
    steps: list[dict] = field(default_factory=list)
    # Each step: {"number": 1, "name": "Analyze Code", "command": "analyze-code"}
    agents: list[dict] = field(default_factory=list)
    # Each agent: {"number": 2, "name": "Code_Analyst"}
    computer_use: bool = False


def generate_scaffold(config: ScaffoldConfig, base_dir: str) -> str:
    """Generate the full project scaffold under base_dir/folder_name.

    Returns the absolute path to the generated project root.
    """
    root = os.path.join(base_dir, config.folder_name)

    _create_directories(root, config)
    _create_gitkeep_files(root, config)
    _create_readme(root, config)
    _create_claude_md(root, config)
    _create_scripts_readme(root, config)
    _create_requirements_txt(root)
    _copy_standard_prompts(root)
    _copy_export_scripts(root)
    _create_fix_command(root)
    _create_start_command(root, config)
    _create_step_commands(root, config)

    if config.computer_use:
        _create_computer_use_config(root)
        _create_computer_use_commands(root)

    # Create venv and install base dependencies (export scripts need them).
    # Graceful: if python3 is unavailable the scaffold still works, the user
    # just has to create the venv manually.
    try:
        create_venv(root)
    except (subprocess.CalledProcessError, FileNotFoundError):
        pass  # venv creation failed; manual setup required

    return root


# --- Directory creation ---


def _create_directories(root: str, config: ScaffoldConfig) -> None:
    """Create the full directory tree."""
    dirs = [
        ".claude/commands",
        "agent/Prompts",
        "agent/scripts/src",
        "agent/scripts/tests",
        "agent/utils/code",
        "agent/utils/docs",
        "output",
    ]
    if config.computer_use:
        dirs.append("computer_use")

    for d in dirs:
        os.makedirs(os.path.join(root, d), exist_ok=True)


def _create_gitkeep_files(root: str, config: ScaffoldConfig) -> None:
    """Place .gitkeep in directories that start empty."""
    gitkeep_dirs = [
        "agent/scripts/src",
        "agent/scripts/tests",
        "agent/utils/code",
        "agent/utils/docs",
        "output",
    ]
    for d in gitkeep_dirs:
        path = os.path.join(root, d, ".gitkeep")
        _write(path, "")


# --- README.md ---


def _create_readme(root: str, config: ScaffoldConfig) -> None:
    """Generate README.md from template with all placeholders filled."""
    template = _read_template("README.md.template")

    # Build command table
    rows = []
    for step in config.steps:
        rows.append(
            f"| /{step['command']} | Step {step['number']} "
            f"| {step['name']} |"
        )
    rows.append("| /fix [problem] | -- | Diagnose and fix issues in this workflow |")
    command_table = "\n".join(rows)

    start_cmd = f"start-{config.workflow_name}"

    content = template
    content = content.replace("{{WORKFLOW_NAME}}", config.workflow_name)
    content = content.replace("{{WORKFLOW_DESCRIPTION}}", config.workflow_description)
    content = content.replace("{{START_COMMAND}}", start_cmd)
    content = content.replace("{{COMMAND_TABLE}}", command_table)
    # Strip template comments
    content = _strip_html_comments(content)

    _write(os.path.join(root, "README.md"), content)


# --- CLAUDE.md ---


def _create_claude_md(root: str, config: ScaffoldConfig) -> None:
    """Generate CLAUDE.md from template."""
    template = _read_template("CLAUDE.md.template")

    start_cmd = f"start-{config.workflow_name}"

    # Build structure tree
    tree = _build_structure_tree(config)

    # Build command list
    cmd_lines = [f"/{start_cmd}    # Full workflow from scratch"]
    for step in config.steps:
        cmd_lines.append(f"/{step['command']}    # Step {step['number']}: {step['name']}")
    cmd_lines.append("/fix [problem]    # Diagnose and fix issues in this workflow")
    command_list = "\n".join(cmd_lines)

    # Build rules
    rules = [
        "- Always read `agentic.md` fully before starting any step",
        "- Never skip approval gates (marked with pause symbol)",
        f"- Outputs go in `output/`",
        "- Every output must include all required sections",
        "- Scripts require a Python venv: "
        "`python3 -m venv agent/scripts/.venv && source agent/scripts/.venv/bin/activate "
        "&& pip install -r agent/scripts/requirements.txt`",
    ]
    rules_list = "\n".join(rules)

    # Naming conventions
    naming = (
        "- Slash commands: kebab-case (e.g., analyze-code.md)\n"
        "- Agent prompts: zero-padded with underscores (e.g., 02_Agent_Name.md)\n"
        "- Output files: numbered prefixes (e.g., 01_analysis.md)\n"
        "- Placeholders: {{UPPER_SNAKE_CASE}}"
    )

    content = template
    content = content.replace("{{WORKFLOW_NAME}}", config.workflow_name)
    content = content.replace("{{STRUCTURE_TREE}}", tree)
    content = content.replace("{{START_COMMAND}}", start_cmd)
    content = content.replace("{{COMMAND_LIST_WITH_DESCRIPTIONS}}", command_list)
    content = content.replace("{{RULES_LIST}}", rules_list)
    content = content.replace("{{NAMING_CONVENTIONS}}", naming)
    content = _strip_html_comments(content)

    _write(os.path.join(root, "CLAUDE.md"), content)


def _build_structure_tree(config: ScaffoldConfig) -> str:
    """Build an ASCII directory tree for the project."""
    lines = [
        f"{config.folder_name}/",
        "|-- README.md",
        "|-- CLAUDE.md",
        "|-- agentic.md",
        "|-- .claude/",
        "|   |-- commands/",
        f"|       |-- start-{config.workflow_name}.md",
    ]
    for step in config.steps:
        lines.append(f"|       |-- {step['command']}.md")
    lines.append("|       |-- fix.md")
    lines.append("|-- agent/")
    lines.append("|   |-- Prompts/")
    lines.append("|   |   |-- 00_Workflow_Fixer.md")
    lines.append("|   |   |-- 01_Senior_Prompt_Engineer.md")
    for agent in config.agents:
        lines.append(f"|   |   |-- {agent['number']:02d}_{agent['name']}.md")
    lines.append("|   |-- scripts/")
    lines.append("|   |   |-- src/")
    lines.append("|   |   |-- tests/")
    lines.append("|   |   |-- requirements.txt")
    lines.append("|   |   |-- README.md")
    lines.append("|   |-- utils/")
    lines.append("|       |-- code/")
    lines.append("|       |-- docs/")
    lines.append("|-- output/")
    if config.computer_use:
        lines.append("|-- computer_use/")
        lines.append("    |-- config.yaml")
    return "\n".join(lines)


# --- Standard prompts (copied from templates) ---


def _copy_standard_prompts(root: str) -> None:
    """Copy 00_Workflow_Fixer and 01_Senior_Prompt_Engineer from templates."""
    prompts_dir = os.path.join(root, "agent", "Prompts")

    src_fixer = _TEMPLATES_DIR / "00_Workflow_Fixer.md.template"
    src_spe = _TEMPLATES_DIR / "01_Senior_Prompt_Engineer.md.template"

    shutil.copy2(str(src_fixer), os.path.join(prompts_dir, "00_Workflow_Fixer.md"))
    shutil.copy2(str(src_spe), os.path.join(prompts_dir, "01_Senior_Prompt_Engineer.md"))


# --- Command files ---


def _create_fix_command(root: str) -> None:
    """Copy fix.md from template."""
    src = _TEMPLATES_DIR / "fix.md.template"
    dst = os.path.join(root, ".claude", "commands", "fix.md")
    shutil.copy2(str(src), dst)


def _create_start_command(root: str, config: ScaffoldConfig) -> None:
    """Generate the master start command."""
    filename = f"start-{config.workflow_name}.md"
    step_list = "\n".join(
        f"  - Step {s['number']}: {s['name']}" for s in config.steps
    )
    content = (
        f"---\n"
        f"description: Run the full {config.workflow_name} workflow from start to finish.\n"
        f"---\n"
        f"\n"
        f"Read `agentic.md` to understand the full workflow structure and rules.\n"
        f"\n"
        f"Execute all steps in order:\n"
        f"{step_list}\n"
        f"\n"
        f"Follow the orchestrator instructions for each step. Do not skip any steps.\n"
    )
    _write(os.path.join(root, ".claude", "commands", filename), content)


def _create_step_commands(root: str, config: ScaffoldConfig) -> None:
    """Generate one command file per workflow step."""
    for step in config.steps:
        # Find agent for this step (if any)
        agent_ref = ""
        for agent in config.agents:
            # Simple heuristic: agent numbers start at 2, map to steps
            # In practice the config should specify which agent goes with which step
            pass

        content = (
            f"---\n"
            f"description: {step['name']} (Step {step['number']} of {config.workflow_name})\n"
            f"---\n"
            f"\n"
            f"Read `agentic.md` to understand the full workflow structure and rules.\n"
            f"\n"
            f"Execute Step {step['number']}: {step['name']}.\n"
            f"\n"
            f"Follow the orchestrator instructions for this step exactly.\n"
        )
        _write(
            os.path.join(root, ".claude", "commands", f"{step['command']}.md"),
            content,
        )


# --- Scripts README ---


def _create_scripts_readme(root: str, config: ScaffoldConfig) -> None:
    """Generate the scripts README with venv setup instructions."""
    content = (
        f"# Scripts\n"
        f"\n"
        f"Scripts that support the {config.workflow_name} workflow.\n"
        f"\n"
        f"## Structure\n"
        f"\n"
        f"- `src/` - Source scripts\n"
        f"- `tests/` - Test scripts\n"
        f"\n"
        f"## Setup\n"
        f"\n"
        f"Create and activate a Python virtual environment before running any scripts:\n"
        f"\n"
        f"```bash\n"
        f"python3 -m venv agent/scripts/.venv\n"
        f"source agent/scripts/.venv/bin/activate\n"
        f"pip install -r agent/scripts/requirements.txt\n"
        f"```\n"
        f"\n"
        f"## Tests\n"
        f"\n"
        f"```bash\n"
        f"source agent/scripts/.venv/bin/activate\n"
        f"python -m pytest agent/scripts/tests/\n"
        f"```\n"
    )
    _write(os.path.join(root, "agent", "scripts", "README.md"), content)


def _create_requirements_txt(root: str) -> None:
    """Create requirements.txt with export script deps."""
    content = "reportlab\npython-docx\nopenpyxl\n"
    _write(os.path.join(root, "agent", "scripts", "requirements.txt"), content)


def _copy_export_scripts(root: str) -> None:
    """Copy document and spreadsheet generators into agent/scripts/src/."""
    dst_dir = os.path.join(root, "agent", "scripts", "src")
    for name in ("gen_document.py", "gen_xlsx.py"):
        src = _EXPORT_SCRIPTS_DIR / name
        if src.exists():
            shutil.copy2(str(src), os.path.join(dst_dir, name))


# --- Add script to a specific agent ---


def add_script(
    agent_root: str,
    script_name: str,
    script_content: str,
    test_content: str | None = None,
    dependencies: list[str] | None = None,
) -> None:
    """Place a script into an agent's scripts folder.

    Handles file placement, directory creation, and requirements deduplication.
    Works for any type of script: format generators, data processors, API
    clients, validators, etc.

    Args:
        agent_root: Path to the agent's root directory (e.g. output/{id}/).
        script_name: File name for the script, e.g. "gen_html.py", "fetch_data.py".
        script_content: The full Python source for the script.
        test_content: Optional test file source. Saved as test_{script_name}.
        dependencies: Optional list of pip package names to add to requirements.txt.
    """
    # Write script
    script_path = os.path.join(agent_root, "agent", "scripts", "src", script_name)
    _write(script_path, script_content)

    # Write tests if provided
    if test_content is not None:
        base = script_name.removesuffix(".py")
        test_name = f"test_{base}.py"
        test_path = os.path.join(agent_root, "agent", "scripts", "tests", test_name)
        _write(test_path, test_content)

    # Append dependencies (deduplicated)
    if dependencies:
        req_path = os.path.join(agent_root, "agent", "scripts", "requirements.txt")
        os.makedirs(os.path.dirname(req_path), exist_ok=True)
        existing = ""
        if os.path.isfile(req_path):
            with open(req_path) as f:
                existing = f.read()
        existing_set = {line.strip().lower() for line in existing.splitlines() if line.strip()}
        new_deps = [d for d in dependencies if d.strip().lower() not in existing_set]
        if new_deps:
            with open(req_path, "a") as f:
                for dep in new_deps:
                    f.write(f"{dep}\n")


# --- Venv and dependency management ---


def create_venv(agent_root: str) -> None:
    """Create a Python venv at agent/scripts/.venv and install requirements.

    Args:
        agent_root: Path to the agent's root directory.
    """
    scripts_dir = os.path.join(agent_root, "agent", "scripts")
    venv_dir = os.path.join(scripts_dir, ".venv")
    subprocess.run(
        ["python3", "-m", "venv", venv_dir],
        check=True,
        capture_output=True,
    )
    install_dependencies(agent_root)


def install_dependencies(agent_root: str) -> None:
    """Install dependencies from requirements.txt into the agent's venv.

    Call this after create_venv() for initial setup, or after add_script()
    adds new dependencies.

    Args:
        agent_root: Path to the agent's root directory.
    """
    scripts_dir = os.path.join(agent_root, "agent", "scripts")
    req_path = os.path.join(scripts_dir, "requirements.txt")
    pip_path = os.path.join(scripts_dir, ".venv", "bin", "pip")

    if not os.path.isfile(req_path):
        return
    # Skip if requirements.txt is empty
    with open(req_path) as f:
        content = f.read().strip()
    if not content:
        return

    subprocess.run(
        [pip_path, "install", "-r", req_path, "-q"],
        check=True,
        capture_output=True,
    )


# --- Computer use ---


def _create_computer_use_config(root: str) -> None:
    """Create computer_use/config.yaml."""
    content = (
        "# Computer Use Configuration\n"
        "platform: auto  # auto-detect: wsl2, linux, macos, windows\n"
        "provider: anthropic\n"
        "screenshot:\n"
        "  method: auto\n"
        "  max_dimension: 1280\n"
        "actions:\n"
        "  click_delay_ms: 100\n"
        "  type_delay_ms: 50\n"
    )
    _write(os.path.join(root, "computer_use", "config.yaml"), content)


def _create_computer_use_commands(root: str) -> None:
    """Create execute/pause/resume commands for computer use workflows."""
    cmd_dir = os.path.join(root, ".claude", "commands")

    _write(
        os.path.join(cmd_dir, "execute-workflow.md"),
        "---\n"
        "description: Execute this workflow autonomously via computer use.\n"
        "---\n"
        "\n"
        "Read `agentic.md` to understand the full workflow.\n"
        "\n"
        "Execute the workflow using computer use tools (screenshot, click, type_text, "
        "key_press) to interact with the desktop. Open applications, navigate visually, "
        "and complete each step by interacting with the screen.\n",
    )

    _write(
        os.path.join(cmd_dir, "pause-execution.md"),
        "---\n"
        "description: Pause the current computer use execution.\n"
        "---\n"
        "\n"
        "Save the current execution state (which step, what has been completed) "
        "and pause. Do not close any open applications.\n",
    )

    _write(
        os.path.join(cmd_dir, "resume-execution.md"),
        "---\n"
        "description: Resume a paused computer use execution.\n"
        "---\n"
        "\n"
        "Read `agentic.md` and check execution state. Resume from where the "
        "workflow was paused. Take a screenshot first to assess current state.\n",
    )


# --- Utilities ---


def _read_template(filename: str) -> str:
    """Read a template file from the scaffold directory."""
    path = _TEMPLATES_DIR / filename
    return path.read_text()


def _write(path: str, content: str) -> None:
    """Write content to a file, creating parent dirs if needed."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


def _strip_html_comments(text: str) -> str:
    """Remove <!-- ... --> comments from generated files."""
    import re
    return re.sub(r"<!--.*?-->", "", text, flags=re.DOTALL).strip() + "\n"
