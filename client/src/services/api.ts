const BASE = '/api';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`API ${res.status}: ${body}`);
  }
  return res.json() as Promise<T>;
}

export interface GameBoard {
  id: string;
  name: string;
  description?: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  description?: string;
  color: string;
  question_count: number;
}

export function fetchBoards(): Promise<GameBoard[]> {
  return request('/games/boards');
}

export function createGame(boardId: string): Promise<{ id: string; room_code: string }> {
  return request('/games', {
    method: 'POST',
    body: JSON.stringify({ board_id: boardId }),
  });
}

export function joinGame(roomCode: string, nickname: string): Promise<{
  player: { id: string; nickname: string; session_id: string };
  game: { id: string; room_code: string; status: string };
}> {
  return request(`/games/${encodeURIComponent(roomCode)}/join`, {
    method: 'POST',
    body: JSON.stringify({ nickname }),
  });
}

export function fetchGame(idOrRoomCode: string): Promise<{
  id: string;
  room_code: string;
  status: string;
  board_id: string;
  players: Array<{ id: string; nickname: string; score: number; is_connected: number }>;
  board: { categories: Array<{ name: string; color: string; questions: any[] }> };
}> {
  return request(`/games/${encodeURIComponent(idOrRoomCode)}`);
}

export function fetchCategories(): Promise<CategoryInfo[]> {
  return request('/categories');
}

export function importCsv(csv: string): Promise<{
  imported: number;
  categories_created: string[];
  errors: string[];
}> {
  return request('/questions/import-csv', {
    method: 'POST',
    body: JSON.stringify({ csv }),
  });
}

export function createBoard(name: string, categoryIds: string[]): Promise<GameBoard> {
  return request('/boards', {
    method: 'POST',
    body: JSON.stringify({ name, category_ids: categoryIds }),
  });
}

export function deleteCategory(id: string): Promise<{ deleted: boolean }> {
  return request(`/categories/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}

export function deleteBoard(id: string): Promise<{ deleted: boolean }> {
  return request(`/boards/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
}
