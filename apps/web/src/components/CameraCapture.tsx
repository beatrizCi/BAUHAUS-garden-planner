import { Canvas } from '@react-three/fiber';
import { useEffect, useRef, useState } from 'react';
import { ScanGrid } from '../three/ScanGrid';

/**
 * Full-screen camera (getUserMedia) with a Three.js scan grid laid over the live video.
 * The grid assumes the phone is held at ~1.6 m, tilted slightly down.
 */
export function CameraCapture({ onCapture, onClose, onFallback }: { onCapture: (b: Blob) => void; onClose: () => void; onFallback: () => void }) {
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('unsupported');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        video.current!.srcObject = stream;
        await video.current!.play();
        setReady(true);
      } catch {
        onFallback();
      }
    })();
    return () => stream?.getTracks().forEach((t) => t.stop());
  }, [onFallback]);

  const shoot = () => {
    const v = video.current!;
    const c = document.createElement('canvas');
    c.width = v.videoWidth; c.height = v.videoHeight;
    c.getContext('2d')!.drawImage(v, 0, 0);
    c.toBlob((b) => b && onCapture(b), 'image/jpeg', 0.92);
  };

  return (
    <div className="camera" role="dialog" aria-label="Kamera">
      <div className="camera-view">
        <video ref={video} playsInline muted />
        {ready && (
          <Canvas gl={{ alpha: true }} camera={{ fov: 60, position: [0, 1.6, 0], rotation: [-0.42, 0, 0] }} style={{ pointerEvents: 'none' }}>
            <ScanGrid sweep size={30} color="#ffffff" />
          </Canvas>
        )}
        <div className="camera-tip">Handy quer halten, die ganze Fläche ins Bild nehmen</div>
      </div>
      <div className="camera-bar">
        <button className="btn ghost light" onClick={onClose}>Abbrechen</button>
        <button className="shutter" onClick={shoot} disabled={!ready} aria-label="Foto aufnehmen" />
        <span style={{ width: 110 }} />
      </div>
    </div>
  );
}
