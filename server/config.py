from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
DATA_DIR = ROOT_DIR / "data"
STORAGE_DIR = ROOT_DIR / "storage"
ORIGINALS_DIR = STORAGE_DIR / "originals"
RESULTS_DIR = STORAGE_DIR / "results"
MODELS_DIR = ROOT_DIR / "models"
HISTORY_FILE = DATA_DIR / "history.json"

MODE_DIRECTORY_MAP = {
    "upscale": MODELS_DIR / "upscale",
    "deblur": MODELS_DIR / "deblur",
    "remove-bg": MODELS_DIR / "remove_bg",
}


def ensure_directories() -> None:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    ORIGINALS_DIR.mkdir(parents=True, exist_ok=True)
    RESULTS_DIR.mkdir(parents=True, exist_ok=True)

    for directory in MODE_DIRECTORY_MAP.values():
        directory.mkdir(parents=True, exist_ok=True)

    if not HISTORY_FILE.exists():
        HISTORY_FILE.write_text("[]", encoding="utf-8")
