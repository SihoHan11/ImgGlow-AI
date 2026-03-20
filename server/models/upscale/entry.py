import argparse
import gc
import sys
import types
from pathlib import Path

import cv2
import numpy as np
import openvino as ov
import torch
import torchvision.transforms.functional as TF


MODEL_PATH = Path(__file__).resolve().with_name("RealESRGAN_x4plus.pth")
IR_MODEL_PATH = Path(__file__).resolve().with_name("RealESRGAN_x4plus.xml")
IR_WEIGHT_PATH = Path(__file__).resolve().with_name("RealESRGAN_x4plus.bin")
_COMPILED_MODEL = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Real-ESRGAN 업스케일 엔트리 포인트")
    parser.add_argument("--input", required=True, help="원본 이미지 경로")
    parser.add_argument("--output", required=True, help="결과 이미지 경로")
    return parser.parse_args()


def install_torchvision_compat() -> None:
    compat_module = types.ModuleType("torchvision.transforms.functional_tensor")
    compat_module.rgb_to_grayscale = TF.rgb_to_grayscale
    sys.modules["torchvision.transforms.functional_tensor"] = compat_module


def load_upsampler():
    install_torchvision_compat()

    from basicsr.archs.rrdbnet_arch import RRDBNet
    from realesrgan import RealESRGANer

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
    return RealESRGANer(
        scale=4,
        model_path=str(MODEL_PATH),
        model=model,
        tile=0,
        tile_pad=10,
        pre_pad=0,
        half=torch.cuda.is_available(),
    )


def build_model():
    install_torchvision_compat()

    from basicsr.archs.rrdbnet_arch import RRDBNet

    model = RRDBNet(num_in_ch=3, num_out_ch=3, num_feat=64, num_block=23, num_grow_ch=32, scale=4)
    state_dict = torch.load(MODEL_PATH, map_location="cpu", weights_only=False)
    model.load_state_dict(state_dict["params_ema"])
    model.eval()
    return model


def export_openvino_model() -> Path:
    if IR_MODEL_PATH.exists() and IR_WEIGHT_PATH.exists():
        return IR_MODEL_PATH

    model = build_model()
    ov_model = ov.convert_model(model, example_input=torch.randn(1, 3, 64, 64))
    ov.save_model(ov_model, IR_MODEL_PATH)
    return IR_MODEL_PATH


def load_openvino_model():
    global _COMPILED_MODEL
    if _COMPILED_MODEL is not None:
        return _COMPILED_MODEL

    ir_model_path = export_openvino_model()
    core = ov.Core()
    available_devices = set(core.available_devices)
    device_name = "GPU" if "GPU" in available_devices else "CPU"
    _COMPILED_MODEL = core.compile_model(ir_model_path, device_name)
    return _COMPILED_MODEL


def clear_cache() -> None:
    global _COMPILED_MODEL
    _COMPILED_MODEL = None
    gc.collect()


def upscale_with_openvino(input_path: Path, output_path: Path) -> None:
    image = cv2.imread(str(input_path), cv2.IMREAD_COLOR)
    if image is None:
        raise FileNotFoundError(f"입력 이미지를 읽을 수 없습니다: {input_path}")

    rgb_image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB).astype("float32") / 255.0
    input_tensor = np.transpose(rgb_image, (2, 0, 1))[None, ...]

    compiled_model = load_openvino_model()
    output_tensor = compiled_model([input_tensor])[0]
    output_tensor = np.clip(output_tensor[0], 0.0, 1.0)
    output_image = (np.transpose(output_tensor, (1, 2, 0)) * 255.0).round().astype("uint8")
    output_image = cv2.cvtColor(output_image, cv2.COLOR_RGB2BGR)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), output_image):
        raise RuntimeError(f"결과 이미지를 저장하지 못했습니다: {output_path}")


def upscale_image(input_path: Path, output_path: Path) -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Real-ESRGAN 가중치 파일이 없습니다: {MODEL_PATH}")

    upscale_with_openvino(input_path, output_path)


def main() -> None:
    args = parse_args()
    upscale_image(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()
