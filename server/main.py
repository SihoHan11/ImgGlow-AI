from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

from fastapi import FastAPI, File, Form, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from server.config import (
    ORIGINALS_DIR,
    RESULTS_DIR,
    STORAGE_DIR,
    ensure_directories,
)
from server.schemas import DeleteResponse, HistoryItemResponse, HistoryListResponse
from server.services.history_store import (
    delete_history_item,
    get_history_item,
    read_history,
    upsert_history_item,
)
from server.services.model_runner import delete_file_if_exists, run_model

ensure_directories()

app = FastAPI(title="ImgGlow AI API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/files", StaticFiles(directory=STORAGE_DIR), name="files")


def make_file_url(request: Request, file_path: str | None) -> str | None:
    if not file_path:
        return None

    relative_path = Path(file_path).relative_to(STORAGE_DIR).as_posix()
    return str(request.base_url).rstrip("/") + f"/files/{relative_path}"


def serialize_history_item(request: Request, item: dict) -> dict:
    return {
        "id": item["id"],
        "type": item["type"],
        "status": item["status"],
        "originalImageUrl": make_file_url(request, item.get("originalImagePath")),
        "resultImageUrl": make_file_url(request, item.get("resultImagePath")),
        "originalSize": item.get("originalSize"),
        "resultSize": item.get("resultSize"),
        "errorMessage": item.get("errorMessage"),
        "createdAt": item["createdAt"],
    }


def build_history_record(job_id: str, mode: str, original_image_path: Path, original_size: int) -> dict:
    return {
        "id": job_id,
        "type": mode,
        "status": "processing",
        "originalImagePath": str(original_image_path),
        "resultImagePath": None,
        "originalSize": original_size,
        "resultSize": None,
        "errorMessage": None,
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }


@app.get("/history", response_model=HistoryListResponse)
def get_history(request: Request):
    items = [serialize_history_item(request, item) for item in read_history()]
    return {"items": items}


@app.get("/history/{item_id}", response_model=HistoryItemResponse)
def get_history_detail(item_id: str, request: Request):
    item = get_history_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="작업 기록을 찾을 수 없습니다.")
    return serialize_history_item(request, item)


@app.delete("/history/{item_id}", response_model=DeleteResponse)
def delete_history(item_id: str):
    item = delete_history_item(item_id)
    if item is None:
        raise HTTPException(status_code=404, detail="삭제할 작업 기록이 없습니다.")

    delete_file_if_exists(Path(item["originalImagePath"]) if item.get("originalImagePath") else None)
    delete_file_if_exists(Path(item["resultImagePath"]) if item.get("resultImagePath") else None)
    return {"deleted": True}


@app.post("/process", response_model=HistoryItemResponse)
async def process_image(
    request: Request,
    mode: str = Form(...),
    image: UploadFile = File(...),
):
    if mode not in {"upscale", "deblur", "remove-bg"}:
        raise HTTPException(status_code=400, detail="지원하지 않는 mode입니다.")

    if not image.filename:
        raise HTTPException(status_code=400, detail="업로드된 파일 이름이 없습니다.")

    extension = Path(image.filename).suffix or ".jpg"
    job_id = str(uuid4())
    original_path = ORIGINALS_DIR / f"{job_id}{extension}"
    result_path = RESULTS_DIR / f"{job_id}{extension}"

    file_bytes = await image.read()
    original_path.write_bytes(file_bytes)

    history_record = build_history_record(
        job_id=job_id,
        mode=mode,
        original_image_path=original_path,
        original_size=original_path.stat().st_size,
    )
    upsert_history_item(history_record)

    try:
        output_path = run_model(mode=mode, input_path=original_path, output_path=result_path)
        history_record["status"] = "completed"
        history_record["resultImagePath"] = str(output_path)
        history_record["resultSize"] = output_path.stat().st_size
    except Exception as error:
        history_record["status"] = "failed"
        history_record["errorMessage"] = str(error)
        upsert_history_item(history_record)
        raise HTTPException(
            status_code=500,
            detail={
                "message": str(error),
                "id": history_record["id"],
                "status": history_record["status"],
            },
        ) from error

    upsert_history_item(history_record)
    return serialize_history_item(request, history_record)
