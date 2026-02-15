# Scripts

Scripts that support the data analysis workflow.

## Structure

- `src/` - Source scripts
- `tests/` - Test scripts
- `profile_data.py` - Data profiling utility
- `generate_report.py` - Report generation utility

## Setup

Create and activate a Python virtual environment before running any scripts:

```bash
python3 -m venv scripts/.venv
source scripts/.venv/bin/activate
pip install -r scripts/requirements.txt
```

Run this from the project root (`data-analysis/`). The venv lives inside `scripts/.venv` to keep it co-located.

## Usage

All scripts in `src/` and the top-level utility scripts should be run with the venv active:

```bash
source scripts/.venv/bin/activate
python scripts/profile_data.py
python scripts/generate_report.py
python scripts/src/your_script.py
```

## Tests

```bash
source scripts/.venv/bin/activate
python -m pytest tests/
```
