import { API_BASE_URL } from '../constants/api';

async function parseJsonResponse(response) {
  const payload = await response.json().catch(() => ({}));
  const errorMessage =
    payload?.message ||
    payload?.detail?.message ||
    payload?.detail ||
    '요청 처리 중 오류가 발생했습니다.';

  if (!response.ok) {
    throw new Error(errorMessage);
  }

  return payload;
}

export async function processImage({ image, mode }) {
  const formData = new FormData();

  formData.append('mode', mode);
  formData.append('image', {
    uri: image.uri,
    name: image.fileName || `upload-${Date.now()}.jpg`,
    type: image.mimeType || 'image/jpeg',
  });

  const response = await fetch(`${API_BASE_URL}/process`, {
    method: 'POST',
    body: formData,
  });

  return parseJsonResponse(response);
}

export async function fetchHistory() {
  const response = await fetch(`${API_BASE_URL}/history`);
  return parseJsonResponse(response);
}

export async function deleteHistoryItem(id) {
  const response = await fetch(`${API_BASE_URL}/history/${id}`, {
    method: 'DELETE',
  });

  return parseJsonResponse(response);
}
