import { api } from './api';
import { captureScene } from './capture';
import { useGarden } from '../store';

export async function saveProject() {
  const s = useGarden.getState();
  let thumbnailUrl = s.project.thumbnailUrl ?? null;
  try {
    if (s.project.photoUrl || s.project.items.length) thumbnailUrl = (await api.uploadDataUrl(await captureScene(480))).url;
  } catch { /* thumbnail is optional */ }
  const saved = await api.saveProject({ ...s.project, thumbnailUrl });
  useGarden.setState((st) => ({ dirty: false, project: { ...st.project, id: saved.id, thumbnailUrl: saved.thumbnailUrl } }));
  const url = new URL(location.href);
  url.searchParams.set('project', saved.id!);
  history.replaceState(null, '', url);
  s.notify('Projekt gespeichert.');
  return saved;
}

export async function openProject(id: string) {
  const s = useGarden.getState();
  const p = await api.getProject(id);
  let aspect = 4 / 3;
  if (p.photoUrl) {
    aspect = await new Promise<number>((res) => { const im = new Image(); im.onload = () => res(im.naturalWidth / im.naturalHeight); im.onerror = () => res(4 / 3); im.src = p.photoUrl!; });
  }
  s.setProject(p);
  useGarden.setState({ photoAspect: aspect, view: 'photo' });
  const url = new URL(location.href);
  url.searchParams.set('project', id);
  history.replaceState(null, '', url);
}
