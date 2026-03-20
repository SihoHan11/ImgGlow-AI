# Third-Party Model License Notice

이 프로젝트는 외부 오픈소스 모델 및 관련 코드를 기반으로 동작합니다.
아래 내용은 현재 저장소에서 확인된 모델 연결 정보와 공식 저장소 공개 자료를 기준으로 정리한 것입니다.

## 포함 또는 연동되는 모델

### 1. Real-ESRGAN / RealESRGAN_x4plus

- 용도: 업스케일
- 프로젝트: Real-ESRGAN
- 저장소: https://github.com/xinntao/Real-ESRGAN
- 가중치명: `RealESRGAN_x4plus.pth`
- 적용 위치:
  - `server/models/upscale/entry.py`
  - `server/models/upscale/RealESRGAN_x4plus.pth`
- 라이선스: BSD 3-Clause License

### 2. Restormer

- 용도: 디블러
- 프로젝트: Restormer
- 저장소: https://github.com/swz30/Restormer
- 가중치 후보:
  - `motion_deblurring.pth`
  - `single_image_defocus_deblurring.pth`
- 적용 위치:
  - `server/models/deblur/entry.py`
  - `server/models/deblur/core/restormer_arch.py`
- 라이선스: MIT License

### 3. BiRefNet / BiRefNet-general-bb_swin_v1_tiny-epoch_232

- 용도: 배경 제거
- 프로젝트: BiRefNet
- 저장소: https://github.com/ZhengPeng7/BiRefNet
- 가중치명: `BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth`
- 적용 위치:
  - `server/models/remove_bg/entry.py`
  - `server/models/remove_bg/core/`
- 라이선스: MIT License

## 주의 사항

- 각 모델의 상세 사용 조건, 가중치 배포 조건, 상표 또는 논문 인용 요구사항은 공식 저장소와 릴리스 페이지를 함께 확인해야 합니다.
- 현재 문서는 저장소에 포함되었거나 코드에서 직접 참조하는 모델 기준으로만 정리했습니다.
- 가중치 파일별 별도 추가 라이선스가 명시되지 않은 경우, 공식 저장소에 공개된 라이선스를 기준으로 정리했습니다.

## 공식 출처

- Real-ESRGAN: https://github.com/xinntao/Real-ESRGAN
- RealESRGAN_x4plus 릴리스: https://github.com/xinntao/Real-ESRGAN/releases
- Restormer: https://github.com/swz30/Restormer
- BiRefNet: https://github.com/ZhengPeng7/BiRefNet
- BiRefNet 릴리스: https://github.com/ZhengPeng7/BiRefNet/releases
