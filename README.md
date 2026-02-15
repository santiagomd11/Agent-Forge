# Lazy-Agent

A meta-framework that uses agentic workflows to create agentic workflows.

## Quick Start

```
Read `forge/agentic.md` and start
```

That's it. Claude handles the rest.

## What This Does

Lazy-Agent interviews you about the workflow you need, designs its architecture, and generates a complete agentic workflow project — including orchestrator, specialized agents, slash commands, and templates.

The framework itself uses the same architecture it generates. It's self-similar: AI building AI workflows using the same patterns it teaches.

## Structure

- `forge/` — The core engine (orchestrator, agents, utils)
  - `forge/agentic.md` — The meta-workflow that creates workflows
  - `forge/Prompts/` — Specialized agent prompts (numbered)
  - `forge/utils/scaffold/` — Templates for generated projects
- `.claude/commands/` — Slash commands for each step
- `patterns/` — Documentation of reusable workflow patterns
- `examples/` — Example workflows showing the architecture in action
- `output/` — Where generated workflow projects land

## Commands

| Command | Step | Description |
|---------|------|-------------|
| `/create-workflow` | All | Full workflow: runs Steps 1-7 sequentially |
| `/gather-requirements` | 1 | Interview the user about their workflow needs |
| `/design-architecture` | 2 | Design the workflow structure and agents |
| `/generate-orchestrator` | 3 | Generate the agentic.md for the new workflow |
| `/generate-agents` | 4 | Generate specialized agent prompts |
| `/generate-commands` | 5 | Generate .claude/commands/ for each step |
| `/generate-scaffold` | 6 | Generate README, CLAUDE.md, and project skeleton |
| `/review-workflow` | 7 | Self-review for completeness and quality |
