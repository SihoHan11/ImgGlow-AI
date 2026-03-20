import torch.nn as nn
from models.backbones.swin_v1 import swin_v1_t

def build_backbone(bb_name, pretrained=True, params_settings=''):
    if bb_name != 'swin_v1_t':
        raise ValueError(f'지원하지 않는 backbone입니다: {bb_name}')
    return swin_v1_t()
