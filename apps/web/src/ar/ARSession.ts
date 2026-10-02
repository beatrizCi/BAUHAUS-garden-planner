import {
  BufferGeometry, DirectionalLight, Group, HemisphereLight, Line, LineBasicMaterial, Matrix4, Mesh, MeshBasicMaterial,
  PerspectiveCamera, PlaneGeometry, RingGeometry, Scene, ShadowMaterial, SphereGeometry, Vector3, WebGLRenderer,
} from 'three';

export type ARMode = 'place' | 'measure';
export interface ARStatus {
  tracking: boolean;          // hit-test found a surface under the reticle
  placed: boolean;
  mode: ARMode;
  measurement: number | null; // meters between the last two measure points
  depth: 'cpu' | 'gpu' | 'none';
  centreDepth: number | null; // meters to the surface at screen centre (ARCore Depth API)
}

/**
 * Plain three.js WebXR session: immersive-ar + hit-test (ARCore on Android Chrome),
 * dom-overlay for the React UI, optional depth-sensing and anchors.
 */
export class ARSession {
  private renderer = new WebGLRenderer({ antialias: true, alpha: true });
  private scene = new Scene();
  private camera = new PerspectiveCamera();
  private reticle: Mesh;
  private shadow: Mesh;
  private session: XRSession | null = null;
  private hitSource: XRHitTestSource | null = null;
  private lastHit = new Matrix4();
  private measurePts: Vector3[] = [];
  private measureGroup = new Group();
  private status: ARStatus = { tracking: false, placed: false, mode: 'place', measurement: null, depth: 'none', centreDepth: null };

  constructor(private layout: Group, private onStatus: (s: ARStatus) => void, private onEnd: () => void) {
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.xr.enabled = true;
    this.renderer.shadowMap.enabled = true;
    this.renderer.domElement.style.display = 'none';
    document.body.appendChild(this.renderer.domElement);

    this.scene.add(new HemisphereLight(0xffffff, 0x887766, 1.6));
    const sun = new DirectionalLight(0xffffff, 1.4);
    sun.position.set(2, 6, 2); sun.castShadow = true;
    sun.shadow.camera.left = sun.shadow.camera.bottom = -6; sun.shadow.camera.right = sun.shadow.camera.top = 6;
    this.scene.add(sun);

    this.reticle = new Mesh(new RingGeometry(0.12, 0.16, 40).rotateX(-Math.PI / 2), new MeshBasicMaterial({ color: 0xd9342b }));
    this.reticle.matrixAutoUpdate = false;
    this.reticle.visible = false;
    this.scene.add(this.reticle);

    this.shadow = new Mesh(new PlaneGeometry(14, 14).rotateX(-Math.PI / 2), new ShadowMaterial({ opacity: 0.3 }));
    this.shadow.receiveShadow = true;
    this.layout.add(this.shadow);
    this.layout.traverse((o) => { if ((o as Mesh).isMesh) (o as Mesh).castShadow = true; });
    this.layout.visible = false;
    this.scene.add(this.layout, this.measureGroup);
    sun.target = this.layout;
  }

  static async supported(): Promise<boolean> {
    try { return !!navigator.xr && (await navigator.xr.isSessionSupported('immersive-ar')); } catch { return false; }
  }

  async start(overlayRoot: HTMLElement) {
    if (!navigator.xr) throw new Error('WebXR nicht verfügbar');
    const init: XRSessionInit = {
      requiredFeatures: ['hit-test'],
      optionalFeatures: ['dom-overlay', 'depth-sensing', 'anchors', 'light-estimation'],
      domOverlay: { root: overlayRoot },
      depthSensing: { usagePreference: ['cpu-optimized', 'gpu-optimized'], dataFormatPreference: ['luminance-alpha', 'float32'] },
    };
    const session = await navigator.xr.requestSession('immersive-ar', init);
    this.session = session;
    this.renderer.xr.setReferenceSpaceType('local');
    await this.renderer.xr.setSession(session);
    const viewer = await session.requestReferenceSpace('viewer');
    this.hitSource = (await session.requestHitTestSource?.({ space: viewer })) ?? null;
    this.status.depth = session.depthUsage === 'cpu-optimized' ? 'cpu' : session.depthUsage === 'gpu-optimized' ? 'gpu' : 'none';
    session.addEventListener('select', this.onSelect);
    session.addEventListener('end', this.cleanup);
    this.renderer.setAnimationLoop(this.frame);
    this.emit();
  }

  setMode(mode: ARMode) { this.status.mode = mode; if (mode === 'measure') this.clearMeasure(); this.emit(); }
  rotate(deg: number) { this.layout.rotation.y += (deg * Math.PI) / 180; }
  reset() { this.layout.visible = false; this.status.placed = false; this.emit(); }
  end() { this.session?.end(); }

  private frame = (_t: number, frame?: XRFrame) => {
    if (!frame) return;
    const ref = this.renderer.xr.getReferenceSpace();
    if (this.hitSource && ref) {
      const hits = frame.getHitTestResults(this.hitSource);
      const pose = hits[0]?.getPose(ref);
      const tracking = !!pose;
      if (pose) { this.lastHit.fromArray(pose.transform.matrix); this.reticle.matrix.copy(this.lastHit); }
      this.reticle.visible = tracking && (this.status.mode === 'measure' || !this.status.placed);
      if (tracking !== this.status.tracking) { this.status.tracking = tracking; this.emit(); }
    }
    if (this.status.depth === 'cpu' && ref) {
      const view = frame.getViewerPose(ref)?.views[0];
      const info = view ? (frame as XRFrame & { getDepthInformation?: (v: XRView) => XRCPUDepthInformation | null }).getDepthInformation?.(view) : null;
      if (info) {
        const d = Math.round(info.getDepthInMeters(0.5, 0.5) * 100) / 100;
        if (d !== this.status.centreDepth) { this.status.centreDepth = d; this.emit(); }
      }
    }
    this.renderer.render(this.scene, this.camera);
  };

  private onSelect = () => {
    if (!this.status.tracking) return;
    const p = new Vector3().setFromMatrixPosition(this.lastHit);
    if (this.status.mode === 'place') {
      this.layout.position.copy(p);
      this.layout.visible = true;
      this.status.placed = true;
    } else {
      if (this.measurePts.length >= 2) this.clearMeasure();
      this.measurePts.push(p);
      const dot = new Mesh(new SphereGeometry(0.02, 12, 12), new MeshBasicMaterial({ color: 0xd9342b }));
      dot.position.copy(p);
      this.measureGroup.add(dot);
      if (this.measurePts.length === 2) {
        const line = new Line(new BufferGeometry().setFromPoints(this.measurePts), new LineBasicMaterial({ color: 0xd9342b }));
        this.measureGroup.add(line);
        this.status.measurement = this.measurePts[0].distanceTo(this.measurePts[1]);
      }
    }
    this.emit();
  };

  private clearMeasure() { this.measurePts = []; this.measureGroup.clear(); this.status.measurement = null; }
  private emit() { this.onStatus({ ...this.status }); }

  private cleanup = () => {
    this.renderer.setAnimationLoop(null);
    this.hitSource?.cancel();
    this.hitSource = null;
    this.session = null;
    this.renderer.dispose();
    this.renderer.domElement.remove();
    this.onEnd();
  };
}
