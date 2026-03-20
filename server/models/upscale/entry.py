import argparse
import sys
import types
from pathlib import Path

import cv2
import torch
import torchvision.transforms.functional as TF


MODEL_PATH = Path(__file__).resolve().with_name("RealESRGAN_x4plus.pth")


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


def upscale_image(input_path: Path, output_path: Path) -> None:
    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Real-ESRGAN 가중치 파일이 없습니다: {MODEL_PATH}")

    image = cv2.imread(str(input_path), cv2.IMREAD_UNCHANGED)
    if image is None:
        raise FileNotFoundError(f"입력 이미지를 읽을 수 없습니다: {input_path}")

    upsampler = load_upsampler()
    output, _ = upsampler.enhance(image, outscale=4)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if not cv2.imwrite(str(output_path), output):
        raise RuntimeError(f"결과 이미지를 저장하지 못했습니다: {output_path}")


def main() -> None:
    args = parse_args()
    upscale_image(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()
