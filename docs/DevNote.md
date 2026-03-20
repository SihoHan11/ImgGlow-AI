# ImgGlow AI 개발 노트

## 목표
- 모바일 앱에서 이미지를 선택하고 서버로 전송해 실제 모델 파이프라인 결과를 받는 데모를 완성한다.
- mock 응답은 사용하지 않고, 서버가 `server/models/` 하위 폴더의 실제 모델 엔트리 포인트를 실행하도록 구성한다.
- 모델 파일과 가중치는 별도로 확보되어 있다고 가정하고, 이번 작업에서는 저장소에 수용 가능한 폴더 구조와 호출 지점을 만든다.

## 구현 범위
- Expo 기반 모바일 앱 3개 화면 구성
- `Home`: 이미지 선택, 기능 선택, 처리 실행
- `Result`: 원본/결과 확인, 저장
- `History`: 작업 기록 조회, 재열람, 삭제
- FastAPI 서버 추가
- `POST /process`
- `GET /history`
- `GET /history/{id}`
- `DELETE /history/{id}`

## 서버 구조
- `server/models/upscale/`
- `server/models/deblur/`
- `server/models/remove_bg/`
- `server/storage/originals/`
- `server/storage/results/`
- `server/data/history.json`

## 모델 연동 방식
- mode별 모델 디렉터리를 고정 경로로 사용한다.
- 서버는 각 모델 폴더 안에서 `entry.py`, `infer.py`, `run.py`, `main.py` 중 하나를 찾아 실행한다.
- 실행 인자는 공통으로 `--input <원본경로> --output <결과경로>` 형태를 사용한다.
- 모델 파일 자체는 이번 작업에서 생성하거나 수정하지 않는다.

## 데이터 구조
- `id`
- `type`
- `status`
- `originalImagePath`
- `resultImagePath`
- `originalSize`
- `resultSize`
- `errorMessage`
- `createdAt`

## 상태값
- `processing`
- `completed`
- `failed`

## 모바일 메모
- API 주소는 `src/constants/api.js`에서 관리한다.
- 실기기 또는 Android 에뮬레이터에서는 서버 주소를 환경에 맞게 수정해야 한다.
- 결과 저장은 Expo Media Library 권한을 사용한다.

## 실행 메모
- 서버 의존성 설치: `python -m pip install -r server/requirements.txt`
- 서버 실행: `python -m uvicorn server.main:app --reload --host 0.0.0.0 --port 8000`
- 앱 실행: `npm start`
- OpenVINO IR 파일이 없으면 첫 실행 시 `pth -> xml/bin` 변환이 1회 수행된다.
- IR 생성 후에는 서버 프로세스 안에서 mode별 OpenVINO compiled model을 캐시해 재사용한다.
- 해당 mode가 20분 동안 호출되지 않으면 백그라운드 정리 스레드가 캐시를 해제해 메모리를 반환한다.

## 테스트 체크리스트
- 이미지 선택 후 3개 mode 요청 가능 여부
- mode별 모델 폴더가 올바르게 선택되는지
- 결과 파일 생성 시 결과 화면에 정상 노출되는지
- 모델 실행 실패 시 오류 메시지와 실패 기록이 남는지
- 기록 조회 및 삭제가 정상 동작하는지

## 프론트엔드 디자인 작업 메모
- `plan.md`의 화면 정의를 기준으로 Home, Result, History의 정보 구조를 먼저 검토했다.
- 기존 구조는 이미 3개 화면으로 분리되어 있어, 구조 변경 없이 스타일과 콘텐츠 위계만 보강하는 방향으로 결정했다.
- Stitch MCP를 사용해 Home, Result, History용 모바일 UI 콘셉트를 생성했다.
- 색상은 지정 팔레트 `#73020C`, `#BF0436`, `#D9A0AF`, `#D9CEC5` 중에서 `#BF0436`을 메인 포인트로 선택했다.
- Stitch 결과를 바탕으로 다크 에디토리얼 스타일의 공통 디자인 방향을 정리했다.
- 공통 테마 토큰은 `src/constants/theme.js`에 추가했다.
- 적용 범위는 `App.js`, `src/components/ImageCard.js`, `src/components/ModeSelector.js`, `src/components/PrimaryButton.js`, `src/screens/HomeScreen.js`, `src/screens/ResultScreen.js`, `src/screens/HistoryScreen.js`로 제한했다.
- Home 화면은 서비스 소개와 작업 흐름을 더 명확히 보이도록 보강했다.
- Result 화면은 처리 상태 카드와 액션 우선순위가 드러나도록 정리했다.
- History 화면은 상태 배지와 상단 설명 영역을 추가해 기록성 화면으로 보이도록 정리했다.
- 디자인 컨셉 문서는 `Design.md`에 정리했다.
- Stitch 기반 상세 기준은 `.stitch/DESIGN.md`에 유지했다.
- 후속 UI 조정에서는 상단 컨테이너가 과하게 커 보인다는 피드백에 맞춰 Home, Result, History의 상단 영역을 다시 축소했다.
- `Result`, `History`의 기본 네이티브 헤더를 숨기고, 화면 내부에 더 얇은 커스텀 상단 바를 배치했다.
- 뒤로가기 버튼이 사라지지 않도록 `Result`, `History` 상단 바에 `goBack()` 기반 뒤로 동작을 다시 넣었다.
- 상단 액션은 텍스트처럼 보이지 않도록 작은 pill 버튼 형태로 다시 정리했다.
- Home 화면은 브랜드 마크와 타이틀 크기, 상단 패딩을 더 줄여 첫 화면에서 인터페이스가 차지하는 비중을 낮췄다.
- `ModeSelector`는 선택 카드와 보조 카드의 높이 및 패딩을 줄여 스크롤 부담을 낮추는 방향으로 조정했다.
- `ImageCard`는 카드 내부에 한 겹 더 들어간 패널과 상하 음영 레이어를 넣어 내부 그림자에 가까운 눌림 느낌을 주도록 수정했다.
- 공통 그림자는 더 짧고 진하게 바꾸고, 어두운 배경에서 경계가 묻히지 않도록 얇은 보더를 함께 사용했다.
- `Result` 화면은 상단 요약 카드와 하단 액션 버튼을 더 촘촘하게 압축했고, `History` 화면도 헤더/카드/버튼 높이를 함께 줄였다.

## 검증 메모
- PowerShell 실행 정책으로 `npx.ps1` 직접 실행은 실패했다.
- `cmd /c npx expo export --platform android --output-dir temp-export-check`로 우회해 번들 검증을 진행했다.
- Expo Android export가 정상 완료되어 현재 JS 번들 기준으로 화면 연결과 구문 오류는 없는 상태다.
- `RealESRGAN`, `Restormer`, `BiRefNet`는 OpenVINO IR로 변환해 Intel iGPU 경로에서 추론 가능함을 확인했다.
- 서버는 더 이상 `subprocess.run`으로 매 요청마다 새 파이썬 프로세스를 띄우지 않고, 같은 프로세스에서 엔트리 모듈과 compiled model을 재사용한다.
- 동일 서버 프로세스에서 같은 mode의 2회차 요청은 1회차보다 크게 빨라지는 것을 확인했다.

## 남은 과정
- 실기기 또는 Android 에뮬레이터에서는 `127.0.0.1` 대신 현재 개발 PC의 실제 IP를 `API_BASE_URL`에 넣어야 한다.
- 앱 실행 후 이미지 선택, 3개 mode 요청, 결과 저장, 기록 조회/삭제까지 순서대로 재점검한다.
- 서버 재시작 직후 1회차 요청과 같은 mode 2회차 요청의 체감 속도 차이를 확인한다.
- 모델 실행 실패 시 서버 응답 메시지와 `server/data/history.json`의 `failed` 기록이 남는지 확인한다.
