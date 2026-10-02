export const eur = (n: number) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(n);
export const num = (n: number) => n.toLocaleString('de-DE');
export const uid = () => Math.random().toString(36).slice(2, 10);
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Ground distance straight ahead where the image centre ray hits the ground. */
export function centreGroundDistance(cal: { horizon: number; fov: number; cameraHeight: number }) {
  const pitch = cameraPitch(cal);
  // clamp to a sensible spot in front of the camera so new products are visible and not tiny
  return pitch > 0.02 ? Math.max(3, Math.min(7, cal.cameraHeight / Math.tan(pitch))) : 5;
}
/** Downward pitch (radians) so that the horizon sits at cal.horizon (0 = top, 1 = bottom of the photo). */
export function cameraPitch(cal: { horizon: number; fov: number }) {
  const t = Math.tan(((cal.fov / 2) * Math.PI) / 180);
  return Math.atan((0.5 - cal.horizon) * 2 * t);
}
