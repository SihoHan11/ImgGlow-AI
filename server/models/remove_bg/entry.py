import argparse
import sys
import types
from contextlib import nullcontext
from pathlib import Path

import numpy as np
import torch
from PIL import Image
from torchvision import transforms


REPO_ROOT = Path(__file__).resolve().parents[3]
BIREFNET_ROOT = REPO_ROOT / "temp-birefnet"
WEIGHT_PATH = Path(__file__).resolve().with_name("BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth")


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
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model, refine_foreground = load_model(device)
    transform_image = build_transform()

    image = Image.open(input_path).convert("RGB")
    input_tensor = transform_image(image).unsqueeze(0).to(device)

    autocast_ctx = torch.amp.autocast(device_type="cuda", dtype=torch.float16) if device.type == "cuda" else nullcontext()
    with autocast_ctx, torch.no_grad():
        prediction = model(input_tensor)[-1].sigmoid().to(torch.float32).cpu()

    mask = prediction[0].squeeze()
    mask_image = transforms.ToPILImage()(mask).resize(image.size)

    refined_foreground = refine_foreground(image, mask_image, device=device.type)
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
