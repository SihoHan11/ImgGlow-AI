from pydantic import BaseModel


class HistoryItemResponse(BaseModel):
    id: str
    type: str
    status: str
    originalImageUrl: str | None = None
    resultImageUrl: str | None = None
    originalSize: int | None = None
    resultSize: int | None = None
    errorMessage: str | None = None
    createdAt: str


class HistoryListResponse(BaseModel):
    items: list[HistoryItemResponse]


class DeleteResponse(BaseModel):
    deleted: bool
