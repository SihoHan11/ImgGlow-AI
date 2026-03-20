import argparse
import gc
import sys
import types
from contextlib import nullcontext
from pathlib import Path

import numpy as np
import openvino as ov
import torch
from PIL import Image
from torchvision import transforms


REPO_ROOT = Path(__file__).resolve().parents[3]
BIREFNET_ROOT = Path(__file__).resolve().with_name("core")
WEIGHT_PATH = Path(__file__).resolve().with_name("BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth")
IR_MODEL_PATH = Path(__file__).resolve().with_name("BiRefNet-general-bb_swin_v1_tiny-epoch_232.xml")
IR_WEIGHT_PATH = Path(__file__).resolve().with_name("BiRefNet-general-bb_swin_v1_tiny-epoch_232.bin")
_COMPILED_MODEL = None
_REFINE_FOREGROUND = None


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="BiRefNet 배경 제거 엔트리 포인트")
    parser.add_argument("--input", required=True, help="원본 이미지 경로")
    parser.add_argument("--output", required=True, help="결과 이미지 경로")
    return parser.parse_args()


def patch_birefnet_config() -> None:
    if str(BIREFNET_ROOT) not in sys.path:
        sys.path.insert(0, str(BIREFNET_ROOT))

    dataset_module = types.ModuleType("dataset")
    dataset_module.class_labels_TR_sorted = []
    sys.modules["dataset"] = dataset_module

    import config as birefnet_config

    original_init = birefnet_config.Config.__init__

    def patched_init(self, *args, **kwargs):
        original_init(self, *args, **kwargs)
        self.bb = "swin_v1_t"
        self.compile = False
        self.mixed_precision = "no"
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.verbose_eval = False
        self.lateral_channels_in_collection = [768, 384, 192, 96]
        if self.mul_scl_ipt == "cat":
            self.lateral_channels_in_collection = [channel * 2 for channel in self.lateral_channels_in_collection]
        self.cxt = self.lateral_channels_in_collection[1:][::-1][-self.cxt_num:] if self.cxt_num else []

    birefnet_config.Config.__init__ = patched_init


def load_model(device: torch.device):
    if not BIREFNET_ROOT.exists():
        raise FileNotFoundError(f"BiRefNet 소스가 없습니다: {BIREFNET_ROOT}")
    if not WEIGHT_PATH.exists():
        raise FileNotFoundError(f"BiRefNet 가중치 파일이 없습니다: {WEIGHT_PATH}")

    patch_birefnet_config()

    from image_proc import refine_foreground
    from models.birefnet import BiRefNet
    from utils import check_state_dict

    model = BiRefNet(bb_pretrained=False)
    state_dict = torch.load(WEIGHT_PATH, map_location="cpu", weights_only=True)
    model.load_state_dict(check_state_dict(state_dict))
    model.to(device)
    model.eval()
    return model, refine_foreground


def load_refine_foreground():
    global _REFINE_FOREGROUND
    if _REFINE_FOREGROUND is not None:
        return _REFINE_FOREGROUND

    patch_birefnet_config()
    from image_proc import refine_foreground
    _REFINE_FOREGROUND = refine_foreground
    return _REFINE_FOREGROUND


def export_openvino_model() -> Path:
    if IR_MODEL_PATH.exists() and IR_WEIGHT_PATH.exists():
        return IR_MODEL_PATH

    model, _ = load_model(torch.device("cpu"))
    ov_model = ov.convert_model(model, example_input=torch.randn(1, 3, 1024, 1024))
    ov_model.reshape({ov_model.input(0): [1, 3, 1024, 1024]})
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
    global _COMPILED_MODEL, _REFINE_FOREGROUND
    _COMPILED_MODEL = None
    _REFINE_FOREGROUND = None
    gc.collect()


def build_transform() -> transforms.Compose:
    return transforms.Compose(
        [
            transforms.Resize((1024, 1024)),
            transforms.ToTensor(),
            transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
        ]
    )


def save_result(image: Image.Image, alpha_mask: Image.Image, output_path: Path) -> None:
    output_path.parent.mkdir(parents=True, exist_ok=True)

    rgba_image = image.convert("RGBA")
    rgba_image.putalpha(alpha_mask)

    if output_path.suffix.lower() == ".png":
        rgba_image.save(output_path)
        return

    white_background = Image.new("RGBA", rgba_image.size, (255, 255, 255, 255))
    composited = Image.alpha_composite(white_background, rgba_image).convert("RGB")
    composited.save(output_path, quality=95)


def remove_background(input_path: Path, output_path: Path) -> None:
    image = Image.open(input_path).convert("RGB")
    transform_image = build_transform()

    compiled_model = load_openvino_model()
    input_tensor = transform_image(image).unsqueeze(0).numpy()
    prediction = torch.from_numpy(compiled_model([input_tensor])[0]).sigmoid().to(torch.float32)
    refine_foreground = load_refine_foreground()
    refine_device = "cpu"

    mask = prediction[0].squeeze()
    mask_image = transforms.ToPILImage()(mask).resize(image.size)

    refined_foreground = refine_foreground(image, mask_image, device=refine_device)
    refined_foreground = refined_foreground.convert("RGBA")
    refined_foreground.putalpha(mask_image)

    output_path.parent.mkdir(parents=True, exist_ok=True)
    if output_path.suffix.lower() == ".png":
        refined_foreground.save(output_path)
        return

    array_foreground = np.array(refined_foreground)[:, :, :3].astype(np.float32)
    array_mask = (np.array(refined_foreground)[:, :, 3:] / 255.0).astype(np.float32)
    white_background = np.full_like(array_foreground, 255.0)
    composited = (array_foreground * array_mask + white_background * (1 - array_mask)).astype(np.uint8)
    Image.fromarray(composited).save(output_path, quality=95)


def main() -> None:
    args = parse_args()
    remove_background(Path(args.input), Path(args.output))


if __name__ == "__main__":
    main()
