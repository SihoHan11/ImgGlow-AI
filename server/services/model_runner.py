import importlib.util
import gc
from pathlib import Path
from threading import Lock, Thread
from time import monotonic, sleep

from server.config import MODE_DIRECTORY_MAP

ENTRYPOINT_CANDIDATES = ("entry.py", "infer.py", "run.py", "main.py")
ENTRY_FUNCTION_MAP = {
    "upscale": "upscale_image",
    "deblur": "deblur_image",
    "remove-bg": "remove_background",
}
IDLE_UNLOAD_SECONDS = 20 * 60
IDLE_SCAN_INTERVAL_SECONDS = 60
_ENTRY_MODULES: dict[str, object] = {}
_ENTRY_LAST_USED: dict[str, float] = {}
_ENTRY_LOCK = Lock()


def resolve_model_directory(mode: str) -> Path:
    model_directory = MODE_DIRECTORY_MAP.get(mode)
    if model_directory is None:
        raise ValueError(f"지원하지 않는 mode입니다: {mode}")
    return model_directory


def resolve_entrypoint(model_directory: Path) -> Path:
    entrypoint = next(
        (model_directory / filename for filename in ENTRYPOINT_CANDIDATES if (model_directory / filename).exists()),
        None,
    )
    if entrypoint is None:
        raise FileNotFoundError(
            f"{model_directory} 안에 entry.py, infer.py, run.py, main.py 중 하나가 필요합니다."
        )
    return entrypoint


def load_entry_module(mode: str, entrypoint: Path):
    with _ENTRY_LOCK:
        if mode in _ENTRY_MODULES:
            _ENTRY_LAST_USED[mode] = monotonic()
            return _ENTRY_MODULES[mode]

        module_name = f"server_model_{mode.replace('-', '_')}"
        spec = importlib.util.spec_from_file_location(module_name, entrypoint)
        if spec is None or spec.loader is None:
            raise ImportError(f"엔트리 모듈을 불러오지 못했습니다: {entrypoint}")

        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        _ENTRY_MODULES[mode] = module
        _ENTRY_LAST_USED[mode] = monotonic()
        return module


def unload_entry_module(mode: str) -> None:
    with _ENTRY_LOCK:
        module = _ENTRY_MODULES.pop(mode, None)
        _ENTRY_LAST_USED.pop(mode, None)

    if module is None:
        return

    clear_cache = getattr(module, "clear_cache", None)
    if callable(clear_cache):
        clear_cache()
    gc.collect()


def cleanup_stale_modules() -> None:
    now = monotonic()
    with _ENTRY_LOCK:
        stale_modes = [
            mode
            for mode, last_used_at in _ENTRY_LAST_USED.items()
            if now - last_used_at >= IDLE_UNLOAD_SECONDS
        ]

    for mode in stale_modes:
        unload_entry_module(mode)


def start_cleanup_worker() -> None:
    def worker() -> None:
        while True:
            sleep(IDLE_SCAN_INTERVAL_SECONDS)
            cleanup_stale_modules()

    cleanup_thread = Thread(target=worker, name="model-cache-cleanup", daemon=True)
    cleanup_thread.start()


def run_model(mode: str, input_path: Path, output_path: Path) -> Path:
    cleanup_stale_modules()
    model_directory = resolve_model_directory(mode)
    entrypoint = resolve_entrypoint(model_directory)
    module = load_entry_module(mode, entrypoint)
    function_name = ENTRY_FUNCTION_MAP[mode]
    entry_function = getattr(module, function_name, None)
    if entry_function is None:
        raise AttributeError(f"{entrypoint} 안에 {function_name} 함수가 없습니다.")

    entry_function(Path(input_path), Path(output_path))

    if not output_path.exists():
        raise FileNotFoundError(f"모델 실행은 완료되었지만 결과 파일이 생성되지 않았습니다: {output_path}")

    return output_path


def delete_file_if_exists(file_path: Path | None) -> None:
    if file_path and file_path.exists():
        file_path.unlink()


start_cleanup_worker()
