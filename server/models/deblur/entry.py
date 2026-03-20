import argparse
from pathlib import Path
from runpy import run_path

import cv2
import numpy as np
import torch
import torch.nn.functional as F
from skimage import img_as_ubyte


REPO_ROOT = Path(__file__).resolve().parents[3]
RESTORMER_ARCH_PATH = REPO_ROOT / "temp-restormer" / "basicsr" / "models" / "archs" / "restormer_arch.py"
WEIGHT_CANDIDATES = (
    Path(__file__).resolve().with_name("motion_deblurring.pth"),
    Path(__file__).resolve().with_name("single_image_defocus_deblurring.pth"),
)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Restormer 디블러 엔트리 포인트")
    parser.add_argument("--input", required=True, help="원본 이미지 경로")
    parser.add_argument("--output", required=True, help="결과 이미지 경로")
    return parser.parse_args()


def resolve_weight_path() -> Path:
    for candidate in WEIGHT_CANDIDATES:
        if candidate.exists():
            return candidate
    raise FileNotFoundError("Restormer 가중치 파일이 없습니다.")


def load_model(device: torch.device) -> torch.nn.Module:
    if not RESTORMER_ARCH_PATH.exists():
        raise FileNotFoundError(f"Restormer 소스가 없습니다: {RESTORMER_ARCH_PATH}")

    arch = run_path(str(RESTORMER_ARCH_PATH))
    restormer_class = arch["Restormer"]
    model = restormer_class(
        inp_channels=3,
        out_channels=3,
        dim=48,
        num_blocks=[4, 6, 6, 8],
        num_refinement_blocks=4,
        heads=[1, 2, 4, 8],
        ffn_expansion_factor=2.66,
        bias=False,
        LayerNorm_type="WithBias",
        dual_pixel_task=False,
    )

    checkpoint = torch.load(resolve_weight_path(), map_location="cpu", weights_only=False)
    model.load_state_dict(checkpoint["params"])
    model.to(device)
    model.eval()
    return model


def load_image(input_path: Path) -> tuple[np.ndarray, torch.Tensor, tuple[int, int]]:
    image = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"입력 이미지를 읽을 수 없습니다: {input_path}")

    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    tensor = torch.from_numpy(image).float().div(255.0).permute(2, 0, 1).unsqueeze(0)

    height, width = tensor.shape[2], tensor.shape[3]
    padded_height = ((height + 8) // 8) * 8
    padded_width = ((width + 8) // 8) * 8
    pad_h = padded_height - height if height % 8 != 0 else 0
    pad_w = padded_width - width if width % 8 != 0 else 0
    tensor = F.pad(tensor, (0, pad_w, 0, pad_h), "reflect")
    return image, tensor, (height, width)


def save_image(restored: torch.Tensor, size: tuple[int, int], output_path: Path) -> None:
    height, width = size
    restored = restored[:, :, :height, :width]
    restored = restored.permute(0, 2, 3, 1).cpu().detach().numpy()
    restored = img_as_ubyte(restored[0])
    restored = cv2.cvtColor(restored, cv2.COLOR_RGB2BGR)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), restored):
        raise RuntimeError(f"결과 이미지를 저장하지 못했습니다: {output_path}")


def deblur_image(input_path: Path, output_path: Path) -> None:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model = load_model(device)
    _, tensor, original_size = load_image(input_path)
    tensor = tensor.to(device)

    with torch.no_grad():
        restored = model(tensor).clamp(0, 1)

    save_image(restored, original_size, output_path)


def main() -> None:
    args = parse_args()
    deblur_image(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()
