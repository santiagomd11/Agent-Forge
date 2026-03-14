---
description: Generate README.md, CLAUDE.md, project skeleton, scripts, and venv for the new workflow (Step 6).
argument-hint: [workflow-name]
---

Read `forge/agentic.md` for context. Execute **Step 6: Generate Project Scaffold**.

**Step 6a -- Generate project skeleton:**

Call `generate_scaffold()` from `forge/scripts/src/scaffold.py` with a `ScaffoldConfig` built from the Step 2 architecture. This creates all directories, standard files (README.md, CLAUDE.md, commands, prompts), export scripts, and a Python venv.

**Step 6b -- Generate workflow-specific scripts:**

If scripts were identified in Step 2:
- For **format scripts** (document/file generation): read `forge/Prompts/06_Format_Script_Generator.md` and follow it.
- For **general scripts** (API clients, validators, scrapers, etc.): read `forge/Prompts/07_Script_Generator.md` and follow it.
- Place each script via `add_script()` from `forge/scripts/src/scaffold.py`.
- After placing all scripts, call `install_dependencies()` to install new deps into the venv.

**Step 6c -- Present and approve:**

Present the complete file listing and wait for approval.
