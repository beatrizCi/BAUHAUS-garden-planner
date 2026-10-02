# BAUHAUS Garten-Planer (AI Bootcamp)

Photograph your garden, place real products at real size, view the plan in 3D and AR, remove existing objects with AI, and put everything in the cart.

```
apps/
  api/   NestJS 11 · TypeORM (SQLite or Postgres) · sharp · Hugging Face · Gemini · Claude
  web/   React 19 · Vite · Three.js · React Three Fiber · drei · Framer Motion · zustand · WebXR
scripts/
  generate-models.mjs   builds the placeholder .glb product models
```

## Quick start

Requires Node 20+.

```bash
npm install
cp .env.example .env        # optional: add API keys
npm run dev                 # API on :3000, web on :5173
```

Open http://localhost:5173 and click **Beispielgarten** to try it without a photo.

The SQLite database (`apps/api/data/`) and the product catalog are created automatically on first start. To use Postgres instead: `docker compose up -d db`, then set `DB_TYPE=postgres` and `DATABASE_URL` in `.env`.

### Testing on a phone (camera + AR)

Camera access and WebXR only work in a secure context. Your laptop and phone must be on the same network:

```bash
HTTPS=1 npm run dev -w apps/web     # self-signed certificate, accept the warning on the phone
npm run dev -w apps/api             # in a second terminal
```

Then open `https://<your-laptop-ip>:5173` on the phone.

## How the stack maps to the requirements

| Requirement | Where |
|---|---|
| Camera view (`getUserMedia`) | `web/src/components/CameraCapture.tsx`, with a file-input fallback when permission is denied |
| Scan animation / grid (Three.js) | `web/src/three/ScanGrid.tsx` (shader, 1 m / 25 cm lines, sweep), shown over the live camera, after upload, during detection and while calibrating |
| 3D garden view | `web/src/three/GardenScene.tsx`: photo mode (camera matched to the photo) and orbit 3D mode |
| Place furniture (R3F) | `ItemNode` in `GardenScene.tsx`, store actions in `web/src/store.ts` |
| Drag products (raycasting) | `ItemNode` intersects the pointer ray with the ground plane; pointer capture keeps the drag going |
| Rotate / scale (TransformControls) | `SelectedGizmo` in `GardenScene.tsx`; Y-only rotation, uniform scale for objects, X/Z for surfaces |
| 3D products (.glb) | `web/public/models/pXX.glb`; the material named `primary` is recoloured per colour variant (`three/variant.ts`) |
| AR placement (WebXR) | `web/src/ar/ARSession.ts`: `immersive-ar`, hit-test, dom-overlay, tap to place the whole plan or one product |
| Android tracking (ARCore) | Chrome on Android runs WebXR on ARCore |
| iOS tracking (ARKit) | `web/src/ar/quickLook.ts`: plan exported to USDZ on the fly and opened in AR Quick Look (ARKit) |
| Surface / depth (ARCore Depth / LiDAR) | WebXR `depth-sensing` (ARCore Depth API) with a live distance readout; Quick Look uses LiDAR automatically on supported iPhones |
| Measurements | AR: hit-test points + distance (`ARSession.ts`). Photo/3D: ground-plane measuring tool (`MeasureTool`) |
| Product slider | `web/src/components/ProductSlider.tsx` (Framer Motion drag carousel, category + colour filters) |
| UI animation | Framer Motion: drawers, modals, panels, toasts, slider |
| Before / after slider | `web/src/components/BeforeAfter.tsx`: original photo vs rendered plan |
| Detect objects | `POST /api/vision/segment`: Hugging Face image segmentation → masks + bounding boxes |
| Remove existing object | `POST /api/vision/inpaint`: segmentation masks and/or brush mask → Gemini, HF endpoint or local fill |
| Save project | `api/src/projects`: CRUD on `/api/projects`, photo + calibration + placed items; thumbnails via `/api/uploads/data-url` |

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Which AI features are configured |
| GET | `/api/products?category=&color=&q=` | Catalog |
| POST | `/api/uploads` | Upload photo (multipart `file`), normalised to JPEG ≤ 2400 px |
| POST | `/api/uploads/data-url` | Upload a canvas snapshot `{ dataUrl }` |
| GET/POST/PUT/DELETE | `/api/projects[/:id]` | Save and load plans |
| POST | `/api/vision/segment` | `{ imageUrl }` → detected objects with mask URLs |
| POST | `/api/vision/inpaint` | `{ imageUrl, maskUrls?, maskDataUrl? }` → new photo URL |
| POST | `/api/ai/suggest` | `{ imageUrl, calibration, items, wishes? }` → placed product suggestions |
| POST | `/api/service-requests` | Garten-Service callback request |

## AI providers

All AI features are optional. Without keys the app still works: detection is replaced by the brush, inpainting falls back to a local fill (fine for soil and lawn, not photorealistic), and suggestions show a "not configured" message.

- **Detection:** set `HF_TOKEN`. The default model is `nvidia/segformer-b0-finetuned-ade-512-512` (ADE20K classes). Model availability on the HF inference providers changes; if a model doesn't respond, set another segmentation model in `HF_SEGMENTATION_MODEL`.
- **Removal:** set `GEMINI_API_KEY` (Gemini image editing gets the photo plus a copy with the object highlighted), or `HF_INPAINT_ENDPOINT` for your own Inference Endpoint (LaMa or SDXL-inpainting). The endpoint must accept `POST { inputs: <base64 image>, parameters: { mask_image: <base64 png>, prompt } }` and return image bytes or `{ image: <base64> }`. Whatever the provider returns is only blended in under the feathered mask, so the rest of the photo stays pixel-identical and the calibration stays valid.
- **Suggestions:** set `ANTHROPIC_API_KEY`.

## How photo mode works

The 3D camera is matched to the photo with three values, adjustable under **Kalibrieren**: horizon position, vertical field of view and camera height. The ground is the plane y = 0, the camera looks down −Z, and all products are modelled in meters, so a 2.6 m lounge set is drawn at 2.6 m. A shadow-catcher plane puts real shadows onto the photo. Check calibration with the measuring tool against something of known size, such as a 60 cm patio tile.

## Placeholder vs. production

| Area | Now | Replace with |
|---|---|---|
| Products | 21 demo products seeded from `api/src/products/catalog.ts` | BAUHAUS product API / PIM, store stock |
| 3D models | Generated low-poly `.glb` (`npm run models`) | Real product models; keep a material named `primary` for colour variants, or map variants to texture sets |
| Ground textures | Procedural canvas textures (`three/surfaceTextures.ts`) | PBR texture sets |
| PlusCard | Demo: any number links, 1 point per € | PlusCard service |
| Checkout | Toast | Cart/checkout API |
| Service phone | Placeholder in `Commerce.tsx` | Real Garten-Service number + CRM for `/service-requests` |
| DB schema | TypeORM `synchronize` outside production | TypeORM migrations |
| Auth | None: projects are global | Customer account / SSO |
| Logo / font | Text stand-in, Barlow | Official BAUHAUS assets |

## Known limits

- **iPhone:** Safari has no WebXR. Quick Look covers placing and viewing the plan (with LiDAR where available), but the in-app AR measuring and depth readout only exist on Android. Full ARKit measuring and LiDAR depth on iOS need a native app (Swift/RealityKit, or React Native / Capacitor with an AR plugin).
- **Depth readout:** WebXR depth sensing only works on ARCore phones that support the Depth API. On other phones the AR session still runs, just without the depth readout.
- **Calibration:** photo mode assumes the ground in the photo is flat and level. Slopes and steps need manual adjustment.

## Scripts

```bash
npm run dev         # API + web
npm run build       # production builds
npm run typecheck   # both apps
npm run seed        # reset the product table to the demo catalog
npm run models      # regenerate placeholder .glb models
```
