import { useFrame } from '@react-three/fiber';
import { useMemo } from 'react';
import { AdditiveBlending, Color, DoubleSide, ShaderMaterial } from 'three';

/**
 * Ground grid with an animated scan sweep. 1 m major lines, 25 cm minor lines.
 * sweep=false gives a static measuring grid (used while calibrating).
 */
export function ScanGrid({ sweep = true, size = 40, color = '#D9342B' }: { sweep?: boolean; size?: number; color?: string }) {
  const material = useMemo(
    () =>
      new ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        blending: AdditiveBlending,
        uniforms: { uTime: { value: 0 }, uSweep: { value: sweep ? 1 : 0 }, uColor: { value: new Color(color) } },
        vertexShader: /* glsl */ `
          varying vec3 vWorld;
          void main() {
            vec4 w = modelMatrix * vec4(position, 1.0);
            vWorld = w.xyz;
            gl_Position = projectionMatrix * viewMatrix * w;
          }`,
        fragmentShader: /* glsl */ `
          uniform float uTime; uniform float uSweep; uniform vec3 uColor;
          varying vec3 vWorld;
          float gridLine(vec2 p, float scale, float width) {
            vec2 g = abs(fract(p / scale - 0.5) - 0.5) / fwidth(p / scale);
            return 1.0 - min(min(g.x, g.y) / width, 1.0);
          }
          void main() {
            vec2 p = vWorld.xz;
            float dist = length(p);
            float major = gridLine(p, 1.0, 1.2);
            float minor = gridLine(p, 0.25, 0.8) * 0.35;
            float fade = smoothstep(22.0, 3.0, dist);
            float front = mod(uTime * 6.0, 26.0);
            float band = uSweep * smoothstep(2.5, 0.0, abs(-p.y - front)) ;
            float reveal = mix(1.0, smoothstep(front + 0.5, front - 1.5, -p.y), uSweep);
            float a = (max(major, minor) * 0.75 * reveal + band * 0.35) * fade;
            gl_FragColor = vec4(uColor * (1.0 + band), a);
          }`,
      }),
    [sweep, color],
  );
  useFrame((_, dt) => { material.uniforms.uTime.value += dt; });
  return (
    <mesh rotation-x={-Math.PI / 2} position-y={0.01} material={material} renderOrder={10} raycast={() => null}>
      <planeGeometry args={[size, size]} />
    </mesh>
  );
}
