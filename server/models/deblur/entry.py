import argparse
import gc
from pathlib import Path
from runpy import run_path

import cv2
import numpy as np
import openvino as ov
import torch
import torch.nn.functional as F
from skimage import img_as_ubyte


REPO_ROOT = Path(__file__).resolve().parents[3]
RESTORMER_ARCH_PATH = Path(__file__).resolve().with_name("core") / "restormer_arch.py"
WEIGHT_CANDIDATES = (
    Path(__file__).resolve().with_name("motion_deblurring.pth"),
    Path(__file__).resolve().with_name("single_image_defocus_deblurring.pth"),
)
IR_MODEL_PATH = Path(__file__).resolve().with_name("motion_deblurring.xml")
IR_WEIGHT_PATH = Path(__file__).resolve().with_name("motion_deblurring.bin")
_COMPILED_MODEL = None


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


def build_model() -> torch.nn.Module:
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
    return model


def load_model(device: torch.device) -> torch.nn.Module:
    model = build_model()

    checkpoint = torch.load(resolve_weight_path(), map_location="cpu", weights_only=False)
    model.load_state_dict(checkpoint["params"])
    model.to(device)
    model.eval()
    return model


def export_openvino_model() -> Path:
    if IR_MODEL_PATH.exists() and IR_WEIGHT_PATH.exists():
        return IR_MODEL_PATH

    model = load_model(torch.device("cpu"))
    example_input = torch.randn(1, 3, 128, 128)
    ov_model = ov.convert_model(model, example_input=example_input)
    ov.save_model(ov_model, IR_MODEL_PATH)
    return IR_MODEL_PATH


def load_openvino_model():
    global _COMPILED_MODEL
    if _COMPILED_MODEL is not None:
        return _COMPILED_MODEL, "cached"

    ir_model_path = export_openvino_model()
    core = ov.Core()
    available_devices = set(core.available_devices)
    device_name = "GPU" if "GPU" in available_devices else "CPU"
    _COMPILED_MODEL = core.compile_model(ir_model_path, device_name)
    return _COMPILED_MODEL, device_name


def clear_cache() -> None:
    global _COMPILED_MODEL
    _COMPILED_MODEL = None
    gc.collect()


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


def deblur_with_openvino(input_path: Path, output_path: Path) -> None:
    compiled_model, _ = load_openvino_model()
    _, tensor, original_size = load_image(input_path)
    output_tensor = compiled_model([tensor.numpy()])[0]
    restored = torch.from_numpy(output_tensor).clamp(0, 1)
    save_image(restored, original_size, output_path)


def deblur_image(input_path: Path, output_path: Path) -> None:
    deblur_with_openvino(input_path, output_path)


def main() -> None:
    args = parse_args()
    deblur_image(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()
