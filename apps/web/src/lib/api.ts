import type { Calibration, PlacedItem, Product, Project, Segment, Suggestion } from '../types';

export class ApiError extends Error {
  constructor(message: string, public status: number) { super(message); }
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/api${path}`, init);
  } catch {
    throw new ApiError('Server nicht erreichbar. Läuft die API (npm run dev)?', 0);
  }
  const body = res.headers.get('content-type')?.includes('json') ? await res.json() : null;
  if (!res.ok) {
    const msg = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new ApiError(msg ?? `Fehler ${res.status}`, res.status);
  }
  return body as T;
}
const json = (method: string, data: unknown): RequestInit => ({ method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });

export const api = {
  health: () => req<{ ok: boolean; features: { segmentation: boolean; inpainting: string; suggestions: boolean } }>('/health'),
  products: () => req<Product[]>('/products'),

  uploadPhoto: (file: Blob) => {
    const fd = new FormData();
    fd.append('file', file, 'garden.jpg');
    return req<{ url: string; width: number; height: number }>('/uploads', { method: 'POST', body: fd });
  },
  uploadDataUrl: (dataUrl: string) => req<{ url: string }>('/uploads/data-url', json('POST', { dataUrl })),

  listProjects: () => req<Project[]>('/projects'),
  getProject: (id: string) => req<Project>(`/projects/${id}`),
  saveProject: (p: Project) => (p.id ? req<Project>(`/projects/${p.id}`, json('PUT', strip(p))) : req<Project>('/projects', json('POST', strip(p)))),
  deleteProject: (id: string) => req<{ deleted: boolean }>(`/projects/${id}`, { method: 'DELETE' }),

  segment: (imageUrl: string) => req<{ provider: string; segments: Segment[]; message?: string }>('/vision/segment', json('POST', { imageUrl })),
  inpaint: (imageUrl: string, maskUrls: string[], maskDataUrl?: string) =>
    req<{ url: string; provider: string; warning?: string }>('/vision/inpaint', json('POST', { imageUrl, maskUrls, maskDataUrl })),

  suggest: (imageUrl: string, calibration: Calibration, items: PlacedItem[], wishes?: string) =>
    req<{ analysis: string; style: string; suggestions: Suggestion[] }>('/ai/suggest', json('POST', { imageUrl, calibration, items, wishes })),

  serviceRequest: (data: { name: string; phone: string; preferredTime: string; note?: string; projectId?: string }) =>
    req<{ id: string }>('/service-requests', json('POST', data)),
};

function strip(p: Project) {
  const { name, photoUrl, originalPhotoUrl, thumbnailUrl, calibration, items } = p;
  return { name, photoUrl: photoUrl ?? undefined, originalPhotoUrl: originalPhotoUrl ?? undefined, thumbnailUrl: thumbnailUrl ?? undefined, calibration, items };
}
