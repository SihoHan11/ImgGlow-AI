import json
from pathlib import Path
from typing import Any

from server.config import HISTORY_FILE


def read_history() -> list[dict[str, Any]]:
    if not HISTORY_FILE.exists():
        return []

    content = HISTORY_FILE.read_text(encoding="utf-8").strip()
    if not content:
        return []

    return json.loads(content)


def write_history(items: list[dict[str, Any]]) -> None:
    HISTORY_FILE.write_text(
        json.dumps(items, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def upsert_history_item(item: dict[str, Any]) -> dict[str, Any]:
    items = read_history()
    updated = False

    for index, existing in enumerate(items):
        if existing["id"] == item["id"]:
            items[index] = item
            updated = True
            break

    if not updated:
        items.insert(0, item)

    write_history(items)
    return item


def get_history_item(item_id: str) -> dict[str, Any] | None:
    for item in read_history():
        if item["id"] == item_id:
            return item
    return None


def delete_history_item(item_id: str) -> dict[str, Any] | None:
    items = read_history()
    kept_items = []
    deleted_item = None

    for item in items:
        if item["id"] == item_id and deleted_item is None:
            deleted_item = item
            continue
        kept_items.append(item)

    if deleted_item is not None:
        write_history(kept_items)

    return deleted_item
