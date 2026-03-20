# ImgGlow-AI

ImgGlow-AI는 Expo 기반 React Native 앱과 FastAPI 서버를 결합해 모바일에서 AI 이미지 보정을 실행하는 데모 프로젝트입니다.

지원 기능:
- 업스케일
- 디블러
- 배경 제거

사용 모델:
- 업스케일: RealESRGAN_x4plus
- 디블러: Restormer
- 배경 제거: BiRefNet-general-bb_swin_v1_tiny-epoch_232

## 프로젝트 구성

- `App.js`
  - 앱 진입점 및 화면 네비게이션
- `src/screens/`
  - `HomeScreen.js`: 이미지 선택, 기능 선택, 처리 실행
  - `ResultScreen.js`: 처리 결과 확인, 저장
  - `HistoryScreen.js`: 작업 기록 조회, 재열람, 삭제
- `src/api/client.js`
  - 모바일 앱 API 호출
- `src/constants/api.js`
  - 서버 주소 설정
- `server/main.py`
  - FastAPI 엔트리 포인트
- `server/models/`
  - 기능별 모델 엔트리 포인트 및 가중치 위치
- `server/storage/`
  - 원본/결과 이미지 저장소
- `server/data/history.json`
  - 작업 기록 저장 파일

## 주요 흐름

1. 모바일 앱에서 이미지를 선택합니다.
2. 보정 기능을 선택합니다.
3. 앱이 서버의 `/process` API로 이미지를 업로드합니다.
4. 서버가 선택된 모델을 실행해 결과 이미지를 생성합니다.
5. 결과는 Result 화면과 History 화면에서 다시 확인할 수 있습니다.

## 모델 매핑

- `upscale`
  - 모델: `RealESRGAN_x4plus`
  - 엔트리: `server/models/upscale/entry.py`
  - 가중치: `server/models/upscale/RealESRGAN_x4plus.pth`
- `deblur`
  - 모델: `Restormer`
  - 엔트리: `server/models/deblur/entry.py`
  - 가중치 우선순위:
    - `server/models/deblur/motion_deblurring.pth`
    - `server/models/deblur/single_image_defocus_deblurring.pth`
- `remove-bg`
  - 모델: `BiRefNet-general-bb_swin_v1_tiny-epoch_232`
  - 엔트리: `server/models/remove_bg/entry.py`
  - 가중치: `server/models/remove_bg/BiRefNet-general-bb_swin_v1_tiny-epoch_232.pth`

## 지원 API

- `POST /process`
- `GET /history`
- `GET /history/{id}`
- `DELETE /history/{id}`

## 실행 방법

### 1. 앱 의존성 설치

```bash
npm install
```

### 2. 서버 의존성 설치

```bash
python -m pip install -r server/requirements.txt
```

### 3. 서버 실행

```bash
npm run server
```

### 4. 앱에서 서버 주소 확인

`src/constants/api.js`의 `API_BASE_URL`을 현재 서버 주소에 맞게 설정해야 합니다.

예시:

```js
export const API_BASE_URL = "http://127.0.0.1:8000";
```

실기기 또는 Android 에뮬레이터에서는 `127.0.0.1` 대신 개발 PC의 실제 IP를 사용해야 합니다.

### 5. 앱 실행

```bash
npm start
```

필요에 따라 아래 명령도 사용할 수 있습니다.

```bash
npm run android
npm run ios
npm run web
```

## 서버 동작 메모

- 서버는 mode에 따라 각 모델 디렉터리의 엔트리 파일을 찾아 실행합니다.
- 엔트리 파일 후보는 `entry.py`, `infer.py`, `run.py`, `main.py`입니다.
- OpenVINO IR 파일이 없으면 첫 실행 시 `pth -> xml/bin` 변환이 1회 수행될 수 있습니다.
- 같은 서버 프로세스 안에서 로드된 모델 모듈은 재사용됩니다.
- 20분 동안 사용되지 않은 모듈은 백그라운드 정리 스레드가 해제합니다.

## 라이선스

외부 모델 및 관련 라이선스 정보는 `LICENSE.md`에 정리합니다.

## 문서

- `docs/plan.md`
- `docs/Design.md`
- `docs/DevNote.md`
