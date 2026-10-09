import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { PowerUpType } from '../types/game';

const boxGeometry = new THREE.BoxGeometry(1, 1, 1);
const roundedGeometry = new RoundedBoxGeometry(1, 1, 1, 2, 0.12);
const sphereGeometry = new THREE.SphereGeometry(1, 14, 10);
const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 12);
const infantryMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0.12 });
const firearmMaterial = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.7 });
[boxGeometry, roundedGeometry, sphereGeometry, cylinderGeometry].forEach((geometry) => { geometry.userData.shared = true; });
[infantryMaterial, firearmMaterial].forEach((material) => { material.userData.shared = true; });

// Vertex colors let all rigid armor pieces share one draw call without losing their material colors.
function mergeRigidParts(group: THREE.Group, material = infantryMaterial) {
  const pieces: THREE.BufferGeometry[] = [];
  [...group.children].forEach((object) => {
    if (!(object instanceof THREE.Mesh) || !(object.material instanceof THREE.MeshStandardMaterial)) return;
    object.updateMatrix();
    const geometry = object.geometry.index ? object.geometry.toNonIndexed() : object.geometry.clone();
    geometry.applyMatrix4(object.matrix);
    const colors = new Float32Array(geometry.getAttribute('position').count * 3);
    for (let i = 0; i < colors.length; i += 3) object.material.color.toArray(colors, i);
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    pieces.push(geometry);
    group.remove(object);
  });
  if (!pieces.length) return;
  const combined = mergeGeometries(pieces);
  pieces.forEach((piece) => piece.dispose());
  if (combined) {
    const mesh = new THREE.Mesh(combined, material);
    mesh.castShadow = mesh.receiveShadow = true;
    group.add(mesh);
  }
}

export const palette = {
  concrete: new THREE.MeshStandardMaterial({ color: 0x686e69, roughness: 0.96 }),
  darkConcrete: new THREE.MeshStandardMaterial({ color: 0x343d3c, roughness: 0.95 }),
  steel: new THREE.MeshStandardMaterial({ color: 0x697372, metalness: 0.78, roughness: 0.52 }),
  darkSteel: new THREE.MeshStandardMaterial({ color: 0x242e2e, metalness: 0.7, roughness: 0.6 }),
  black: new THREE.MeshStandardMaterial({ color: 0x131b1b, roughness: 0.85 }),
  amber: new THREE.MeshStandardMaterial({ color: 0xb18535, metalness: 0.34, roughness: 0.64 }),
  light: new THREE.MeshBasicMaterial({ color: new THREE.Color(5, 2.4, 0.5) }),
  blueLight: new THREE.MeshBasicMaterial({ color: new THREE.Color(0.4, 2.0, 2.4) }),
  glass: new THREE.MeshPhysicalMaterial({ color: 0x4a797f, metalness: 0.45, roughness: 0.16, transparent: true, opacity: 0.72 }),
};
Object.values(palette).forEach((material) => { material.userData.shared = true; });

export function disposeTransient(root: THREE.Object3D) {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!object.geometry.userData.shared) object.geometry.dispose();
    const materials = Array.isArray(object.material) ? object.material : [object.material];
    materials.forEach((material) => {
      if (material.userData.shared) return;
      Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
      material.dispose();
    });
  });
}

export function box(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, rounded = false) {
  const object = new THREE.Mesh(rounded ? roundedGeometry : boxGeometry, material);
  object.position.set(x, y, z);
  object.scale.set(w, h, d);
  object.castShadow = true;
  object.receiveShadow = true;
  parent.add(object);
  return object;
}

export function sphere(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, rx: number, ry = rx, rz = rx) {
  const object = new THREE.Mesh(sphereGeometry, material);
  object.position.set(x, y, z);
  object.scale.set(rx, ry, rz);
  object.castShadow = true;
  parent.add(object);
  return object;
}

export function cylinder(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, radius: number, height: number) {
  const object = new THREE.Mesh(cylinderGeometry, material);
  object.position.set(x, y, z);
  object.scale.set(radius, height, radius);
  object.castShadow = true;
  parent.add(object);
  return object;
}

export function beam(parent: THREE.Object3D, a: THREE.Vector3, b: THREE.Vector3, radius = 0.055, material: THREE.Material = palette.steel) {
  const middle = a.clone().add(b).multiplyScalar(0.5);
  const object = cylinder(parent, material, middle.x, middle.y, middle.z, radius, a.distanceTo(b));
  object.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
  return object;
}

export function canvasTexture(width: number, height: number, draw: (ctx: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  draw(ctx);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export function asphaltTexture() {
  const texture = canvasTexture(512, 512, (ctx) => {
    ctx.fillStyle = '#626765';
    ctx.fillRect(0, 0, 512, 512);
    let seed = 9217;
    const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
    for (let i = 0; i < 75000; i++) {
      const value = Math.floor(38 + rand() * 93);
      ctx.fillStyle = `rgba(${value},${value + 3},${value + 2},${0.2 + rand() * 0.6})`;
      ctx.fillRect(rand() * 512, rand() * 512, 0.5 + rand() * 2.3, 0.5 + rand() * 2.3);
    }
    for (let i = 0; i < 7; i++) {
      let x = rand() * 512;
      let y = rand() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let j = 0; j < 7; j++) {
        x += rand() * 45 - 19;
        y += rand() * 35;
        ctx.lineTo(x, y);
      }
      ctx.strokeStyle = 'rgba(15,22,21,0.55)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
    }
  });
  texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 36);
  return texture;
}

export function glowTexture(smoke = false) {
  return canvasTexture(128, 128, (ctx) => {
    if (smoke) {
      for (let i = 0; i < 28; i++) {
        const x = 34 + Math.random() * 60;
        const y = 34 + Math.random() * 60;
        const gradient = ctx.createRadialGradient(x, y, 0, x, y, 32);
        gradient.addColorStop(0, 'rgba(220,226,223,0.12)');
        gradient.addColorStop(1, 'rgba(220,226,223,0)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 128, 128);
      }
    } else {
      const gradient = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      gradient.addColorStop(0, '#ffffff');
      gradient.addColorStop(0.13, '#fff1b1');
      gradient.addColorStop(0.32, 'rgba(255,171,59,0.7)');
      gradient.addColorStop(1, 'rgba(255,90,0,0)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, 128, 128);
    }
  });
}

export function stencil(text: string, color = '#f1e8ce', background?: string) {
  const texture = canvasTexture(512, 128, (ctx) => {
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, 512, 128);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.strokeRect(6, 6, 500, 116);
    }
    ctx.font = 'bold 65px "Arial Narrow", Arial, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillStyle = color;
    ctx.fillText(text, 256, 68, 474);
  });
  return new THREE.MeshBasicMaterial({ map: texture, transparent: true, side: THREE.DoubleSide, depthWrite: false, toneMapped: false });
}

export function label(parent: THREE.Object3D, text: string, x: number, y: number, z: number, width: number, color = '#eee7d6', background?: string) {
  const material = stencil(text, color, background);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, width / 4), material);
  mesh.position.set(x, y, z);
  parent.add(mesh);
  return mesh;
}

export function createRifle() {
  const gun = new THREE.Group();
  box(gun, palette.darkSteel, 0, 0, 0, 0.12, 0.16, 0.52, true);
  box(gun, palette.black, 0, -0.075, 0.24, 0.095, 0.12, 0.24, true);
  box(gun, palette.darkSteel, 0, 0.005, -0.36, 0.09, 0.11, 0.24, true);
  const barrel = cylinder(gun, palette.steel, 0, 0.012, -0.6, 0.027, 0.28);
  barrel.rotation.x = Math.PI / 2;
  const suppressor = cylinder(gun, palette.black, 0, 0.012, -0.75, 0.043, 0.14);
  suppressor.rotation.x = Math.PI / 2;
  const mag = box(gun, palette.black, 0, -0.17, 0.01, 0.07, 0.23, 0.1, true);
  mag.rotation.x = -0.16;
  box(gun, palette.black, 0, 0.13, 0.02, 0.07, 0.08, 0.15);
  sphere(gun, palette.blueLight, 0, 0.13, -0.058, 0.017);
  for (let i = 0; i < 5; i++) box(gun, palette.steel, 0, 0.09, -0.2 + i * 0.065, 0.13, 0.018, 0.015);
  mergeRigidParts(gun, firearmMaterial);
  return gun;
}

export function createWeapon(type: PowerUpType) {
  if (type === 'dual_smg' || type === 'shotgun_spread') {
    const rifle = createRifle();
    if (type === 'shotgun_spread') {
      rifle.scale.set(1.3, 1.25, 1.08);
      const tube = cylinder(rifle, palette.steel, 0, -0.055, -0.4, 0.04, 0.6);
      tube.rotation.x = Math.PI / 2;
    }
    return rifle;
  }
  const weapon = new THREE.Group();
  if (type === 'gatling_overload') {
    const body = cylinder(weapon, palette.darkSteel, 0, 0, 0, 0.17, 0.42);
    body.rotation.x = Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const angle = i / 6 * Math.PI * 2;
      const barrel = cylinder(weapon, palette.steel, Math.cos(angle) * 0.1, Math.sin(angle) * 0.1, -0.5, 0.025, 0.72);
      barrel.rotation.x = Math.PI / 2;
    }
    for (const z of [-0.68, -0.3]) {
      const collar = cylinder(weapon, palette.darkSteel, 0, 0, z, 0.145, 0.075);
      collar.rotation.x = Math.PI / 2;
    }
  } else if (type === 'rocket_barrage') {
    const tube = cylinder(weapon, palette.darkSteel, 0, 0, -0.28, 0.16, 1.4);
    tube.rotation.x = Math.PI / 2;
    const front = cylinder(weapon, palette.amber, 0, 0, -1, 0.185, 0.14);
    front.rotation.x = Math.PI / 2;
    box(weapon, palette.black, 0, -0.23, 0.06, 0.1, 0.25, 0.13, true);
    box(weapon, palette.black, 0, 0.24, -0.2, 0.08, 0.12, 0.16);
  } else {
    box(weapon, palette.darkSteel, 0, 0, -0.1, 0.18, 0.22, 0.95, true);
    for (const side of [-1, 1]) {
      box(weapon, palette.steel, side * 0.12, 0, -0.44, 0.045, 0.15, 0.5);
      box(weapon, palette.blueLight, side * 0.08, 0.035, -0.45, 0.025, 0.035, 0.7);
    }
    box(weapon, palette.black, 0, -0.17, 0.14, 0.1, 0.23, 0.11, true);
  }
  mergeRigidParts(weapon, firearmMaterial);
  return weapon;
}

export interface Actor {
  group: THREE.Group;
  body: THREE.Group;
  legs: THREE.Group[];
  arms: THREE.Group[];
  muzzle: THREE.Sprite;
  mixer?: THREE.AnimationMixer;
  model?: THREE.Object3D;
  deadTime?: number;
  baseScale: number;
}

export function createActor(enemy: boolean, glow: THREE.Texture, heavy = false): Actor {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const uniform = new THREE.MeshStandardMaterial({ color: enemy ? 0x62483c : 0x3c5357, roughness: 0.93 });
  const armor = new THREE.MeshStandardMaterial({ color: enemy ? 0x41423a : 0x263c40, roughness: 0.78, metalness: 0.25 });
  const skin = new THREE.MeshStandardMaterial({ color: enemy ? 0x96957b : 0xa48d74, roughness: 0.96 });
  group.add(body);
  box(body, uniform, 0, 1.27, 0, 0.57, 0.65, 0.32, true);
  box(body, armor, 0, 1.3, -0.19, 0.48, 0.48, 0.12, true);
  box(body, armor, 0, 0.92, 0, 0.54, 0.13, 0.37, true);
  box(body, armor, 0, 1.33, 0.24, 0.44, 0.55, 0.2, true);
  for (const x of [-0.15, 0, 0.15]) {
    box(body, uniform, x, 1.23, -0.29, 0.105, 0.21, 0.08, true);
    box(body, palette.steel, x, 1.38, -0.335, 0.072, 0.016, 0.016);
  }
  cylinder(body, skin, 0, 1.68, 0, 0.09, 0.17);
  sphere(body, skin, 0, 1.85, -0.015, 0.185, 0.235, 0.18);
  sphere(body, armor, 0, 1.98, 0.014, 0.22, 0.16, 0.225);
  box(body, armor, 0, 1.89, -0.204, 0.4, 0.035, 0.09, true);
  box(body, enemy ? palette.black : palette.glass, 0, 1.86, -0.183, 0.28, 0.074, 0.04, true);
  if (enemy) {
    for (const x of [-0.078, 0.078]) sphere(body, palette.light, x, 1.858, -0.209, 0.021);
  } else {
    box(body, palette.blueLight, 0, 1.31, 0.351, 0.2, 0.025, 0.01);
    box(body, palette.amber, 0.36, 1.49, 0, 0.03, 0.09, 0.12);
  }

  const legs: THREE.Group[] = [];
  const arms: THREE.Group[] = [];
  for (const side of [-1, 1]) {
    const leg = new THREE.Group();
    leg.position.set(side * 0.16, 0.92, 0);
    box(leg, uniform, 0, -0.24, 0, 0.23, 0.46, 0.25, true);
    box(leg, armor, 0, -0.45, -0.07, 0.19, 0.14, 0.19, true);
    box(leg, uniform, 0, -0.63, 0.015, 0.18, 0.36, 0.19, true);
    box(leg, palette.black, 0, -0.84, -0.07, 0.22, 0.17, 0.34, true);
    mergeRigidParts(leg);
    body.add(leg);
    legs.push(leg);

    const arm = new THREE.Group();
    arm.position.set(side * 0.36, 1.5, 0);
    sphere(arm, armor, 0, 0, 0, 0.155, 0.175, 0.17);
    const upper = box(arm, uniform, 0, -0.22, -0.045, 0.18, 0.35, 0.2, true);
    upper.rotation.x = 0.18;
    const forearm = box(arm, uniform, 0, -0.32, -0.23, 0.16, 0.17, 0.34, true);
    forearm.rotation.y = side * 0.18;
    sphere(arm, enemy ? skin : palette.black, -side * 0.03, -0.32, -0.4, 0.095, 0.083, 0.1);
    if (enemy) arm.rotation.x = -0.4;
    mergeRigidParts(arm);
    body.add(arm);
    arms.push(arm);
  }

  if (!enemy) {
    const gun = createWeapon('dual_smg');
    gun.name = 'equipped-weapon';
    gun.position.set(0.28, 1.22, -0.48);
    group.add(gun);
  }
  mergeRigidParts(body);
  const muzzle = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, color: new THREE.Color(5, 3.5, 1), blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
  muzzle.position.set(0.28, 1.23, -1.18);
  muzzle.scale.set(0.8, 0.8, 1);
  muzzle.visible = false;
  group.add(muzzle);
  if (enemy) group.rotation.y = Math.PI;
  const baseScale = heavy ? 1.5 : 1;
  group.scale.setScalar(baseScale);
  return { group, body, legs, arms, muzzle, baseScale };
}

export function createVehicle() {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: 0x333b35, metalness: 0.64, roughness: 0.65 });
  box(car, palette.black, 0, 0.52, 0, 1.8, 0.35, 4.1, true);
  box(car, paint, 0, 0.95, 0, 1.92, 0.66, 3.85, true);
  box(car, paint, 0, 1.56, 0.3, 1.75, 0.8, 1.93, true);
  box(car, palette.glass, 0, 1.6, -0.68, 1.57, 0.52, 0.035).rotation.x = -0.2;
  box(car, palette.glass, -0.883, 1.59, 0.16, 0.023, 0.49, 1.25);
  box(car, palette.glass, 0.883, 1.59, 0.16, 0.023, 0.49, 1.25);
  box(car, palette.darkSteel, 0, 0.75, -2.04, 1.9, 0.2, 0.18);
  box(car, palette.black, 0, 1.02, -1.98, 0.9, 0.21, 0.03);
  for (const side of [-1, 1]) {
    box(car, palette.amber, side * 0.68, 1.03, -1.99, 0.31, 0.17, 0.03);
    box(car, palette.darkSteel, side * 0.75, 2.0, 0.25, 0.065, 0.07, 1.76);
    for (const z of [-1.26, 1.24]) {
      const wheel = cylinder(car, palette.black, side * 0.99, 0.52, z, 0.48, 0.28);
      wheel.rotation.z = Math.PI / 2;
      const rim = cylinder(car, palette.steel, side * 1.14, 0.52, z, 0.26, 0.035);
      rim.rotation.z = Math.PI / 2;
    }
  }
  const hood = box(car, paint, 0, 1.35, -1.42, 1.7, 0.075, 1.01);
  hood.rotation.x = 0.19;
  return car;
}

export function createSupply(type: 'supply' | 'rescue' | 'barrier', value: number) {
  const group = new THREE.Group();
  if (type === 'rescue') {
    const medic = new THREE.Group();
    const suit = new THREE.MeshStandardMaterial({ color: 0xa8b6a5, roughness: 0.9 });
    const vest = new THREE.MeshStandardMaterial({ color: 0x395f56, roughness: 0.8 });
    const skin = new THREE.MeshStandardMaterial({ color: 0xbd977a, roughness: 0.88 });
    const hair = new THREE.MeshStandardMaterial({ color: 0x403027, roughness: 1 });
    box(group, palette.darkSteel, 0, 0.08, 0, 1.55, 0.16, 1.35, true);
    for (const x of [-0.66, 0.66]) {
      box(group, palette.steel, x, 1.12, 0, 0.07, 2.12, 0.09);
      box(group, palette.blueLight, x, 1.12, 0.06, 0.025, 1.9, 0.015);
    }
    for (const x of [-0.15, 0.15]) {
      box(medic, suit, x, 0.54, 0, 0.23, 0.85, 0.25, true);
      box(medic, palette.black, x, 0.17, 0.08, 0.26, 0.18, 0.37, true);
    }
    box(medic, suit, 0, 1.25, 0, 0.53, 0.68, 0.3, true);
    box(medic, vest, 0, 1.32, 0.18, 0.48, 0.44, 0.13, true);
    cylinder(medic, skin, 0, 1.66, 0, 0.085, 0.15);
    sphere(medic, hair, 0, 1.89, -0.01, 0.195, 0.24, 0.19);
    sphere(medic, skin, 0, 1.85, 0.07, 0.16, 0.205, 0.14);
    sphere(medic, hair, 0, 1.91, -0.16, 0.095);
    for (const side of [-1, 1]) {
      const arm = box(medic, suit, side * 0.34, 1.18, 0, 0.16, 0.52, 0.19, true);
      arm.rotation.z = side * -0.14;
      sphere(medic, skin, side * 0.38, 0.95, 0.025, 0.082, 0.11, 0.085);
    }
    mergeRigidParts(medic);
    label(medic, '+', 0, 1.34, 0.254, 0.36, '#d5fbe3');
    label(group, 'RESCUE', 0, 2.35, 0.02, 1.45, '#b9f6dc');
    const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.73, 0.73, 2.1, 32, 1, true), new THREE.MeshPhysicalMaterial({ color: 0x7be0bc, transparent: true, opacity: 0.08, metalness: 0.45, roughness: 0.15, side: THREE.DoubleSide, depthWrite: false }));
    glass.position.y = 1.16;
    group.add(medic, glass);
    return group;
  }
  const mat = palette.amber;
  box(group, palette.darkSteel, 0, 0.14, 0, 1.5, 0.28, 1.14, true);
  box(group, mat, 0, 0.67, 0, 1.35, 0.83, 1.02, true);
  box(group, palette.darkSteel, 0, 1.15, 0, 1.48, 0.17, 1.16, true);
  for (const x of [-0.49, 0.49]) {
    box(group, palette.darkSteel, x, 0.7, 0.53, 0.15, 0.85, 0.07);
    box(group, palette.steel, x, 0.85, 0.578, 0.1, 0.18, 0.02);
  }
  const text = type === 'barrier' ? `${value}` : 'SUPPLY';
  label(group, text, 0, 0.72, 0.563, 0.92, '#fff0c6');
  const beaconMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 2, 0.3) });
  box(group, beaconMat, 0, 1.253, 0, 0.55, 0.014, 0.035);
  const ring = new THREE.Mesh(new THREE.RingGeometry(1.05, 1.1, 48), new THREE.MeshBasicMaterial({ color: 0xffc568, transparent: true, opacity: 0.55, side: THREE.DoubleSide, depthWrite: false }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.04;
  group.add(ring);
  return group;
}

export function createGate(value: number) {
  const group = new THREE.Group();
  for (const x of [-1.65, 1.65]) {
    box(group, palette.darkSteel, x, 1.15, 0, 0.18, 2.3, 0.24, true);
    box(group, palette.blueLight, x, 1.2, 0.13, 0.047, 1.93, 0.016);
    box(group, palette.steel, x, 0.11, 0, 0.58, 0.22, 0.67, true);
  }
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(3.12, 1.65), new THREE.MeshBasicMaterial({ color: 0x46c3d4, transparent: true, opacity: 0.14, side: THREE.DoubleSide, depthWrite: false }));
  glass.position.y = 1.25;
  group.add(glass);
  label(group, `+${value}`, 0, 1.4, 0.03, 2.45, '#a9f9ff');
  label(group, 'REINFORCEMENTS', 0, 0.62, 0.04, 2.0, '#a9e5e9');
  return group;
}