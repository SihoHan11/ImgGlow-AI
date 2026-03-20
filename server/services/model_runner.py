import subprocess
import sys
from pathlib import Path

from server.config import MODE_DIRECTORY_MAP

ENTRYPOINT_CANDIDATES = ("entry.py", "infer.py", "run.py", "main.py")


def resolve_model_directory(mode: str) -> Path:
    model_directory = MODE_DIRECTORY_MAP.get(mode)
    if model_directory is None:
        raise ValueError(f"지원하지 않는 mode입니다: {mode}")
    return model_directory


def run_model(mode: str, input_path: Path, output_path: Path) -> Path:
    model_directory = resolve_model_directory(mode)
    entrypoint = next(
        (model_directory / filename for filename in ENTRYPOINT_CANDIDATES if (model_directory / filename).exists()),
        None,
    )

    if entrypoint is None:
        raise FileNotFoundError(
            f"{model_directory} 안에 entry.py, infer.py, run.py, main.py 중 하나가 필요합니다."
        )

    command = [
        sys.executable,
        str(entrypoint),
        "--input",
        str(input_path),
        "--output",
        str(output_path),
    ]

    result = subprocess.run(
        command,
        cwd=model_directory,
        capture_output=True,
        text=True,
        check=False,
    )

    if result.returncode != 0:
        stderr = result.stderr.strip() or result.stdout.strip() or "모델 실행에 실패했습니다."
        raise RuntimeError(stderr)

    if not output_path.exists():
        raise FileNotFoundError(f"모델 실행은 완료되었지만 결과 파일이 생성되지 않았습니다: {output_path}")

    return output_path


def delete_file_if_exists(file_path: Path | None) -> None:
    if file_path and file_path.exists():
        file_path.unlink()
