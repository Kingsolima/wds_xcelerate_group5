import * as THREE from 'three';
import gsap from 'gsap';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ORIGIN, PX_PER_M, ROOMS, WALL_H, roomAt, roomBounds, roomById, wx, wz, type RoomId } from './plan';
import { createMaterials, disposeKit } from './kit';
import { buildSuite, type Suite, type SuiteDoor, type SuitePiece, type SuitePocketDoor } from './build';
import { CHAPTERS, type ChapterId } from './chapters';

/*
  The interactive model: an orthographic camera on a rig, a sun that stays over the viewer's left
  shoulder, and the suite itself.

  The camera's pose is layered. The page drives a scripted pose from its scroll position; on top of
  that sit the plan/isometric toggle, a room the visitor clicked, how far they have dragged the
  model round, and a little drift that follows the pointer. Each layer eases on its own, so they
  never fight.

  Nothing renders unless something changed.
*/

export type SuiteView = 'iso' | 'plan';

/**
 * Where the camera looks (x, z), from which bearing and how steeply (degrees), how close, and how
 * far the model is slid aside to leave room for the chapter's text (0 centred, 1 fully aside).
 */
type Pose = { x: number; z: number; az: number; pol: number; zoom: number; shift: number };

const deg = THREE.MathUtils.degToRad;
const POSES: Record<ChapterId, Pose> = {
  suite: { x: 0.1, z: 0.3, az: 45, pol: 40, zoom: 1, shift: 0 },
  reviews: { x: wx(392), z: wz(150), az: 28, pol: 41, zoom: 1.9, shift: 1 },
  sublets: { x: wx(182), z: wz(450), az: -42, pol: 40, zoom: 2.2, shift: 1 },
  housemates: { x: 0, z: wz(388), az: 0, pol: 1.2, zoom: 0.97, shift: 1 },
  verified: { x: wx(372), z: wz(676), az: 24, pol: 49, zoom: 2.05, shift: 1 },
};
const PLAN_POSE: Pose = { x: 0, z: wz(388), az: 0, pol: 1.2, zoom: 0.97, shift: 0 };

/** Size of the whole suite on screen at the default pose, in metres, used to fit it to the canvas. */
const FIT = { w: 14.4, h: 12.2 };
const LOWERED = 0.24;

export type SuiteLayout = {
  /** How much of the canvas the suite may take up at zoom 1. */
  fitW: number;
  fitH: number;
  /** Where its centre sits, as a fraction of the canvas from the middle (+y is up). */
  cx: number;
  cy: number;
  /** How far right a chapter slides it, as a fraction of the canvas width. */
  shiftX: number;
};

export type SuiteEvents = {
  onReady?: () => void;
  onHover?: (room: RoomId | null) => void;
  onFocus?: (room: RoomId | null) => void;
  onView?: (view: SuiteView) => void;
  onDragStart?: () => void;
};

type HighlightMap = Partial<Record<RoomId, number>>;

const CHAPTER_STATE: Record<ChapterId, { lit: HighlightMap; open: readonly RoomId[] }> = {
  suite: { lit: {}, open: [] },
  reviews: { lit: { living: 0.5 }, open: [] },
  sublets: { lit: { bed2: 0.7 }, open: ['bed2'] },
  housemates: { lit: { bed1: 0.72, bed2: 0.72, bed3: 0.72, bed4: 0.72 }, open: [] },
  verified: { lit: { foyer: 0.55 }, open: ['foyer'] },
};

const smoothstep = (a: number, b: number, v: number) => {
  const t = Math.min(1, Math.max(0, (v - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const mix = (a: number, b: number, t: number) => a + (b - a) * t;
const mixPose = (a: Pose, b: Pose, t: number): Pose => ({
  x: mix(a.x, b.x, t),
  z: mix(a.z, b.z, t),
  az: mix(a.az, b.az, t),
  pol: mix(a.pol, b.pol, t),
  zoom: mix(a.zoom, b.zoom, t),
  shift: mix(a.shift, b.shift, t),
});
const travel = gsap.parseEase('power2.inOut');

export class SuiteScene {
  private renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 1, 160);
  private sun = new THREE.DirectionalLight('#fff0dc', 3);
  private materials = createMaterials();
  private suite: Suite;
  private baked: THREE.Object3D[] = [];
  private environment: THREE.Texture;

  private width = 1;
  private height = 1;
  private layout: SuiteLayout = { fitW: 0.5, fitH: 0.64, cx: 0, cy: 0, shiftX: 0 };

  // Pose layers.
  private progress = 0;
  private plan = { w: 0 };
  private view: SuiteView = 'iso';
  private focus = { w: 0, room: null as RoomId | null, pose: POSES.suite };
  private orbit = { az: 0, pol: 0, vAz: 0 };
  private drift = { x: 0, y: 0, tx: 0, ty: 0 };
  private intro = { az: 0, zoom: 1, done: false };
  private current: Pose = { ...POSES.suite };

  private chapter: ChapterId = 'suite';
  private hovered: RoomId | null = null;
  private sideScale = { n: 1, e: 1, s: 1, w: 1 };
  private anchors = new Map<RoomId, HTMLElement>();
  private anchorPoints = new Map<RoomId, THREE.Vector3>();

  private dirty = true;
  private shadowDirty = true;
  private shadowAz = Infinity;
  private interactive = false;
  private reducedMotion: boolean;
  private finePointer: boolean;
  private drag: { id: number; x: number; y: number; moved: number; touch: boolean } | null = null;
  private resizeObserver: ResizeObserver;
  private disposed = false;

  constructor(
    private canvas: HTMLCanvasElement,
    private events: SuiteEvents = {},
  ) {
    this.reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x000000, 0);
    this.renderer.toneMapping = THREE.NeutralToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    this.renderer.shadowMap.autoUpdate = false;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    this.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    pmrem.dispose();
    this.scene.environment = this.environment;
    this.scene.environmentIntensity = 0.38;

    this.scene.add(new THREE.HemisphereLight('#fffaf0', '#cfc1ad', 0.92));
    const small = Math.min(window.innerWidth, window.innerHeight) < 700;
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.setScalar(small ? 1536 : 2560);
    this.sun.shadow.radius = 3.2;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.025;
    const shadowCamera = this.sun.shadow.camera;
    shadowCamera.left = shadowCamera.bottom = -11.5;
    shadowCamera.right = shadowCamera.top = 11.5;
    shadowCamera.near = 2;
    shadowCamera.far = 70;
    this.sun.target.position.set(0, 0, 1.4);
    this.scene.add(this.sun, this.sun.target);

    this.suite = buildSuite(this.materials.mats);
    this.scene.add(this.suite.root);
    for (const room of ROOMS) {
      this.anchorPoints.set(room.id, new THREE.Vector3(wx(room.anchor[0]), WALL_H + 0.25, wz(room.anchor[1])));
    }
    for (const door of this.suite.doors.values()) this.suite.setDoor(door, door.rest);
    for (const door of this.suite.pocketDoors) this.suite.setPocketDoor(door, 0.72);

    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(canvas);
    this.resize();

    canvas.addEventListener('pointerdown', this.onPointerDown);
    canvas.addEventListener('pointermove', this.onPointerMove);
    canvas.addEventListener('pointerup', this.onPointerUp);
    canvas.addEventListener('pointercancel', this.onPointerCancel);
    canvas.addEventListener('pointerleave', this.onPointerLeave);
    window.addEventListener('pointermove', this.onWindowPointerMove, { passive: true });
    canvas.addEventListener('webglcontextlost', this.onContextLost);
    canvas.addEventListener('webglcontextrestored', this.onContextRestored);

    gsap.ticker.add(this.tick);
    this.events.onReady?.();
  }

  /* ---------- What the page can ask for ---------- */

  setLayout(layout: SuiteLayout) {
    this.layout = layout;
    this.dirty = true;
  }

  /** 0 is the opening view; each whole number after it is the next chapter. */
  setProgress(progress: number) {
    const next = this.reducedMotion ? Math.round(progress) : progress;
    if (next === this.progress) return;
    this.progress = next;
    // Scrolling on is the cue to let go of anything the visitor set up by hand.
    this.release();
    this.dirty = true;
  }

  setChapter(chapter: ChapterId) {
    if (chapter === this.chapter) return;
    this.chapter = chapter;
    this.applyState();
    if (chapter === 'verified') this.knock();
  }

  setView(view: SuiteView) {
    if (view === this.view) return;
    this.view = view;
    this.events.onView?.(view);
    if (view === 'plan') this.focusRoom(null);
    gsap.to(this.plan, {
      w: view === 'plan' ? 1 : 0,
      duration: this.reducedMotion ? 0 : 1.3,
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: this.invalidate,
    });
    if (view === 'plan') gsap.to(this.orbit, { az: 0, pol: 0, vAz: 0, duration: 0.9, ease: 'power3.out', overwrite: true });
  }

  /** Bring one room up close, or pass null to step back. */
  focusRoom(room: RoomId | null) {
    if (room === this.focus.room) return;
    this.focus.room = room;
    if (room) {
      const bounds = roomBounds(roomById(room));
      const size = Math.max(bounds.w, bounds.h * 1.25) / PX_PER_M;
      const base = this.basePose();
      this.focus.pose = {
        x: wx(bounds.cx),
        z: wz(bounds.cy),
        az: base.az,
        // Seen from straight above, a room stays flat; otherwise tip it enough to see into.
        pol: this.view === 'plan' ? base.pol : Math.max(base.pol, 36),
        zoom: THREE.MathUtils.clamp(6.2 / size, 1.5, 2.6),
        // Up close the model fills the canvas, so it moves aside for the copy as a chapter does.
        shift: 1,
      };
    }
    gsap.to(this.focus, {
      w: room ? 1 : 0,
      duration: this.reducedMotion ? 0 : 1.1,
      ease: 'power3.inOut',
      overwrite: true,
      onUpdate: this.invalidate,
    });
    this.applyState();
    this.events.onFocus?.(room);
  }

  setAnchors(anchors: Map<RoomId, HTMLElement>) {
    this.anchors = anchors;
    this.dirty = true;
  }

  setInteractive(on: boolean) {
    this.interactive = on;
    this.canvas.style.cursor = on ? 'grab' : '';
  }

  /** The suite assembles itself: slab, then walls, then each room's furniture. */
  playIntro() {
    const { suite } = this;
    const timeline = gsap.timeline({
      onUpdate: () => {
        this.dirty = true;
        this.shadowDirty = true;
      },
      onComplete: () => this.finishIntro(),
    });

    if (this.reducedMotion) {
      this.finishIntro();
      return timeline;
    }

    const far = (piece: SuitePiece) => Math.hypot(piece.x, piece.z - 0.6);
    const sweep = (piece: SuitePiece) => piece.x * 0.55 + piece.z;
    const span = (pieces: SuitePiece[], measure: (piece: SuitePiece) => number) => {
      const values = pieces.map(measure);
      const min = Math.min(...values);
      const range = Math.max(...values) - min || 1;
      return (piece: SuitePiece) => (measure(piece) - min) / range;
    };

    this.intro.az = -34;
    this.intro.zoom = 0.8;
    timeline.to(this.intro, { az: 0, zoom: 1, duration: 3, ease: 'power3.out' }, 0);

    suite.root.position.y = -1.6;
    timeline.to(suite.root.position, { y: 0, duration: 1.3, ease: 'expo.out' }, 0);

    const wallOrder = span(suite.walls, far);
    for (const wall of suite.walls) {
      wall.object.scale.y = 0.0001;
      timeline.to(wall.object.scale, { y: 1, duration: 1, ease: 'expo.out' }, 0.25 + wallOrder(wall) * 0.6);
    }

    for (const fitting of suite.fittings) {
      fitting.object.scale.y = 0.0001;
      timeline.to(fitting.object.scale, { y: 1, duration: 0.8, ease: 'expo.out' }, 0.95 + wallOrder(fitting) * 0.3);
    }
    for (const door of suite.doors.values()) {
      const state = { t: 0 };
      suite.setDoor(door, 0);
      timeline.to(state, { t: door.rest, duration: 1.2, ease: 'power3.out', onUpdate: () => suite.setDoor(door, state.t) }, 1.7);
    }

    const order = span(suite.furniture, sweep);
    for (const piece of suite.furniture) {
      const rest = piece.object.position.y;
      piece.object.scale.setScalar(0.0001);
      piece.object.position.y = rest + 0.7;
      const start = 0.85 + order(piece) * 1.15;
      timeline.to(piece.object.scale, { x: 1, y: 1, z: 1, duration: 0.7, ease: 'back.out(1.5)' }, start);
      timeline.to(piece.object.position, { y: rest, duration: 0.7, ease: 'power3.out' }, start);
    }
    return timeline;
  }

  private finishIntro() {
    this.intro.done = true;
    this.bake();
    this.setInteractive(true);
    // Catch up with wherever the page had scrolled to while the suite was assembling.
    this.applyState();
    if (this.chapter === 'verified') this.knock();
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    gsap.ticker.remove(this.tick);
    gsap.killTweensOf([this.plan, this.focus, this.orbit, this.intro]);
    this.tweens.forEach((tween) => tween.kill());
    this.suite.highlights.forEach((tint) => gsap.killTweensOf(tint.material));
    this.resizeObserver.disconnect();
    const { canvas } = this;
    canvas.removeEventListener('pointerdown', this.onPointerDown);
    canvas.removeEventListener('pointermove', this.onPointerMove);
    canvas.removeEventListener('pointerup', this.onPointerUp);
    canvas.removeEventListener('pointercancel', this.onPointerCancel);
    canvas.removeEventListener('pointerleave', this.onPointerLeave);
    window.removeEventListener('pointermove', this.onWindowPointerMove);
    canvas.removeEventListener('webglcontextlost', this.onContextLost);
    canvas.removeEventListener('webglcontextrestored', this.onContextRestored);
    this.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) object.geometry.dispose();
    });
    this.suite.highlights.forEach((tint) => tint.material.dispose());
    this.materials.dispose();
    this.environment.dispose();
    this.sun.shadow.dispose();
    disposeKit();
    this.renderer.dispose();
  }

  /* ---------- State: what is lit, which doors stand open ---------- */

  private applyState() {
    const state = CHAPTER_STATE[this.chapter];
    const duration = this.reducedMotion ? 0 : 0.6;
    for (const [id, tint] of this.suite.highlights) {
      let target = state.lit[id] ?? 0;
      if (this.focus.room === id) target = Math.max(target, 0.7);
      else if (this.hovered === id) target = Math.max(target, 0.62);
      if (target > 0) tint.visible = true;
      gsap.to(tint.material, {
        opacity: target,
        duration,
        ease: 'power2.out',
        overwrite: true,
        onUpdate: this.invalidate,
        onComplete: () => {
          if (target === 0) tint.visible = false;
        },
      });
    }

    const wanted = new Set<RoomId>(state.open);
    if (this.hovered) wanted.add(this.hovered);
    if (this.focus.room) wanted.add(this.focus.room);
    for (const [id, door] of this.suite.doors) {
      // The front door has its own moment in the last chapter.
      if (id === 'entry' && this.chapter === 'verified') continue;
      const open = door.rooms.some((room) => wanted.has(room));
      this.swing(door, open ? 1 : door.rest, 0.9);
    }
    for (const door of this.suite.pocketDoors) this.swing(door, wanted.has(door.room) ? 1 : 0.72, 0.8);
  }

  /** One running animation per door, so a new instruction replaces the old one. */
  private tweens = new Map<SuiteDoor | SuitePocketDoor, gsap.core.Animation>();

  private swing(door: SuiteDoor | SuitePocketDoor, to: number, duration: number) {
    if (!this.intro.done || door.t === to) return;
    this.tweens.get(door)?.kill();
    const state = { t: door.t };
    this.tweens.set(
      door,
      gsap.to(state, {
        t: to,
        duration: this.reducedMotion ? 0 : duration,
        ease: 'power3.out',
        onUpdate: () => {
          if ('pivot' in door) this.suite.setDoor(door, state.t);
          else this.suite.setPocketDoor(door, state.t);
          this.touchShadow();
        },
      }),
    );
  }

  /** Two raps on the front door, then it opens. */
  private knock() {
    const door = this.suite.doors.get('entry');
    if (!door || !this.intro.done) return;
    this.tweens.get(door)?.kill();
    if (this.reducedMotion) {
      this.suite.setDoor(door, 0.9);
      this.touchShadow();
      return;
    }
    const state = { t: door.t };
    const apply = () => {
      this.suite.setDoor(door, state.t);
      this.touchShadow();
    };
    const timeline = gsap.timeline({ delay: 0.55, onUpdate: apply });
    timeline
      .to(state, { t: 0, duration: 0.35, ease: 'power2.in' })
      .to(state, { t: 0.035, duration: 0.07, ease: 'power1.out' })
      .to(state, { t: 0, duration: 0.09, ease: 'power1.in' })
      .to(state, { t: 0.035, duration: 0.07, ease: 'power1.out' }, '+=0.09')
      .to(state, { t: 0, duration: 0.09, ease: 'power1.in' })
      .to(state, { t: 0.92, duration: 1.3, ease: 'power3.out' }, '+=0.3');
    this.tweens.set(door, timeline);
  }

  private touchShadow() {
    this.dirty = true;
    this.shadowDirty = true;
  }

  /** Let the hand-set layers (drag, plan toggle, focused room) ease back out. */
  private release() {
    if (this.focus.room) this.focusRoom(null);
    if (this.view === 'plan') this.setView('iso');
    if ((this.orbit.az !== 0 || this.orbit.pol !== 0) && !this.drag && !gsap.isTweening(this.orbit)) {
      // Unwind the short way round.
      this.orbit.az = THREE.MathUtils.euclideanModulo(this.orbit.az + 180, 360) - 180;
      gsap.to(this.orbit, { az: 0, pol: 0, vAz: 0, duration: 0.9, ease: 'power2.out', onUpdate: this.invalidate });
    }
  }

  /* ---------- After the intro: fold the furniture into a handful of meshes ---------- */

  private bake() {
    if (this.baked.length || this.disposed) return;
    const { suite } = this;
    suite.root.updateMatrixWorld(true);
    const inverse = suite.root.matrixWorld.clone().invert();
    const groups = new Map<string, { material: THREE.Material; cast: boolean; receive: boolean; parts: THREE.BufferGeometry[] }>();
    const matrix = new THREE.Matrix4();
    for (const piece of suite.furniture) {
      piece.object.traverse((object) => {
        if (!(object instanceof THREE.Mesh) || Array.isArray(object.material)) return;
        const material = object.material as THREE.Material;
        const key = `${material.uuid}:${object.castShadow}:${object.receiveShadow}`;
        let entry = groups.get(key);
        if (!entry) {
          entry = { material, cast: object.castShadow, receive: object.receiveShadow, parts: [] };
          groups.set(key, entry);
        }
        const source = object.geometry as THREE.BufferGeometry;
        const part = source.index ? source.toNonIndexed() : source.clone();
        matrix.multiplyMatrices(inverse, object.matrixWorld);
        part.applyMatrix4(matrix);
        entry.parts.push(part);
      });
    }
    for (const entry of groups.values()) {
      const merged = mergeGeometries(entry.parts);
      entry.parts.forEach((part) => part.dispose());
      if (!merged) continue;
      const mesh = new THREE.Mesh(merged, entry.material);
      mesh.castShadow = entry.cast;
      mesh.receiveShadow = entry.receive;
      this.baked.push(mesh);
      suite.root.add(mesh);
    }
    for (const piece of suite.furniture) {
      suite.root.remove(piece.object);
      piece.object.traverse((object) => {
        // Shared primitives stay in the kit's cache; only one-off geometry is freed here.
        if (object instanceof THREE.Mesh && !object.geometry.userData.cached) object.geometry.dispose();
      });
    }
    suite.furniture.length = 0;
    this.touchShadow();
  }

  /* ---------- Frame ---------- */

  private invalidate = () => {
    this.dirty = true;
  };

  private tick = (_time: number, deltaMs: number) => {
    if (this.disposed) return;
    const dt = Math.min(0.05, deltaMs / 1000);

    // Momentum after a drag.
    if (!this.drag && Math.abs(this.orbit.vAz) > 0.01) {
      this.orbit.az += this.orbit.vAz * dt;
      this.orbit.vAz *= Math.exp(-dt * 4.2);
      this.dirty = true;
    }

    // The pointer drift eases toward where the pointer is.
    const follow = 1 - Math.exp(-dt * 3.2);
    const dx = this.drift.tx - this.drift.x;
    const dy = this.drift.ty - this.drift.y;
    if (Math.abs(dx) > 0.0005 || Math.abs(dy) > 0.0005) {
      this.drift.x += dx * follow;
      this.drift.y += dy * follow;
      this.dirty = true;
    }

    this.updatePose();
    if (this.updateWalls(dt)) this.dirty = true;
    if (!this.dirty) return;
    this.dirty = false;
    this.draw();
  };

  private scripted(): Pose {
    const last = CHAPTERS.length - 1;
    const p = Math.min(last, Math.max(0, this.progress));
    const i = Math.min(last - 1, Math.floor(p));
    // Hold at each chapter, travel in the middle of the scroll between them.
    const t = travel(Math.min(1, Math.max(0, (p - i - 0.14) / 0.72)));
    return mixPose(POSES[CHAPTERS[i]!], POSES[CHAPTERS[i + 1]!], t);
  }

  /** The scripted pose with the plan toggle applied: what a focused room is measured against. */
  private basePose(): Pose {
    const pose = this.scripted();
    return this.plan.w > 0 ? mixPose(pose, PLAN_POSE, this.plan.w) : pose;
  }

  private updatePose() {
    let pose = this.basePose();
    if (this.focus.w > 0) pose = mixPose(pose, this.focus.pose, this.focus.w);

    // The flatter the view, the less there is to swing around.
    const steep = smoothstep(4, 26, pose.pol);
    const calm = 1 - this.focus.w * 0.6;
    const az = pose.az + this.orbit.az + this.intro.az - this.drift.x * 5 * steep * calm;
    const pol = THREE.MathUtils.clamp(pose.pol + (this.orbit.pol + this.drift.y * 2.4 * calm) * steep, 0.8, 64);
    const zoom = pose.zoom * this.intro.zoom;

    const c = this.current;
    if (c.x === pose.x && c.z === pose.z && c.az === az && c.pol === pol && c.zoom === zoom && c.shift === pose.shift) return;
    this.current = { x: pose.x, z: pose.z, az, pol, zoom, shift: pose.shift };
    this.dirty = true;
  }

  /** Outside walls that would stand between the camera and the rooms sink out of the way. */
  private updateWalls(dt: number) {
    const { az, pol } = this.current;
    const sx = Math.sin(deg(az));
    const sz = Math.cos(deg(az));
    const tilt = smoothstep(14, 30, pol);
    const facing = { n: -sz, s: sz, w: -sx, e: sx };
    const ease = 1 - Math.exp(-dt * 7);
    let moved = false;
    for (const side of ['n', 'e', 's', 'w'] as const) {
      const target = 1 - smoothstep(0.16, 0.52, facing[side]) * tilt * (1 - LOWERED);
      const now = this.sideScale[side];
      if (Math.abs(target - now) < 0.0008) continue;
      const next = this.intro.done ? now + (target - now) * ease : target;
      this.sideScale[side] = next;
      this.suite.sides[side].scale.y = next;
      moved = true;
    }
    if (moved) this.shadowDirty = true;
    return moved;
  }

  private draw() {
    const { camera, current, layout } = this;
    const az = deg(current.az);
    const pol = deg(current.pol);
    const reach = 70;
    camera.position.set(
      current.x + Math.sin(az) * Math.sin(pol) * reach,
      Math.cos(pol) * reach,
      current.z + Math.cos(az) * Math.sin(pol) * reach,
    );
    camera.lookAt(current.x, 0, current.z);

    const aspect = this.width / this.height;
    const size = Math.max(FIT.h / layout.fitH, FIT.w / (layout.fitW * aspect)) / current.zoom;
    const halfH = size / 2;
    const halfW = halfH * aspect;
    // Sliding the frustum is how the model is placed off-centre without turning the camera.
    const fx = (layout.cx + layout.shiftX * current.shift) * 2 * halfW;
    const fy = layout.cy * 2 * halfH;
    camera.left = -halfW - fx;
    camera.right = halfW - fx;
    camera.top = halfH - fy;
    camera.bottom = -halfH - fy;
    camera.updateProjectionMatrix();

    // The sun rides round with the camera so the light always comes over the viewer's left shoulder.
    if (Math.abs(current.az - this.shadowAz) > 0.05) {
      this.shadowAz = current.az;
      const sunAz = az - deg(72);
      const sunEl = deg(54);
      this.sun.position.set(Math.sin(sunAz) * Math.cos(sunEl) * 34, Math.sin(sunEl) * 34, 1.4 + Math.cos(sunAz) * Math.cos(sunEl) * 34);
      this.shadowDirty = true;
    }
    if (this.shadowDirty) {
      this.renderer.shadowMap.needsUpdate = true;
      this.shadowDirty = false;
    }

    this.renderer.render(this.scene, camera);
    this.placeAnchors();
  }

  private projected = new THREE.Vector3();

  private placeAnchors() {
    if (!this.anchors.size) return;
    for (const [id, element] of this.anchors) {
      const point = this.anchorPoints.get(id);
      if (!point) continue;
      this.projected.copy(point).project(this.camera);
      const x = (this.projected.x * 0.5 + 0.5) * this.width;
      const y = (-this.projected.y * 0.5 + 0.5) * this.height;
      element.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
    }
  }

  private resize() {
    const width = this.canvas.clientWidth;
    const height = this.canvas.clientHeight;
    if (!width || !height) return;
    this.width = width;
    this.height = height;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setSize(width, height, false);
    this.dirty = true;
  }

  /* ---------- Pointer ---------- */

  /** The room under a point on the canvas, found by dropping a ray to the floor. */
  private roomUnder(clientX: number, clientY: number): RoomId | null {
    const rect = this.canvas.getBoundingClientRect();
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -(((clientY - rect.top) / rect.height) * 2 - 1);
    const origin = new THREE.Vector3(ndcX, ndcY, -1).unproject(this.camera);
    const direction = this.camera.getWorldDirection(new THREE.Vector3());
    if (Math.abs(direction.y) < 1e-5) return null;
    const t = -origin.y / direction.y;
    const x = origin.x + direction.x * t;
    const z = origin.z + direction.z * t;
    return roomAt(x * PX_PER_M + ORIGIN.x, z * PX_PER_M + ORIGIN.y);
  }

  private setHovered(room: RoomId | null) {
    if (room === this.hovered) return;
    this.hovered = room;
    this.applyState();
    this.events.onHover?.(room);
    if (this.interactive && !this.drag) this.canvas.style.cursor = room ? 'pointer' : 'grab';
  }

  private onPointerDown = (event: PointerEvent) => {
    if (!this.interactive || event.button !== 0) return;
    this.drag = { id: event.pointerId, x: event.clientX, y: event.clientY, moved: 0, touch: event.pointerType === 'touch' };
    this.orbit.vAz = 0;
    gsap.killTweensOf(this.orbit);
    this.canvas.setPointerCapture(event.pointerId);
  };

  private onPointerMove = (event: PointerEvent) => {
    if (!this.interactive) return;
    const drag = this.drag;
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x;
      const dy = event.clientY - drag.y;
      drag.x = event.clientX;
      drag.y = event.clientY;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      if (drag.moved > 6) {
        if (drag.moved - Math.abs(dx) - Math.abs(dy) <= 6) {
          this.canvas.style.cursor = 'grabbing';
          this.setHovered(null);
          this.events.onDragStart?.();
        }
        // Grab the model and it follows the hand: the camera goes the other way.
        this.orbit.az -= dx * 0.32;
        this.orbit.vAz = -dx * 0.32 * 40;
        // A finger moving up or down is scrolling the page, not tilting the model.
        if (!drag.touch) this.orbit.pol = THREE.MathUtils.clamp(this.orbit.pol - dy * 0.14, -30, 22);
        this.dirty = true;
      }
      return;
    }
    if (event.pointerType === 'mouse') this.setHovered(this.roomUnder(event.clientX, event.clientY));
  };

  private onPointerUp = (event: PointerEvent) => {
    const drag = this.drag;
    if (!drag || drag.id !== event.pointerId) return;
    this.drag = null;
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId);
    if (drag.moved <= 6) {
      this.orbit.vAz = 0;
      const room = this.roomUnder(event.clientX, event.clientY);
      this.focusRoom(room && room !== this.focus.room ? room : null);
    }
    this.canvas.style.cursor = this.hovered ? 'pointer' : 'grab';
  };

  private onPointerCancel = (event: PointerEvent) => {
    if (this.drag?.id === event.pointerId) this.drag = null;
    this.canvas.style.cursor = this.interactive ? 'grab' : '';
  };

  private onPointerLeave = () => {
    if (!this.drag) this.setHovered(null);
  };

  private onWindowPointerMove = (event: PointerEvent) => {
    if (!this.finePointer || this.reducedMotion || event.pointerType !== 'mouse' || this.drag) return;
    this.drift.tx = (event.clientX / window.innerWidth) * 2 - 1;
    this.drift.ty = (event.clientY / window.innerHeight) * 2 - 1;
  };

  private onContextLost = (event: Event) => {
    event.preventDefault();
  };

  private onContextRestored = () => {
    this.touchShadow();
  };
}
