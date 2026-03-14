# Scripts

Scripts that support the Agent Forge workflow.

## Structure

- `src/` - Source scripts
- `tests/` - Test scripts

## Setup

Create and activate a Python virtual environment before running any scripts:

```bash
python3 -m venv forge/scripts/.venv
source forge/scripts/.venv/bin/activate
pip install -r forge/scripts/requirements.txt
```

Run this from the project root (`Agent-Forge/`). The venv lives inside `forge/scripts/.venv` to keep it co-located.

## Usage

All scripts in `src/` should be run from the project root with `PYTHONPATH=.`:

```bash
PYTHONPATH=. forge/scripts/.venv/bin/python forge/scripts/src/scaffold.py
```

## Testing

Create the venv and install test dependencies:

```bash
python3 -m venv forge/scripts/.venv
forge/scripts/.venv/bin/pip install pytest pyyaml
```

Run tests from the project root:

```bash
PYTHONPATH=. forge/scripts/.venv/bin/python -m pytest forge/scripts/tests/ -v
```
