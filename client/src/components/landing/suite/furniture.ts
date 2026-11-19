import * as THREE from 'three';
import { WALL_H } from './plan';
import { ball, box, cyl, rbox, seeded, tiledPanel, torus, SUBWAY_TILE, type Mat, type Mats } from './kit';

/*
  Everything that stands in the suite. Each builder returns a group whose origin is on the floor at
  the centre of its footprint, built facing +Z (its "front"); placing and turning it is the
  caller's job. Sizes are metres.
*/

const group = () => new THREE.Group();

export function createFurniture(m: Mats) {
  const random = seeded(2027);
  const pick = <T>(list: readonly T[]) => list[Math.floor(random() * list.length)]!;

  /* ---------- Small things that sit on other things ---------- */

  function books(count: number, mats: readonly Mat[] = [m.lavenderDeep, m.paper, m.peachDeep, m.skyDeep, m.mintDeep]) {
    const o = group();
    let y = 0;
    for (let i = 0; i < count; i++) {
      const h = 0.022 + random() * 0.014;
      const b = box(0.2 - random() * 0.04, h, 0.14 - random() * 0.02, mats[i % mats.length]!, 0, y, 0);
      b.rotation.y = (random() - 0.5) * 0.35;
      o.add(b);
      y += h;
    }
    return o;
  }

  function mug(mat: Mat) {
    const o = group();
    o.add(cyl(0.035, 0.03, 0.075, mat, 0, 0, 0, 16));
    const handle = torus(0.022, 0.006, mat, Math.PI);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.035, 0.04, 0);
    o.add(handle);
    return o;
  }

  function tableLamp() {
    const o = group();
    o.add(cyl(0.05, 0.055, 0.015, m.black));
    o.add(cyl(0.007, 0.007, 0.2, m.brass, 0, 0.015, 0, 8));
    o.add(cyl(0.065, 0.1, 0.13, m.glow, 0, 0.19, 0));
    return o;
  }

  function deskLamp() {
    const o = group();
    o.add(cyl(0.06, 0.065, 0.014, m.black));
    const lower = cyl(0.007, 0.007, 0.26, m.black, 0, 0.014, 0, 8);
    lower.rotation.z = 0.35;
    o.add(lower);
    const upper = cyl(0.007, 0.007, 0.22, m.black, -0.09, 0.255, 0, 8);
    upper.rotation.z = -1.0;
    o.add(upper);
    const head = cyl(0.03, 0.06, 0.07, m.black, 0.1, 0.33, 0, 16);
    head.rotation.z = 0.5;
    o.add(head);
    const bulb = cyl(0.045, 0.045, 0.006, m.glow, 0.115, 0.322, 0, 16);
    bulb.rotation.z = 0.5;
    bulb.castShadow = false;
    o.add(bulb);
    return o;
  }

  function laptop(open = 1.85) {
    const o = group();
    o.add(box(0.31, 0.012, 0.21, m.steel));
    const lid = group();
    lid.position.set(0, 0.012, -0.105);
    lid.rotation.x = -open + Math.PI / 2;
    lid.add(box(0.31, 0.2, 0.008, m.steel, 0, 0, -0.004));
    const display = box(0.29, 0.18, 0.002, m.screen, 0, 0.01, 0.001);
    display.castShadow = false;
    lid.add(display);
    o.add(lid);
    return o;
  }

  function monitor() {
    const o = group();
    o.add(box(0.2, 0.012, 0.14, m.black));
    o.add(box(0.03, 0.14, 0.02, m.black, 0, 0.012, -0.02));
    o.add(box(0.56, 0.33, 0.018, m.black, 0, 0.12, 0));
    const display = box(0.535, 0.305, 0.002, m.screen, 0, 0.1325, 0.0095);
    display.castShadow = false;
    o.add(display);
    return o;
  }

  function vase(mat: Mat, bloom: Mat) {
    const o = group();
    o.add(cyl(0.035, 0.05, 0.16, mat, 0, 0, 0, 16));
    for (let i = 0; i < 5; i++) {
      const length = 0.2 + random() * 0.1;
      const stem = cyl(0.003, 0.003, length, m.leafDark, 0, 0.14, 0, 5);
      stem.rotation.set((random() - 0.5) * 0.7, random() * 6, (random() - 0.5) * 0.7);
      o.add(stem);
      const tip = new THREE.Vector3(0, length, 0).applyEuler(stem.rotation);
      o.add(ball(0.022 + random() * 0.012, bloom, tip.x, 0.14 + tip.y, tip.z));
    }
    return o;
  }

  /* ---------- Plants ---------- */

  function pot(radius: number, height: number, mat: Mat) {
    const o = group();
    o.add(cyl(radius, radius * 0.78, height, mat));
    o.add(cyl(radius * 0.9, radius * 0.9, 0.012, m.soil, 0, height - 0.01, 0));
    return o;
  }

  /** A fiddle-leaf fig: a thin trunk with broad leaves spiralling up it. */
  function fig(height = 1.25, potMat: Mat = m.white) {
    const o = pot(0.17, 0.3, potMat);
    o.add(cyl(0.014, 0.02, height - 0.35, m.walnut, 0, 0.28, 0, 8));
    const leaves = Math.round(height * 13);
    for (let i = 0; i < leaves; i++) {
      const holder = group();
      const t = i / leaves;
      holder.position.y = 0.55 + t * (height - 0.55);
      holder.rotation.y = i * 2.4;
      const leaf = ball(1, i % 3 ? m.leaf : m.leafDark, 0.13 + (1 - t) * 0.07, 0, 0);
      leaf.scale.set(0.15 - t * 0.04, 0.012, 0.09 - t * 0.02);
      leaf.rotation.z = 0.25 + t * 0.6;
      holder.add(leaf);
      o.add(holder);
    }
    return o;
  }

  /** A snake plant: stiff upright blades. */
  function snakePlant(potMat: Mat = m.terracotta) {
    const o = pot(0.12, 0.2, potMat);
    for (let i = 0; i < 8; i++) {
      const h = 0.35 + random() * 0.3;
      const blade = cyl(0.004, 0.035, h, i % 2 ? m.leaf : m.leafDark, 0, 0.19, 0, 5);
      blade.scale.z = 0.35;
      blade.rotation.set((random() - 0.5) * 0.4, i * 0.9, (random() - 0.5) * 0.4);
      blade.position.x = (random() - 0.5) * 0.08;
      blade.position.z = (random() - 0.5) * 0.08;
      o.add(blade);
    }
    return o;
  }

  /** A small leafy pot for a shelf or a sill. */
  function herb(potMat: Mat = m.white, size = 1) {
    const o = pot(0.06 * size, 0.09 * size, potMat);
    for (let i = 0; i < 6; i++) {
      const a = i * 1.1;
      const b = ball(0.045 * size, i % 2 ? m.leaf : m.leafDark, Math.cos(a) * 0.035 * size, (0.12 + random() * 0.05) * size, Math.sin(a) * 0.035 * size);
      b.scale.y = 0.8;
      o.add(b);
    }
    return o;
  }

  /* ---------- Bedrooms ---------- */

  /** Width across X, length along Z, headboard at −Z. */
  function bed(w: number, l: number, duvet: Mat, accent: Mat) {
    const o = group();
    o.add(box(w - 0.16, 0.07, l - 0.16, m.gap));
    o.add(box(w + 0.06, 0.2, l + 0.04, m.oak, 0, 0.07, 0));
    o.add(rbox(w + 0.06, 0.9, 0.07, 0.02, m.oak, 0, 0, -l / 2 - 0.015));
    o.add(rbox(w - 0.1, 0.34, 0.05, 0.022, accent, 0, 0.5, -l / 2 + 0.04));
    o.add(rbox(w - 0.02, 0.2, l - 0.04, 0.06, m.linen, 0, 0.27, 0.01));
    const dl = l * 0.66;
    o.add(rbox(w + 0.03, 0.1, dl, 0.045, duvet, 0, 0.41, l / 2 - dl / 2 + 0.01));
    o.add(rbox(w + 0.03, 0.06, 0.2, 0.028, m.linen, 0, 0.462, l / 2 - dl + 0.08));
    for (const side of [-1, 1]) {
      const p = rbox(w / 2 - 0.09, 0.12, 0.38, 0.055, m.pillow, side * (w / 4 - 0.005), 0.455, -l / 2 + 0.28);
      p.rotation.set(-0.14, side * 0.06, 0);
      o.add(p);
    }
    const cushion = rbox(0.34, 0.3, 0.1, 0.045, accent, w * 0.12, 0.5, -l / 2 + 0.52);
    cushion.rotation.set(-0.55, 0.3, 0);
    o.add(cushion);
    o.add(rbox(w + 0.05, 0.03, 0.42, 0.014, accent, 0, 0.502, l / 2 - 0.36));
    return o;
  }

  function nightstand(w: number, d: number, top: 'lamp' | 'plant' | 'books') {
    const o = group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add(cyl(0.012, 0.01, 0.08, m.black, sx * (w / 2 - 0.03), 0, sz * (d / 2 - 0.03), 8));
    o.add(box(w, 0.38, d, m.oak, 0, 0.08, 0));
    o.add(box(w - 0.03, 0.006, 0.006, m.gap, 0, 0.27, d / 2));
    o.add(cyl(0.012, 0.012, 0.012, m.brass, 0, 0.345, d / 2 + 0.006, 10));
    const y = 0.46;
    if (top === 'lamp') {
      const lamp = tableLamp();
      lamp.position.set(-w * 0.12, y, -d * 0.12);
      o.add(lamp);
    } else if (top === 'plant') {
      const plant = herb(m.terracotta, 1.2);
      plant.position.y = y;
      o.add(plant);
    } else {
      const stack = books(3);
      stack.position.y = y;
      o.add(stack);
      const cup = mug(m.peach);
      cup.position.set(0.02, y + 0.08, 0.02);
      o.add(cup);
    }
    return o;
  }

  /** Width across X, depth along Z, the sitter on the +Z side. */
  function desk(w: number, d: number, kit: 'laptop' | 'monitor' | 'study') {
    const o = group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add(box(0.03, 0.71, 0.03, m.black, sx * (w / 2 - 0.045), 0, sz * (d / 2 - 0.045)));
    o.add(box(w - 0.12, 0.1, 0.018, m.oak, 0, 0.6, -d / 2 + 0.05));
    o.add(box(w, 0.035, d, m.oak, 0, 0.71, 0));
    const y = 0.745;
    const put = (thing: THREE.Object3D, x: number, z: number, turn = 0) => {
      thing.position.set(x, y, z);
      thing.rotation.y = turn;
      o.add(thing);
    };
    if (kit === 'laptop') {
      put(laptop(), -0.06, 0.02, 0.08);
      put(deskLamp(), w / 2 - 0.12, -d / 2 + 0.12, 2.6);
      put(mug(m.lavender), -w / 2 + 0.12, 0.08);
    } else if (kit === 'monitor') {
      put(monitor(), 0, -d / 2 + 0.14);
      put(box(0.36, 0.012, 0.12, m.white), 0, 0.1);
      put(herb(m.white), w / 2 - 0.1, -d / 2 + 0.1);
      put(mug(m.mint), -w / 2 + 0.1, 0.06);
    } else {
      put(books(4), -w / 2 + 0.16, -0.02, 0.2);
      put(laptop(1.7), 0.1, 0.02, -0.1);
      put(deskLamp(), -w / 2 + 0.13, -d / 2 + 0.1, 0.5);
    }
    return o;
  }

  /** Faces +Z: whoever sits in it looks that way. */
  function chair(shell: Mat, legs: Mat = m.oak) {
    const o = group();
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const leg = cyl(0.014, 0.01, 0.43, legs, sx * 0.17, 0, sz * 0.16, 8);
        leg.rotation.set(sz * 0.07, 0, -sx * 0.07);
        o.add(leg);
      }
    }
    o.add(rbox(0.43, 0.045, 0.41, 0.02, shell, 0, 0.42, 0));
    const back = rbox(0.41, 0.3, 0.035, 0.016, shell, 0, 0.5, -0.2);
    back.rotation.x = -0.13;
    o.add(back);
    return o;
  }

  /** A run of drawers, front on +Z. */
  function drawers(w: number, d: number, h: number, rows: number, body: Mat = m.white) {
    const o = group();
    o.add(box(w - 0.04, 0.05, d - 0.06, m.gap));
    o.add(box(w, h - 0.05, d, body, 0, 0.05, 0));
    for (let i = 1; i < rows; i++) o.add(box(w - 0.02, 0.006, 0.006, m.gap, 0, 0.05 + ((h - 0.05) * i) / rows, d / 2));
    for (let i = 0; i < rows; i++) {
      o.add(box(0.12, 0.01, 0.014, m.brass, 0, 0.05 + ((h - 0.05) * (i + 0.5)) / rows, d / 2 + 0.004));
    }
    return o;
  }

  /** A clothes rail along X with things hanging from it. */
  function hangingRail(length: number, clothes: readonly Mat[]) {
    const o = group();
    const rail = cyl(0.011, 0.011, length, m.black, 0, 0, 0, 8);
    rail.rotation.z = Math.PI / 2;
    rail.position.set(length / 2, 1.04, 0);
    o.add(rail);
    const count = Math.floor((length - 0.1) / 0.075);
    for (let i = 0; i < count; i++) {
      const drop = 0.42 + random() * 0.3;
      const garment = rbox(0.04, drop, 0.36 + random() * 0.06, 0.018, pick(clothes), -length / 2 + 0.08 + i * 0.075, 1.02 - drop, 0);
      garment.rotation.y = (random() - 0.5) * 0.22;
      o.add(garment);
    }
    return o;
  }

  /**
   * A built-in closet, open at the top so you can see what is hanging in it. Width across X,
   * depth along Z, doors on +Z: one leaf shut, one standing open.
   */
  function closet(w: number, d: number, clothes: readonly Mat[]) {
    const o = group();
    const h = WALL_H - 0.02;
    o.add(box(w, 0.04, d, m.white));
    o.add(box(w, h, 0.02, m.white, 0, 0, -d / 2 + 0.01));
    for (const side of [-1, 1]) o.add(box(0.02, h, d, m.white, side * (w / 2 - 0.01), 0, 0));
    const rail = hangingRail(w - 0.04, clothes);
    rail.position.z = -0.04;
    o.add(rail);
    o.add(rbox(0.3, 0.12, 0.2, 0.015, m.kraft, -w / 2 + 0.2, 0.04, -0.05));
    o.add(rbox(0.26, 0.1, 0.18, 0.015, m.paper, -w / 2 + 0.21, 0.16, -0.05));
    const leaf = w / 2 - 0.012;
    o.add(box(leaf, h, 0.024, m.door, -w / 4, 0, d / 2 - 0.012));
    const swing = group();
    swing.position.set(w / 2 - 0.012, 0, d / 2 - 0.012);
    swing.rotation.y = 0.95;
    swing.add(box(leaf, h, 0.024, m.door, -leaf / 2, 0, 0));
    swing.add(cyl(0.01, 0.01, 0.02, m.black, -leaf + 0.04, 0.95, 0.02, 8));
    o.add(swing);
    return o;
  }

  /** A shallow bookcase against a wall, front on +Z. */
  function bookcase(w: number, d: number) {
    const o = group();
    const h = 1.05;
    o.add(box(w, h, 0.016, m.oak, 0, 0, -d / 2 + 0.008));
    for (const side of [-1, 1]) o.add(box(0.018, h, d, m.oak, side * (w / 2 - 0.009), 0, 0));
    const spines = [m.lavenderDeep, m.paper, m.peachDeep, m.skyDeep, m.mintDeep, m.butterDeep, m.purple, m.white];
    for (let shelf = 0; shelf < 4; shelf++) {
      const y = 0.02 + shelf * 0.26;
      o.add(box(w - 0.03, 0.018, d, m.oak, 0, y, 0));
      let x = -w / 2 + 0.05;
      const limit = w / 2 - (shelf % 2 ? 0.22 : 0.06);
      while (x < limit) {
        const t = 0.022 + random() * 0.022;
        const spine = box(t, 0.15 + random() * 0.07, d - 0.05, pick(spines), x, y + 0.018, 0.01);
        o.add(spine);
        x += t + 0.004;
      }
      if (shelf % 2) {
        const plant = herb(shelf === 1 ? m.terracotta : m.white, 0.9);
        plant.position.set(w / 2 - 0.12, y + 0.018, 0);
        o.add(plant);
      }
    }
    o.add(box(w, 0.018, d, m.oak, 0, h, 0));
    return o;
  }

  function floatingShelf(w: number) {
    const o = group();
    o.add(box(w, 0.03, 0.2, m.oak, 0, 0.78, 0));
    const stack = books(3);
    stack.position.set(-w / 2 + 0.16, 0.81, 0);
    o.add(stack);
    const plant = herb(m.white, 1.1);
    plant.position.set(w / 2 - 0.14, 0.81, 0);
    o.add(plant);
    const frame = box(0.2, 0.26, 0.016, m.black, 0.02, 0.81, -0.06);
    frame.rotation.x = -0.12;
    o.add(frame);
    const print = box(0.16, 0.22, 0.004, m.peach, 0.02, 0.83, -0.05);
    print.rotation.x = -0.12;
    print.castShadow = false;
    o.add(print);
    return o;
  }

  function roundRug(radius: number, mat: Mat) {
    const rug = cyl(radius, radius, 0.014, mat, 0, 0.002, 0, 48);
    rug.castShadow = false;
    return rug;
  }

  function rug(w: number, d: number, mat: Mat) {
    const out = rbox(w, 0.016, d, 0.007, mat, 0, 0.002, 0);
    out.castShadow = false;
    return out;
  }

  function backpack(mat: Mat) {
    const o = group();
    o.add(rbox(0.3, 0.42, 0.17, 0.06, mat));
    o.add(rbox(0.22, 0.16, 0.05, 0.02, mat, 0, 0.06, 0.1));
    o.add(box(0.2, 0.008, 0.005, m.gap, 0, 0.3, 0.086));
    return o;
  }

  function laundryBasket() {
    const o = group();
    o.add(cyl(0.2, 0.16, 0.36, m.jute));
    o.add(ball(0.13, m.sky, 0.03, 0.37, 0));
    o.add(ball(0.11, m.linen, -0.07, 0.36, 0.04));
    o.add(ball(0.1, m.peach, 0.01, 0.38, -0.08));
    return o;
  }

  /* ---------- Living room ---------- */

  /** Width across X, depth along Z, back at −Z. */
  function sofa(w: number, d: number, fabric: Mat, cushions: readonly Mat[]) {
    const o = group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add(cyl(0.022, 0.016, 0.1, m.oak, sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08), 10));
    o.add(rbox(w, 0.2, d, 0.04, fabric, 0, 0.1, 0));
    const arm = 0.15;
    for (const side of [-1, 1]) o.add(rbox(arm, 0.5, d, 0.055, fabric, side * (w / 2 - arm / 2), 0.1, 0));
    o.add(rbox(w - arm * 2 + 0.02, 0.56, 0.17, 0.06, fabric, 0, 0.1, -d / 2 + 0.085));
    const seats = w > 1.2 ? 2 : 1;
    const seatW = (w - arm * 2) / seats;
    for (let i = 0; i < seats; i++) {
      const x = -(w - arm * 2) / 2 + seatW * (i + 0.5);
      o.add(rbox(seatW - 0.012, 0.14, d - 0.19, 0.05, fabric, x, 0.29, 0.085));
      const back = rbox(seatW - 0.03, 0.3, 0.13, 0.055, fabric, x, 0.42, -d / 2 + 0.24);
      back.rotation.x = -0.2;
      o.add(back);
    }
    cushions.forEach((mat, i) => {
      const side = i % 2 ? 1 : -1;
      const c = rbox(0.32, 0.32, 0.1, 0.045, mat, side * ((w - arm * 2) / 2 - 0.16 - Math.floor(i / 2) * 0.16), 0.43, -d / 2 + 0.36 + Math.floor(i / 2) * 0.06);
      c.rotation.set(-0.42, side * 0.35, 0);
      o.add(c);
    });
    return o;
  }

  function coffeeTable(w: number, d: number) {
    const o = group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add(cyl(0.012, 0.012, 0.34, m.black, sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05), 8));
    o.add(rbox(w - 0.08, 0.018, d - 0.08, 0.008, m.oak, 0, 0.12, 0));
    o.add(rbox(w, 0.04, d, 0.018, m.oak, 0, 0.34, 0));
    const stack = books(3, [m.paper, m.lavenderDeep, m.peachDeep]);
    stack.position.set(0.04, 0.38, d * 0.22);
    stack.rotation.y = 0.3;
    o.add(stack);
    const flowers = vase(m.ceramic, m.lavender);
    flowers.position.set(-0.04, 0.38, -d * 0.2);
    o.add(flowers);
    const magazines = books(2, [m.sky, m.butter]);
    magazines.position.set(0, 0.138, 0);
    o.add(magazines);
    return o;
  }

  /** A low cabinet with a television standing on it; back at −Z. */
  function tvConsole(w: number, d: number) {
    const o = group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add(cyl(0.014, 0.01, 0.12, m.black, sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.04), 8));
    o.add(box(w, 0.36, d, m.oak, 0, 0.12, 0));
    for (let i = 1; i < 3; i++) o.add(box(0.006, 0.33, 0.006, m.gap, -w / 2 + (w * i) / 3, 0.135, d / 2));
    o.add(box(0.26, 0.012, 0.16, m.black, 0, 0.48, 0));
    o.add(box(0.04, 0.05, 0.03, m.black, 0, 0.49, -0.02));
    o.add(box(w * 0.86, 0.6, 0.028, m.blackGlass, 0, 0.53, -0.02));
    const plant = herb(m.white, 1.3);
    plant.position.set(w / 2 - 0.09, 0.48, 0.02);
    o.add(plant);
    o.add(cyl(0.045, 0.045, 0.13, m.sofa, -w / 2 + 0.09, 0.48, 0.02, 20));
    return o;
  }

  function floorLamp() {
    const o = group();
    o.add(cyl(0.14, 0.15, 0.02, m.black));
    o.add(cyl(0.011, 0.011, 1.36, m.brass, 0, 0.02, 0, 10));
    const globe = ball(0.14, m.glow, 0, 1.5, 0);
    globe.castShadow = false;
    o.add(globe);
    return o;
  }

  function sideTable() {
    const o = group();
    o.add(cyl(0.16, 0.17, 0.016, m.black));
    o.add(cyl(0.012, 0.012, 0.44, m.black, 0, 0.016, 0, 8));
    o.add(cyl(0.2, 0.2, 0.02, m.stone, 0, 0.45, 0, 32));
    const cup = mug(m.butter);
    cup.position.set(0.04, 0.47, 0.02);
    o.add(cup);
    return o;
  }

  /** A framed print to hang on a wall; the wall is behind it at −Z. */
  function frame(w: number, h: number, print: Mat, y = 0.62) {
    const o = group();
    o.add(box(w, h, 0.02, m.black, 0, y, 0.01));
    const paper = box(w - 0.05, h - 0.05, 0.004, m.paper, 0, y + 0.025, 0.021);
    paper.castShadow = false;
    o.add(paper);
    const art = box(w - 0.14, h - 0.16, 0.004, print, 0, y + 0.08, 0.023);
    art.castShadow = false;
    o.add(art);
    return o;
  }

  /** A felt pennant in Western purple. */
  function pennant() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.14);
    shape.lineTo(0.5, 0);
    shape.lineTo(0, -0.14);
    shape.closePath();
    const out = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.008, bevelEnabled: false }), m.purple);
    out.castShadow = true;
    const o = group();
    out.position.set(-0.25, 0.88, 0.006);
    o.add(out);
    o.add(box(0.03, 0.3, 0.012, m.white, -0.25, 0.73, 0.004));
    return o;
  }

  /* ---------- Dining ---------- */

  function diningTable(radius: number) {
    const o = group();
    o.add(cyl(0.3, 0.32, 0.025, m.black, 0, 0, 0, 40));
    o.add(cyl(0.045, 0.06, 0.69, m.black, 0, 0.025, 0, 16));
    o.add(cyl(radius, radius, 0.035, m.white, 0, 0.715, 0, 56));
    const y = 0.75;
    o.add(cyl(0.15, 0.09, 0.07, m.ceramic, 0.02, y, -0.04, 32));
    o.add(ball(0.045, m.peachDeep, 0.06, y + 0.09, -0.02));
    o.add(ball(0.045, m.butterDeep, -0.03, y + 0.09, -0.07));
    o.add(ball(0.042, m.butterDeep, 0.0, y + 0.1, 0.03));
    const cup = mug(m.sky);
    cup.position.set(-0.26, y, 0.16);
    o.add(cup);
    const book = books(2, [m.lavenderDeep, m.paper]);
    book.position.set(0.24, y, 0.2);
    book.rotation.y = 0.6;
    o.add(book);
    return o;
  }

  function stool() {
    const o = group();
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
      const leg = cyl(0.012, 0.012, 0.64, m.black, Math.cos(a) * 0.15, 0, Math.sin(a) * 0.15, 8);
      leg.rotation.set(Math.sin(a) * 0.1, 0, -Math.cos(a) * 0.1);
      o.add(leg);
    }
    const ring = torus(0.16, 0.008, m.black);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.24;
    o.add(ring);
    o.add(cyl(0.17, 0.16, 0.04, m.oak, 0, 0.63, 0, 32));
    return o;
  }

  /* ---------- Kitchen ---------- */

  /** Base cabinets under a stone top. Width across X, depth along Z, fronts on +Z. */
  function counter(w: number, d: number, options: { fronts?: boolean; overhang?: number } = {}) {
    const { fronts = true, overhang = 0 } = options;
    const o = group();
    o.add(box(w, 0.1, d - 0.08, m.gap, 0, 0, -0.03));
    o.add(box(w, 0.76, d - 0.02, m.cabinet, 0, 0.1, -0.01));
    o.add(box(w + 0.012, 0.04, d + 0.02 + overhang, m.stone, 0, 0.86, -overhang / 2));
    if (fronts) {
      const n = Math.max(1, Math.round(w / 0.48));
      for (let i = 1; i < n; i++) o.add(box(0.006, 0.74, 0.006, m.gap, -w / 2 + (w * i) / n, 0.11, d / 2 - 0.02));
      for (let i = 0; i < n; i++) o.add(box(0.14, 0.012, 0.016, m.brass, -w / 2 + (w * (i + 0.5)) / n, 0.79, d / 2 - 0.012));
    }
    return o;
  }

  /** A double-bowl sink and its tap, to sit on a counter (y = 0.9). */
  function sink() {
    const o = group();
    o.add(box(0.74, 0.008, 0.42, m.steel));
    for (const side of [-1, 1]) {
      const bowl = box(0.33, 0.004, 0.34, m.steelDark, side * 0.18, 0.008, 0.01);
      bowl.castShadow = false;
      o.add(bowl);
      o.add(cyl(0.022, 0.022, 0.003, m.black, side * 0.18, 0.012, 0.01, 12));
    }
    o.add(cyl(0.014, 0.014, 0.24, m.chrome, 0, 0.008, -0.17, 12));
    const neck = torus(0.07, 0.012, m.chrome, Math.PI);
    neck.rotation.y = Math.PI / 2;
    neck.position.set(0, 0.248, -0.1);
    o.add(neck);
    o.add(cyl(0.012, 0.012, 0.05, m.chrome, 0, 0.2, -0.03, 12));
    return o;
  }

  /** A freestanding range, front on +Z. */
  function range(w: number, d: number) {
    const o = group();
    o.add(box(w, 0.9, d - 0.02, m.steel, 0, 0, -0.01));
    o.add(box(w, 0.012, d, m.blackGlass, 0, 0.9, 0));
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        const big = sx === sz;
        o.add(cyl(big ? 0.09 : 0.07, big ? 0.09 : 0.07, 0.006, m.gap, sx * w * 0.24, 0.912, sz * d * 0.22, 28));
        const ring = torus(big ? 0.06 : 0.045, 0.004, m.steelDark);
        ring.rotation.x = Math.PI / 2;
        ring.position.set(sx * w * 0.24, 0.919, sz * d * 0.22);
        ring.castShadow = false;
        o.add(ring);
      }
    }
    o.add(box(w - 0.1, 0.36, 0.008, m.blackGlass, 0, 0.26, d / 2 - 0.01));
    const handle = cyl(0.011, 0.011, w - 0.12, m.chrome, 0, 0, 0, 10);
    handle.rotation.z = Math.PI / 2;
    handle.position.set((w - 0.12) / 2, 0.7, d / 2 + 0.03);
    o.add(handle);
    for (let i = 0; i < 5; i++) {
      const knob = cyl(0.018, 0.018, 0.02, m.black, -w / 2 + 0.1 + (i * (w - 0.2)) / 4, 0.8, d / 2 - 0.006, 12);
      knob.rotation.x = Math.PI / 2;
      o.add(knob);
    }
    // A pot left on the back burner.
    o.add(cyl(0.1, 0.1, 0.1, m.peachDeep, -w * 0.24, 0.92, -d * 0.22, 28));
    o.add(cyl(0.105, 0.105, 0.012, m.peachDeep, -w * 0.24, 1.02, -d * 0.22, 28));
    o.add(cyl(0.016, 0.016, 0.025, m.black, -w * 0.24, 1.03, -d * 0.22, 10));
    return o;
  }

  function fridge(w: number, d: number) {
    const o = group();
    const h = 1.76;
    o.add(rbox(w, h, d - 0.03, 0.018, m.steel, 0, 0, -0.015));
    o.add(box(w - 0.01, 0.008, 0.01, m.gap, 0, 0.62, d / 2 - 0.03));
    o.add(box(0.022, 0.44, 0.034, m.steelDark, -w / 2 + 0.07, 0.72, d / 2 - 0.02));
    o.add(box(0.022, 0.3, 0.034, m.steelDark, -w / 2 + 0.07, 0.24, d / 2 - 0.02));
    // What ends up on every student fridge.
    const notes: [number, number, Mat][] = [
      [0.12, 1.3, m.butter],
      [0.2, 1.42, m.sky],
      [0.02, 1.48, m.peach],
      [0.14, 1.12, m.paper],
    ];
    for (const [x, y, mat] of notes) {
      const note = box(0.07, 0.08, 0.004, mat, x, y, d / 2 - 0.03);
      note.castShadow = false;
      note.rotation.z = (random() - 0.5) * 0.25;
      o.add(note);
    }
    const plant = herb(m.terracotta, 1.3);
    plant.position.set(0.1, h, -0.1);
    o.add(plant);
    return o;
  }

  /** A tall cabinet with one long door, front on +Z. */
  function pantry(w: number, d: number) {
    const o = group();
    const h = WALL_H + 0.5;
    o.add(box(w, h, d, m.cabinet));
    o.add(box(0.006, h - 0.04, 0.006, m.gap, 0, 0.02, d / 2));
    for (const side of [-1, 1]) o.add(box(0.014, 0.5, 0.018, m.brass, side * 0.035, 0.75, d / 2 + 0.004));
    return o;
  }

  function kettle() {
    const o = group();
    o.add(cyl(0.065, 0.085, 0.16, m.steel, 0, 0, 0, 24));
    o.add(cyl(0.03, 0.065, 0.03, m.steel, 0, 0.16, 0, 24));
    o.add(cyl(0.012, 0.012, 0.02, m.black, 0, 0.19, 0, 10));
    const handle = torus(0.06, 0.009, m.black, Math.PI);
    handle.rotation.z = -Math.PI / 2;
    handle.position.set(0.075, 0.1, 0);
    o.add(handle);
    const spout = cyl(0.012, 0.018, 0.07, m.steel, -0.085, 0.09, 0, 10);
    spout.rotation.z = 0.9;
    o.add(spout);
    return o;
  }

  function toaster() {
    const o = group();
    o.add(rbox(0.26, 0.17, 0.16, 0.035, m.white));
    for (const z of [-0.03, 0.03]) {
      const slot = box(0.18, 0.004, 0.022, m.gap, 0, 0.169, z);
      slot.castShadow = false;
      o.add(slot);
    }
    o.add(box(0.012, 0.03, 0.03, m.black, 0.134, 0.09, 0));
    return o;
  }

  function choppingBoard() {
    const o = group();
    o.add(rbox(0.34, 0.02, 0.22, 0.008, m.walnut));
    o.add(ball(0.04, m.butterDeep, 0.05, 0.058, 0.02));
    o.add(ball(0.04, m.butterDeep, -0.04, 0.058, -0.02));
    const knife = box(0.16, 0.004, 0.022, m.steel, -0.04, 0.02, 0.07);
    knife.rotation.y = 0.3;
    o.add(knife);
    return o;
  }

  function bottles() {
    const o = group();
    const set: [number, number, number, Mat][] = [
      [0, 0, 0.26, m.leafDark],
      [0.07, 0.02, 0.2, m.walnut],
      [0.03, 0.08, 0.16, m.ceramic],
    ];
    for (const [x, z, h, mat] of set) {
      o.add(cyl(0.028, 0.03, h * 0.7, mat, x, 0, z, 14));
      o.add(cyl(0.011, 0.026, h * 0.3, mat, x, h * 0.7, z, 14));
    }
    return o;
  }

  /** A stacked washer and dryer, doors on +Z. */
  function laundry() {
    const o = group();
    for (const y of [0, 0.86]) {
      o.add(rbox(0.6, 0.85, 0.58, 0.02, m.white, 0, y, 0));
      const door = cyl(0.19, 0.19, 0.03, m.blackGlass, 0, 0, 0, 32);
      door.rotation.x = Math.PI / 2;
      door.position.set(0, y + 0.42, 0.29);
      o.add(door);
      const ring = torus(0.2, 0.016, m.chrome);
      ring.position.set(0, y + 0.42, 0.305);
      o.add(ring);
      o.add(box(0.5, 0.05, 0.006, m.steel, 0, y + 0.74, 0.29));
    }
    o.add(cyl(0.05, 0.055, 0.2, m.sky, 0.14, 1.71, -0.08, 14));
    o.add(cyl(0.045, 0.045, 0.16, m.lavender, -0.02, 1.71, -0.12, 14));
    return o;
  }

  /* ---------- Baths ---------- */

  /** The cistern is against the wall at −Z, the bowl points +Z. */
  function toilet() {
    const o = group();
    o.add(rbox(0.38, 0.36, 0.17, 0.03, m.ceramic, 0, 0.4, -0.26));
    o.add(cyl(0.018, 0.018, 0.012, m.chrome, 0, 0.76, -0.26, 12));
    o.add(rbox(0.26, 0.4, 0.34, 0.09, m.ceramic, 0, 0, -0.06));
    const bowl = cyl(1, 0.8, 0.22, m.ceramic, 0, 0.18, 0.06, 32);
    bowl.scale.set(0.19, 1, 0.26);
    o.add(bowl);
    const seat = cyl(1, 1, 0.025, m.white, 0, 0.4, 0.06, 32);
    seat.scale.set(0.195, 1, 0.265);
    o.add(seat);
    return o;
  }

  /**
   * A neo-angle glass shower in a corner. The two walls are on −X and −Z; the glass door cuts
   * across the opposite corner.
   */
  function shower(size: number, bottle: Mat) {
    const o = group();
    const h = size / 2;
    const cut = size * 0.42;
    const glassH = WALL_H - 0.08;

    const tray = new THREE.Shape();
    tray.moveTo(-h, -h);
    tray.lineTo(h, -h);
    tray.lineTo(h, h - cut);
    tray.lineTo(h - cut, h);
    tray.lineTo(-h, h);
    tray.closePath();
    const base = new THREE.Mesh(new THREE.ExtrudeGeometry(tray, { depth: 0.07, bevelEnabled: false }), m.ceramic);
    // The shape is drawn in X/Y; lay it down so Y becomes Z.
    base.rotation.x = Math.PI / 2;
    base.position.y = 0.07;
    base.castShadow = true;
    base.receiveShadow = true;
    o.add(base);
    o.add(cyl(0.035, 0.035, 0.004, m.chrome, 0, 0.07, 0, 16));

    const pane = (x0: number, z0: number, x1: number, z1: number) => {
      const length = Math.hypot(x1 - x0, z1 - z0);
      const glass = box(length, glassH, 0.012, m.glass, (x0 + x1) / 2, 0.07, (z0 + z1) / 2);
      glass.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
      glass.castShadow = false;
      o.add(glass);
    };
    pane(h, -h, h, h - cut);
    pane(h, h - cut, h - cut, h);
    pane(h - cut, h, -h, h);
    for (const [x, z] of [
      [h, -h],
      [h, h - cut],
      [h - cut, h],
      [-h, h],
    ]) {
      o.add(cyl(0.011, 0.011, glassH, m.chrome, x!, 0.07, z!, 8));
    }
    const pull = cyl(0.008, 0.008, 0.24, m.chrome, h - cut / 2 + 0.02, 0.7, h - cut / 2 + 0.02, 8);
    o.add(pull);

    // Subway tile on the two walls behind it.
    const west = tiledPanel(size, WALL_H, m.subway, SUBWAY_TILE);
    west.rotation.y = Math.PI / 2;
    west.position.set(-h + 0.004, 0, 0);
    o.add(west);
    const north = tiledPanel(size, WALL_H, m.subway, SUBWAY_TILE);
    north.position.set(0, 0, -h + 0.004);
    o.add(north);

    // Riser, head and mixer on the −Z wall.
    o.add(cyl(0.011, 0.011, WALL_H - 0.2, m.chrome, -h * 0.3, 0.1, -h + 0.04, 8));
    const armRail = cyl(0.009, 0.009, 0.22, m.chrome, -h * 0.3, WALL_H - 0.1, -h + 0.04, 8);
    armRail.rotation.x = Math.PI / 2;
    o.add(armRail);
    o.add(cyl(0.09, 0.09, 0.014, m.chrome, -h * 0.3, WALL_H - 0.125, -h + 0.26, 24));
    o.add(cyl(0.03, 0.03, 0.03, m.chrome, -h * 0.3, 0.75, -h + 0.03, 12).rotateX(Math.PI / 2));
    o.add(cyl(0.028, 0.03, 0.16, bottle, -h + 0.09, 0.07, -h + 0.09, 12));
    o.add(cyl(0.024, 0.026, 0.12, m.white, -h + 0.16, 0.07, -h + 0.08, 12));
    return o;
  }

  /** A wall-hung vanity with a basin on top. The wall is at −Z. */
  function vanity(w: number, d: number, towel: Mat) {
    const o = group();
    o.add(box(w, 0.42, d - 0.03, m.oak, 0, 0.4, -0.015));
    o.add(box(w - 0.02, 0.006, 0.006, m.gap, 0, 0.6, d / 2 - 0.03));
    o.add(box(w + 0.012, 0.03, d, m.stone, 0, 0.82, 0));
    const bw = Math.min(0.4, w - 0.16);
    const bd = Math.min(0.3, d - 0.05);
    o.add(rbox(bw, 0.1, bd, 0.035, m.ceramic, -w * 0.06, 0.85, 0.01));
    const inner = rbox(bw - 0.07, 0.008, bd - 0.07, 0.003, m.steel, -w * 0.06, 0.947, 0.01);
    inner.castShadow = false;
    o.add(inner);
    o.add(cyl(0.011, 0.011, 0.17, m.chrome, -w * 0.06, 0.85, -d / 2 + 0.035, 10));
    o.add(box(0.018, 0.014, 0.1, m.chrome, -w * 0.06, 1.01, -d / 2 + 0.08));
    o.add(box(w - 0.04, 0.22, 0.012, m.mirror, 0, 0.92, -d / 2 + 0.006));
    o.add(cyl(0.022, 0.024, 0.11, m.inkMatte, w / 2 - 0.07, 0.85, 0.02, 12));
    o.add(cyl(0.028, 0.026, 0.07, towel, w / 2 - 0.07, 0.85, -d / 2 + 0.07, 12));
    // A folded towel on the shelf below.
    o.add(rbox(w * 0.5, 0.06, d * 0.5, 0.02, towel, 0, 0.34, 0));
    return o;
  }

  /* ---------- Foyer ---------- */

  function bench(w: number, cushion: Mat) {
    const o = group();
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) o.add(box(0.025, 0.4, 0.025, m.black, sx * (w / 2 - 0.04), 0, sz * 0.1));
    o.add(box(w, 0.035, 0.28, m.oak, 0, 0.4, 0));
    o.add(rbox(w - 0.04, 0.05, 0.25, 0.022, cushion, 0, 0.435, 0));
    o.add(box(w - 0.08, 0.018, 0.24, m.oak, 0, 0.1, 0));
    // Shoes kicked under it.
    const pairs: [number, Mat][] = [
      [-w / 2 + 0.2, m.white],
      [0, m.black],
      [w / 2 - 0.2, m.peachDeep],
    ];
    for (const [x, mat] of pairs) {
      for (const dx of [-0.055, 0.055]) {
        const shoe = rbox(0.09, 0.07, 0.24, 0.03, mat, x + dx, 0.118, 0.01);
        shoe.rotation.y = (random() - 0.5) * 0.2;
        o.add(shoe);
      }
    }
    return o;
  }

  function coatStand() {
    const o = group();
    o.add(cyl(0.17, 0.19, 0.025, m.black, 0, 0, 0, 28));
    o.add(cyl(0.014, 0.014, 1.55, m.black, 0, 0.025, 0, 10));
    const coats: [number, Mat, number][] = [
      [0.4, m.inkMatte, 0.7],
      [2.5, m.jute, 0.62],
      [4.4, m.purple, 0.42],
    ];
    for (const [a, mat, length] of coats) {
      const arm = cyl(0.007, 0.007, 0.12, m.black, 0, 1.45, 0, 6);
      arm.rotation.set(0, -a, -1.1);
      o.add(arm);
      const coat = rbox(0.3, length, 0.09, 0.04, mat, Math.cos(a) * 0.12, 1.42 - length, Math.sin(a) * 0.12);
      coat.rotation.y = -a + Math.PI / 2;
      o.add(coat);
    }
    return o;
  }

  function umbrellaStand() {
    const o = group();
    o.add(cyl(0.09, 0.08, 0.4, m.steelDark, 0, 0, 0, 20));
    const umbrella = cyl(0.012, 0.03, 0.62, m.lavenderDeep, 0.02, 0.06, 0, 10);
    umbrella.rotation.z = 0.12;
    o.add(umbrella);
    const second = cyl(0.01, 0.026, 0.56, m.black, -0.03, 0.06, 0.02, 10);
    second.rotation.x = 0.12;
    o.add(second);
    return o;
  }

  function waterHeater() {
    const o = group();
    o.add(cyl(0.2, 0.2, 0.95, m.white, 0, 0.05, 0, 28));
    o.add(cyl(0.02, 0.02, 0.14, m.brass, 0.08, 1.0, 0, 8));
    o.add(cyl(0.02, 0.02, 0.14, m.steelDark, -0.08, 1.0, 0, 8));
    return o;
  }

  function skateboard() {
    const o = group();
    o.add(rbox(0.2, 0.014, 0.78, 0.007, m.walnut, 0, 0.06, 0));
    for (const z of [-0.26, 0.26]) {
      for (const x of [-0.08, 0.08]) {
        const wheel = cyl(0.028, 0.028, 0.03, m.butter, 0, 0, 0, 14);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(x + 0.015, 0.03, z);
        o.add(wheel);
      }
    }
    return o;
  }

  return {
    armchair: (fabric: Mat, cushion: Mat) => sofa(0.78, 0.78, fabric, [cushion]),
    backpack,
    bed,
    bench,
    bookcase,
    books,
    bottles,
    chair,
    choppingBoard,
    closet,
    coatStand,
    coffeeTable,
    counter,
    desk,
    diningTable,
    drawers,
    fig,
    floatingShelf,
    floorLamp,
    frame,
    fridge,
    hangingRail,
    herb,
    kettle,
    laundry,
    laundryBasket,
    nightstand,
    pantry,
    pennant,
    range,
    roundRug,
    rug,
    shower,
    sideTable,
    sink,
    skateboard,
    snakePlant,
    sofa,
    stool,
    toaster,
    toilet,
    tvConsole,
    umbrellaStand,
    vanity,
    waterHeater,
  };
}

export type Furniture = ReturnType<typeof createFurniture>;
