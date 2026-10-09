import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { clone as cloneSkeleton } from 'three/addons/utils/SkeletonUtils.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { assetUrl } from '../utils/assetUrl';
import { type BattleState, type GraphicsOptions, squadPosition } from './battleTypes';
import { type Actor, asphaltTexture, beam, box, canvasTexture, createActor, createGate, createWeapon, createSupply, createVehicle, cylinder, disposeTransient, glowTexture, label, palette } from './SceneAssets';

interface Smoke {
  sprite: THREE.Sprite;
  origin: THREE.Vector3;
  phase: number;
}

export class BattlefieldRenderer {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly scene = new THREE.Scene();
  public readonly camera = new THREE.PerspectiveCamera(48, 1, 0.2, 650);
  private readonly canvas: HTMLCanvasElement;
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly sun = new THREE.DirectionalLight(0xffd7a0, 2.55);
  private readonly players: Actor[] = [];
  private readonly enemies = new Map<number, Actor>();
  private readonly allActors = new Set<Actor>();
  private readonly actorPool: Actor[] = [];
  private readonly corpses: Actor[] = [];
  private readonly roadObjects = new Map<number, THREE.Group>();
  private readonly bulletMesh: THREE.InstancedMesh;
  private readonly particleMesh: THREE.InstancedMesh;
  private readonly dummy = new THREE.Object3D();
  private readonly glow = glowTexture();
  private readonly smokeMap = glowTexture(true);
  private readonly smoke: Smoke[] = [];
  private readonly atmosphere = new THREE.Group();
  private readonly helicopter = new THREE.Group();
  private readonly rotor = new THREE.Group();
  private readonly selection = new THREE.Group();
  private readonly shield: THREE.Mesh;
  private readonly muzzleLight = new THREE.PointLight(0xffbe62, 0, 12, 1.7);
  private readonly fireLights: THREE.PointLight[] = [];
  private readonly water: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  private readonly abort = new AbortController();
  private readonly envTarget: THREE.WebGLRenderTarget;
  private disposed = false;
  private options: GraphicsOptions;
  private modelTemplate?: THREE.Group;
  private modelAnimations: THREE.AnimationClip[] = [];
  private modelScale = 1;
  private modelOffset = 0;
  private modelTimeout?: ReturnType<typeof setTimeout>;
  private equippedWeapon = 'dual_smg';
  private backgroundTexture?: THREE.Texture;
  private raycaster = new THREE.Raycaster();
  private floor = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  constructor(canvas: HTMLCanvasElement, options: GraphicsOptions, onAssets: (detailed: boolean) => void) {
    this.canvas = canvas;
    this.options = options;
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    this.renderer.setClearColor(0x52605e, 0);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.scene.fog = new THREE.Fog(0x77817a, 52, 172);
    this.camera.position.set(5.8, 11.5, 31);
    this.camera.lookAt(0, 0, -30);

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const room = new RoomEnvironment();
    this.envTarget = pmrem.fromScene(room, 0.06);
    this.scene.environment = this.envTarget.texture;
    this.scene.environmentIntensity = 0.3;
    room.dispose();
    pmrem.dispose();

    const sky = new THREE.TextureLoader().load(assetUrl('images/harbor-dusk.jpg'), (texture) => {
      if (this.disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      this.backgroundTexture = texture;
      this.scene.background = texture;
      this.resize();
    });
    this.backgroundTexture = sky;

    this.scene.add(new THREE.HemisphereLight(0xc6dad7, 0x3a4039, 1.75));
    this.sun.position.set(-27, 38, -24);
    this.sun.target.position.set(0, 0, -12);
    this.sun.castShadow = true;
    Object.assign(this.sun.shadow.camera, { left: -28, right: 28, top: 34, bottom: -34, near: 0.5, far: 115 });
    this.sun.shadow.bias = -0.00035;
    this.sun.shadow.normalBias = 0.025;
    this.scene.add(this.sun, this.sun.target, this.muzzleLight);
    const rimLight = new THREE.DirectionalLight(0x89cbd6, 1.2);
    rimLight.position.set(16, 7, 12);
    this.scene.add(rimLight);

    this.createBridge();
    this.water = this.createWater();
    this.scene.add(this.water, this.atmosphere, this.helicopter, this.selection);
    this.createAtmosphere();
    this.createHelicopter();

    const ring = new THREE.Mesh(new THREE.RingGeometry(2.25, 2.285, 80), new THREE.MeshBasicMaterial({ color: 0x7ed9d6, transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    this.selection.add(ring);
    for (let i = 0; i < 4; i++) {
      const arc = new THREE.Mesh(new THREE.RingGeometry(2.3, 2.42, 16, 1, i * Math.PI / 2, 0.18), new THREE.MeshBasicMaterial({ color: 0xb3f0e9, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
      arc.rotation.x = -Math.PI / 2;
      this.selection.add(arc);
    }
    this.shield = new THREE.Mesh(new THREE.SphereGeometry(2.65, 32, 24, 0, Math.PI * 2, 0, Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x65dee1, transparent: true, opacity: 0.15, metalness: 0.6, roughness: 0.14, side: THREE.DoubleSide, depthWrite: false }));
    this.scene.add(this.shield);

    this.bulletMesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: new THREE.Color(4.5, 2.3, 0.65), toneMapped: false }), 300);
    this.bulletMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bulletMesh.frustumCulled = false;
    this.bulletMesh.count = 0;
    this.particleMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 5, 4), new THREE.MeshBasicMaterial({ color: new THREE.Color(2.8, 2.8, 2.8), toneMapped: false }), 420);
    this.particleMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.particleMesh.frustumCulled = false;
    this.particleMesh.count = 0;
    this.scene.add(this.bulletMesh, this.particleMesh);

    this.composer = new EffectComposer(this.renderer);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.bloom = new UnrealBloomPass(new THREE.Vector2(800, 600), 0.32, 0.55, 1.4);
    this.composer.addPass(this.bloom);
    this.composer.addPass(new OutputPass());
    this.setOptions(options);
    this.loadInfantry(onAssets);
  }

  private createBridge() {
    const staticWorld = new THREE.Group();
    this.scene.add(staticWorld);
    const concreteGrain = asphaltTexture();
    concreteGrain.repeat.set(1, 3);
    palette.concrete.map = concreteGrain;
    palette.concrete.bumpMap = concreteGrain;
    palette.concrete.bumpScale = 0.027;
    palette.concrete.color.set(0xa5aaa0);
    box(staticWorld, palette.darkConcrete, 0, -0.64, -69, 21.4, 1.3, 204);
    box(staticWorld, palette.concrete, 0, -0.2, -69, 20.2, 0.4, 204);
    const roadTexture = asphaltTexture();
    const roadMat = new THREE.MeshStandardMaterial({ map: roadTexture, bumpMap: roadTexture, bumpScale: 0.035, roughness: 0.74, metalness: 0.12, color: 0x8f9993 });
    const road = new THREE.Mesh(new THREE.PlaneGeometry(18.7, 204), roadMat);
    road.rotation.x = -Math.PI / 2;
    road.position.set(0, 0.009, -69);
    road.receiveShadow = true;
    this.scene.add(road);

    // CC0 photogrammetry is optional: the generated asphalt stays in place if a CDN is unavailable.
    const loader = new THREE.TextureLoader();
    const base = 'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/asphalt_02/asphalt_02_';
    loader.load(`${base}diff_1k.jpg`, (texture) => {
      if (this.disposed) { texture.dispose(); return; }
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3.2, 34);
      texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
      roadMat.map = texture;
      roadMat.color.set(0x8e9994);
      roadMat.needsUpdate = true;
    }, undefined, () => {});
    loader.load(`${base}nor_gl_1k.jpg`, (texture) => {
      if (this.disposed) { texture.dispose(); return; }
      texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(3.2, 34);
      roadMat.normalMap = texture;
      roadMat.normalScale.set(0.5, 0.5);
      roadMat.needsUpdate = true;
    }, undefined, () => {});

    const paint = new THREE.MeshStandardMaterial({ color: 0xd3c8a4, roughness: 0.92, transparent: true, opacity: 0.5 });
    const yellowPaint = new THREE.MeshStandardMaterial({ color: 0xbd973f, roughness: 0.9, transparent: true, opacity: 0.52 });
    for (const x of [-0.13, 0.13]) box(staticWorld, yellowPaint, x, 0.015, -66, 0.085, 0.008, 191);
    for (const x of [-8.2, 8.2]) box(staticWorld, paint, x, 0.014, -68, 0.12, 0.008, 200);
    for (let z = 26; z > -166; z -= 7.5) {
      for (const x of [-4.2, 4.2]) box(staticWorld, paint, x, 0.016, z, 0.13, 0.008, 3.1);
    }

    for (const side of [-1, 1]) {
      box(staticWorld, palette.concrete, side * 9.35, 0.17, -69, 0.72, 0.34, 204);
      box(staticWorld, palette.steel, side * 9.65, 1.18, -69, 0.11, 0.12, 204);
      box(staticWorld, palette.darkSteel, side * 9.65, 0.58, -69, 0.1, 0.22, 204);
      for (let z = 29; z > -170; z -= 3.4) {
        box(staticWorld, palette.steel, side * 9.65, 0.69, z, 0.15, 1.25, 0.15);
        box(staticWorld, palette.darkSteel, side * 9.64, 0.21, z, 0.39, 0.07, 0.35);
      }
      for (let z = 14; z > -135; z -= 22) {
        cylinder(staticWorld, palette.darkSteel, side * 10, 3.6, z, 0.066, 7);
        beam(staticWorld, new THREE.Vector3(side * 10, 7.05, z), new THREE.Vector3(side * 8.5, 7.3, z), 0.055);
        box(staticWorld, palette.light, side * 8.55, 7.25, z, 0.36, 0.055, 0.63);
      }
    }

    for (const z of [-40, -117]) {
      for (const side of [-1, 1]) {
        box(staticWorld, palette.concrete, side * 10.45, 8, z, 1.65, 27, 2.3);
        box(staticWorld, palette.darkConcrete, side * 10.45, 1, z, 2.8, 2, 3.2);
        for (let y = 3; y < 22; y += 4) box(staticWorld, palette.darkConcrete, side * 10.45, y, z + 1.155, 1.68, 0.065, 0.025);
      }
      box(staticWorld, palette.concrete, 0, 17.5, z, 20.4, 1.4, 1.9);
      box(staticWorld, palette.concrete, 0, 20.9, z, 21.9, 0.8, 2.1);
      box(staticWorld, palette.darkSteel, 0, 19.2, z, 19.4, 0.075, 0.1);
    }

    for (const side of [-1, 1]) {
      const path: THREE.Vector3[] = [];
      for (let i = 0; i <= 52; i++) {
        const z = 36 - i * 4;
        const nearest = Math.min(Math.abs(z + 40), Math.abs(z + 117));
        const y = 2.2 + 20 * Math.pow(Math.max(0, 1 - nearest / 77), 2);
        path.push(new THREE.Vector3(side * 10.55, y, z));
        if (i % 2 === 0 && y > 2.4) beam(staticWorld, new THREE.Vector3(side * 10.55, 0.6, z), new THREE.Vector3(side * 10.55, y, z), 0.036, palette.darkSteel);
      }
      const cable = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(path), 180, 0.115, 6, false), palette.darkSteel);
      cable.castShadow = true;
      staticWorld.add(cable);
    }

    const bridgeSign = label(this.scene, 'QUARANTINE  /  SECTOR 07', 0, 5.3, -29, 8.4, '#c4c9b8', '#27352f');
    box(staticWorld, palette.darkSteel, 0, 6.52, -29.08, 10.2, 0.12, 0.12);
    for (const x of [-5.12, 5.12]) box(staticWorld, palette.steel, x, 3.23, -29.1, 0.1, 6.46, 0.12);
    bridgeSign.castShadow = true;

    const groundText = label(this.scene, 'EVACUATION', 0, 0.025, -2.3, 6.2, '#b0b3a3');
    groundText.rotation.x = -Math.PI / 2;
    const arrowTexture = canvasTexture(128, 256, (ctx) => {
      ctx.fillStyle = '#c7c4ad';
      ctx.beginPath();
      ctx.moveTo(64, 15); ctx.lineTo(111, 79); ctx.lineTo(81, 79);
      ctx.lineTo(81, 227); ctx.lineTo(47, 227); ctx.lineTo(47, 79); ctx.lineTo(17, 79);
      ctx.closePath(); ctx.fill();
    });
    for (const x of [-2.2, 2.2]) {
      const arrow = new THREE.Mesh(new THREE.PlaneGeometry(0.85, 2.6), new THREE.MeshStandardMaterial({ map: arrowTexture, transparent: true, opacity: 0.34, depthWrite: false }));
      arrow.rotation.x = -Math.PI / 2;
      arrow.position.set(x, 0.028, -9);
      this.scene.add(arrow);
    }

    const puddleMaterial = new THREE.MeshPhysicalMaterial({ color: 0x333e39, metalness: 0.65, roughness: 0.13, transparent: true, opacity: 0.52, clearcoat: 1, depthWrite: false });
    for (let i = 0; i < 19; i++) {
      const shape = new THREE.Shape();
      for (let j = 0; j < 24; j++) {
        const theta = j / 24 * Math.PI * 2;
        const radius = 0.5 + Math.random() * 0.32;
        const x = Math.cos(theta) * radius;
        const y = Math.sin(theta) * radius;
        if (j === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
      }
      shape.closePath();
      const puddle = new THREE.Mesh(new THREE.ShapeGeometry(shape), puddleMaterial);
      puddle.rotation.x = -Math.PI / 2;
      puddle.position.set((Math.random() - 0.5) * 14, 0.027, 22 - i * 5);
      puddle.scale.set(1.5 + Math.random() * 2.3, 0.65 + Math.random() * 2, 1);
      this.scene.add(puddle);
    }

    for (let i = 0; i < 96; i++) {
      const side = i % 2 ? -1 : 1;
      const rubble = box(staticWorld, i % 3 ? palette.darkConcrete : palette.concrete, side * (6.8 + Math.random() * 2), 0.12, 24 - Math.random() * 138, 0.12 + Math.random() * 0.36, 0.12 + Math.random() * 0.25, 0.17 + Math.random() * 0.6);
      rubble.rotation.set(Math.random() * 0.4, Math.random() * 6, Math.random() * 0.5);
    }
    const abandoned = createVehicle();
    abandoned.position.set(-7.2, 0, -7.5);
    abandoned.rotation.y = 0.3;
    this.scene.add(abandoned);
    const wreck = createVehicle();
    wreck.position.set(7.15, 0, -22);
    wreck.rotation.y = -0.25;
    this.scene.add(wreck);

    // Merge stationary structure parts by material to keep hundreds of details inexpensive.
    staticWorld.updateMatrixWorld(true);
    const batches = new Map<THREE.Material, THREE.BufferGeometry[]>();
    staticWorld.traverse((child) => {
      if (!(child instanceof THREE.Mesh) || Array.isArray(child.material)) return;
      const geometry = child.geometry.clone().applyMatrix4(child.matrixWorld);
      const list = batches.get(child.material) ?? [];
      list.push(geometry);
      batches.set(child.material, list);
    });
    this.scene.remove(staticWorld);
    batches.forEach((geometries, material) => {
      const merged = mergeGeometries(geometries, false);
      if (merged) {
        const mesh = new THREE.Mesh(merged, material);
        mesh.receiveShadow = mesh.castShadow = true;
        this.scene.add(mesh);
      }
      geometries.forEach((geometry) => geometry.dispose());
    });
  }

  private createWater() {
    const geometry = new THREE.PlaneGeometry(1200, 1200, 1, 1);
    const material = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 } },
      vertexShader: `varying vec3 vWorld; void main() { vec4 p = modelMatrix * vec4(position, 1.0); vWorld = p.xyz; gl_Position = projectionMatrix * viewMatrix * p; }`,
      fragmentShader: `
        uniform float time;
        varying vec3 vWorld;
        void main() {
          vec2 p = vWorld.xz;
          float wave = sin(p.x * 1.7 + p.y * 0.83 + time * .65) * .25;
          wave += sin(p.x * .47 - p.y * 1.9 - time * .4) * .23;
          wave += sin(p.x * 5.8 + p.y * 3.5 + time * .9) * .12;
          wave += sin(p.x * 12.2 - p.y * 6.2 + time) * .05;
          float glint = pow(max(0.0, wave + .37), 9.0);
          vec3 color = mix(vec3(.073,.12,.132), vec3(.19,.255,.263), wave * .7 + .48);
          color += vec3(.73,.66,.42) * glint * .56;
          float haze = smoothstep(45., 250., length(p));
          color = mix(color, vec3(.36,.41,.395), haze * .66);
          gl_FragColor = vec4(color, 1.0);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.y = -4.5;
    return mesh;
  }

  private createAtmosphere() {
    const sources = [new THREE.Vector3(-7.2, 0.6, -8.8), new THREE.Vector3(7.2, 0.5, -23.5), new THREE.Vector3(14, -2, -60)];
    sources.forEach((origin) => {
      const fire = new THREE.PointLight(0xff8b37, 12, 11, 1.6);
      fire.position.copy(origin).add(new THREE.Vector3(0, 1, 0));
      this.fireLights.push(fire);
      this.atmosphere.add(fire);
      for (let i = 0; i < 7; i++) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: new THREE.Color(3, 1.2, 0.3), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
        sprite.position.copy(origin).add(new THREE.Vector3((Math.random() - 0.5) * 0.8, i * 0.18, 0));
        sprite.scale.set(1.1 - i * 0.08, 1.8 - i * 0.12, 1);
        sprite.userData.fire = true;
        sprite.userData.phase = i * 0.7;
        this.atmosphere.add(sprite);
      }
      for (let i = 0; i < 15; i++) {
        const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.smokeMap, color: 0x353d3b, transparent: true, opacity: 0.48, depthWrite: false, rotation: Math.random() * 6 }));
        this.smoke.push({ sprite, origin, phase: i / 15 });
        this.atmosphere.add(sprite);
      }
    });
    const positions = new Float32Array(270);
    for (let i = 0; i < 90; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 46;
      positions[i * 3 + 1] = Math.random() * 15;
      positions[i * 3 + 2] = 26 - Math.random() * 70;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const dust = new THREE.Points(geometry, new THREE.PointsMaterial({ color: 0xe4ce9a, size: 0.035, transparent: true, opacity: 0.42, depthWrite: false }));
    dust.name = 'ash';
    this.atmosphere.add(dust);
  }

  private createHelicopter() {
    const body = box(this.helicopter, palette.darkSteel, 0, 0, 0, 1.4, 1.35, 3.4, true);
    body.rotation.x = -0.04;
    box(this.helicopter, palette.glass, 0, 0.16, -1.57, 1.19, 0.68, 0.3, true);
    box(this.helicopter, palette.darkSteel, 0, 0.35, 3.2, 0.25, 0.31, 4.2);
    box(this.helicopter, palette.darkSteel, 0, 0.9, 5.1, 0.14, 1.6, 0.61);
    for (const x of [-0.9, 0.9]) {
      box(this.helicopter, palette.steel, x, -0.85, 0, 0.09, 0.09, 3.2);
      beam(this.helicopter, new THREE.Vector3(x, -0.8, -0.6), new THREE.Vector3(x * 0.6, -0.4, -0.6));
    }
    this.rotor.position.y = 0.96;
    box(this.rotor, palette.darkSteel, 0, 0, 0, 8.1, 0.045, 0.15);
    box(this.rotor, palette.darkSteel, 0, 0, 0, 0.15, 0.045, 8.1);
    this.helicopter.add(this.rotor);
    this.helicopter.scale.setScalar(1.3);
  }

  private async loadInfantry(onAssets: (detailed: boolean) => void) {
    this.modelTimeout = setTimeout(() => this.abort.abort(), 18000);
    try {
      const response = await fetch('https://threejs.org/examples/models/gltf/Soldier.glb', { signal: this.abort.signal });
      if (!response.ok) throw new Error('Optional infantry model unavailable');
      const model = await new GLTFLoader().parseAsync(await response.arrayBuffer(), 'https://threejs.org/examples/models/gltf/');
      if (this.disposed) { this.disposeObject(model.scene); return; }
      this.modelTemplate = model.scene;
      this.modelAnimations = model.animations;
      const bounds = new THREE.Box3().setFromObject(model.scene);
      this.modelScale = 2.12 / (bounds.max.y - bounds.min.y);
      this.modelOffset = -bounds.min.y * this.modelScale;
      this.allActors.forEach((actor) => this.upgradeActor(actor, actor.group.userData.enemy));
      onAssets(true);
    } catch {
      if (!this.disposed) onAssets(false);
    } finally {
      if (this.modelTimeout) clearTimeout(this.modelTimeout);
    }
  }

  private upgradeActor(actor: Actor, enemy: boolean) {
    if (!this.modelTemplate || actor.model) return;
    const model = cloneSkeleton(this.modelTemplate);
    model.scale.setScalar(this.modelScale);
    model.position.y = this.modelOffset;
    model.rotation.y = Math.PI;
    model.traverse((object) => {
      if (!(object instanceof THREE.Mesh)) return;
      object.castShadow = object.receiveShadow = true;
      object.frustumCulled = false;
      const materials = Array.isArray(object.material) ? object.material : [object.material];
      const copies = materials.map((original) => {
        const material = original.clone() as THREE.MeshStandardMaterial;
        if (material.color) material.color.multiply(new THREE.Color(enemy ? 0xc09a88 : 0x9cbbc0));
        if ('roughness' in material) material.roughness = 0.85;
        return material;
      });
      object.material = Array.isArray(object.material) ? copies : copies[0];
    });
    actor.body.visible = false;
    actor.model = model;
    actor.group.add(model);
    actor.mixer = new THREE.AnimationMixer(model);
    const clip = this.modelAnimations.find((animation) => animation.name.toLowerCase().includes(enemy ? 'walk' : 'idle')) ?? this.modelAnimations[0];
    if (clip) {
      const action = actor.mixer.clipAction(clip);
      action.time = Math.random() * clip.duration;
      action.play();
    }
    if (!enemy) {
      box(actor.group, palette.blueLight, 0, 1.42, 0.3, 0.23, 0.027, 0.02);
    }
  }

  private makeActor(enemy: boolean, heavy: boolean) {
    const actor = createActor(enemy, this.glow, heavy);
    actor.group.userData.enemy = enemy;
    const shadowMap = canvasTexture(64, 64, (ctx) => {
      const grad = ctx.createRadialGradient(32, 32, 3, 32, 32, 32);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)'); grad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    });
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.05, 0.85), new THREE.MeshBasicMaterial({ map: shadowMap, transparent: true, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.026;
    actor.group.add(shadow);
    this.allActors.add(actor);
    this.upgradeActor(actor, enemy);
    return actor;
  }

  public setOptions(options: GraphicsOptions) {
    this.options = options;
    this.renderer.shadowMap.enabled = options.quality !== 'performance';
    const size = options.quality === 'cinematic' ? 2048 : 1024;
    if (this.sun.shadow.mapSize.width !== size) {
      this.sun.shadow.mapSize.set(size, size);
      this.sun.shadow.map?.dispose();
      this.sun.shadow.map = null;
    }
    this.atmosphere.visible = options.atmosphere;
    this.resize();
  }

  public resize() {
    if (this.disposed) return;
    const rect = this.canvas.getBoundingClientRect();
    const w = Math.max(1, rect.width);
    const h = Math.max(1, rect.height);
    const cap = this.options.quality === 'cinematic' ? 1.6 : this.options.quality === 'balanced' ? 1.15 : 0.85;
    const dpr = Math.min(window.devicePixelRatio || 1, cap);
    this.renderer.setPixelRatio(dpr);
    this.renderer.setSize(w, h, false);
    this.composer?.setPixelRatio(dpr);
    this.composer?.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.fov = w / h < 0.85 ? 65 : 48;
    this.camera.updateProjectionMatrix();
    const image = this.backgroundTexture?.image as { width: number; height: number } | undefined;
    if (image?.width && this.backgroundTexture) {
      const imageAspect = image.width / image.height;
      const ratio = this.camera.aspect / imageAspect;
      this.backgroundTexture.repeat.set(Math.min(1, ratio), Math.min(1, 1 / ratio));
      // Align the panorama's harbor horizon with the low-angle 3D water horizon.
      this.backgroundTexture.offset.set((1 - this.backgroundTexture.repeat.x) / 2, (1 - this.backgroundTexture.repeat.y) / 2 - 0.37);
    }
  }

  public pointerX(clientX: number) {
    const rect = this.canvas.getBoundingClientRect();
    // Intersect a horizontal screen line at the squad, keeping mouse and touch steering consistent with the perspective.
    const anchor = new THREE.Vector3(0, 0, 8).project(this.camera);
    this.raycaster.setFromCamera(new THREE.Vector2((clientX - rect.left) / rect.width * 2 - 1, anchor.y), this.camera);
    const hit = new THREE.Vector3();
    return this.raycaster.ray.intersectPlane(this.floor, hit) ? THREE.MathUtils.clamp(hit.x, -6.1, 6.1) : 0;
  }

  public resetCombat() {
    [...this.enemies.values(), ...this.corpses].forEach((actor) => {
      this.scene.remove(actor.group);
      this.actorPool.push(actor);
    });
    this.enemies.clear();
    this.corpses.length = 0;
    this.roadObjects.forEach((object) => { this.scene.remove(object); disposeTransient(object); });
    this.roadObjects.clear();
  }

  public render(state: BattleState, dt: number) {
    if (this.disposed) return;
    const motion = !state.isPaused && !state.isGameOver;
    const animationDelta = motion ? dt : 0;
    const time = state.time;
    const drift = state.isPreview && this.options.shake ? Math.sin(time * 0.15) * 0.26 : 0;
    const shake = this.options.shake && !state.isPaused ? state.screenShake : 0;
    const lateral = this.camera.aspect < 0.85 ? 0 : 5.8;
    const followX = state.playerX * 0.65;
    this.camera.position.set(lateral + followX + drift + (Math.random() - 0.5) * shake, 11.5 + (Math.random() - 0.5) * shake * 0.45, 31);
    this.camera.lookAt(followX, 0, -30);
    this.water.material.uniforms.time.value = time;

    const count = Math.min(state.squadSize, 9);
    while (this.players.length < count) {
      const actor = this.makeActor(false, false);
      this.players.push(actor);
      this.scene.add(actor.group);
    }
    this.players.forEach((actor, i) => {
      actor.group.visible = i < count;
      if (this.equippedWeapon !== state.currentWeapon || actor.group.userData.weapon !== state.currentWeapon) {
        const previous = actor.group.getObjectByName('equipped-weapon');
        if (previous) { actor.group.remove(previous); disposeTransient(previous); }
        const weapon = createWeapon(state.currentWeapon);
        weapon.name = 'equipped-weapon';
        weapon.position.set(0.28, 1.22, -0.48);
        actor.group.add(weapon);
        actor.group.userData.weapon = state.currentWeapon;
      }
      const pos = squadPosition(i, state.playerX);
      actor.group.position.set(pos.x, 0, pos.z);
      actor.group.rotation.y = (state.targetPlayerX - state.playerX) * -0.035;
      actor.body.position.y = Math.sin(time * 2.5 + i) * 0.015;
      actor.muzzle.visible = !state.isGameOver && state.muzzleTimer > 0.013 && i < 6;
      actor.muzzle.material.rotation = time * 11 + i;
      actor.muzzle.scale.setScalar(0.58 + state.muzzleTimer * 6);
      actor.mixer?.update(animationDelta * 0.8);
      if (!actor.model) {
        const moving = Math.abs(state.targetPlayerX - state.playerX) > 0.06;
        actor.legs.forEach((leg, index) => { leg.rotation.x = moving ? Math.sin(time * 11 + index * Math.PI) * 0.32 : index ? 0.08 : -0.07; });
      }
    });
    this.equippedWeapon = state.currentWeapon;
    this.selection.position.set(state.playerX, 0.033, 8.9);
    this.shield.visible = state.shieldTimer > 0;
    this.shield.position.set(state.playerX, 0.03, 8.7);
    this.muzzleLight.position.set(state.playerX + 0.2, 1.7, 6.3);
    this.muzzleLight.intensity = !state.isGameOver && state.muzzleTimer > 0 ? 4.5 : 0;

    const activeIds = new Set(state.enemies.map((enemy) => enemy.id));
    this.enemies.forEach((actor, id) => {
      if (activeIds.has(id)) return;
      this.enemies.delete(id);
      actor.deadTime = 0;
      this.corpses.push(actor);
    });
    state.enemies.forEach((enemy) => {
      let actor = this.enemies.get(enemy.id);
      if (!actor) {
        actor = this.actorPool.pop() ?? this.makeActor(true, false);
        actor.baseScale = enemy.type === 'boss' ? 2.1 : enemy.type === 'brute' ? 1.36 : enemy.type === 'runner' ? 0.94 : 1;
        actor.group.scale.setScalar(actor.baseScale);
        actor.group.rotation.set(0, Math.PI, 0);
        actor.group.visible = true;
        actor.group.position.y = 0;
        actor.deadTime = undefined;
        this.enemies.set(enemy.id, actor);
        this.scene.add(actor.group);
      }
      actor.group.position.set(enemy.x, enemy.hitFlash > 0 ? 0.05 : 0, enemy.z);
      actor.group.rotation.z = enemy.hitFlash > 0 ? 0.12 : state.freezeTimer > 0 ? 0 : Math.sin(time * 3 + enemy.phase) * 0.025;
      const speed = enemy.type === 'runner' ? 8.5 : 5.3;
      const gait = Math.sin(time * speed + enemy.phase);
      if (!actor.model && state.freezeTimer <= 0) {
        actor.legs.forEach((leg, i) => { leg.rotation.x = (i ? 1 : -1) * gait * 0.37; });
        actor.arms.forEach((arm, i) => { arm.rotation.x = -0.3 + (i ? 1 : -1) * gait * 0.19; });
        actor.body.position.y = Math.abs(gait) * 0.055;
      }
      if (state.freezeTimer <= 0) actor.mixer?.update(animationDelta * (enemy.type === 'runner' ? 1.8 : 1.05));
    });
    for (let i = this.corpses.length - 1; i >= 0; i--) {
      const actor = this.corpses[i];
      actor.deadTime = (actor.deadTime ?? 0) + animationDelta;
      actor.group.rotation.x = -Math.min(Math.PI * 0.47, actor.deadTime * 4.1);
      actor.group.position.y = -Math.max(0, actor.deadTime - 0.35) * 1.3;
      if (actor.deadTime > 1.2) {
        this.scene.remove(actor.group);
        this.corpses.splice(i, 1);
        this.actorPool.push(actor);
      }
    }

    const objectIds = new Set(state.objects.map((object) => object.id));
    this.roadObjects.forEach((group, id) => {
      if (objectIds.has(id)) return;
      this.scene.remove(group);
      disposeTransient(group);
      this.roadObjects.delete(id);
    });
    state.objects.forEach((object) => {
      let group = this.roadObjects.get(object.id);
      if (!group) {
        group = object.type === 'gate' ? createGate(object.value) : createSupply(object.type, object.hp);
        this.roadObjects.set(object.id, group);
        this.scene.add(group);
      }
      group.position.set(object.x, object.type === 'supply' || object.type === 'rescue' ? 0.08 + Math.sin(time * 2) * 0.07 : 0, object.z);
    });

    this.bulletMesh.count = Math.min(300, state.bullets.length);
    state.bullets.slice(0, 300).forEach((bullet, i) => {
      this.dummy.position.set(bullet.x, bullet.y, bullet.z);
      this.dummy.rotation.set(0, -Math.atan2(bullet.vx, -bullet.vz), 0);
      this.dummy.scale.set(bullet.type === 'plasma' ? 0.09 : 0.036, 0.036, bullet.type === 'plasma' ? 2.2 : bullet.type === 'rocket' ? 0.55 : 0.88);
      this.dummy.updateMatrix();
      this.bulletMesh.setMatrixAt(i, this.dummy.matrix);
      this.bulletMesh.setColorAt(i, new THREE.Color(bullet.type === 'plasma' ? 0x82e7ff : 0xfff1ac));
    });
    this.bulletMesh.instanceMatrix.needsUpdate = true;
    if (this.bulletMesh.instanceColor) this.bulletMesh.instanceColor.needsUpdate = true;
    this.particleMesh.count = Math.min(420, state.particles.length);
    state.particles.slice(0, 420).forEach((particle, i) => {
      this.dummy.position.set(particle.x, particle.y, particle.z);
      this.dummy.rotation.set(0, 0, 0);
      this.dummy.scale.setScalar(particle.size * Math.min(1, particle.life / particle.maxLife * 2));
      this.dummy.updateMatrix();
      this.particleMesh.setMatrixAt(i, this.dummy.matrix);
      this.particleMesh.setColorAt(i, new THREE.Color(particle.color));
    });
    this.particleMesh.instanceMatrix.needsUpdate = true;
    if (this.particleMesh.instanceColor) this.particleMesh.instanceColor.needsUpdate = true;

    this.smoke.forEach(({ sprite, origin, phase }) => {
      const t = (time * 0.085 + phase) % 1;
      sprite.position.copy(origin).add(new THREE.Vector3(-t * 3.4, t * 9 + 0.2, t * 0.5));
      sprite.scale.setScalar(0.9 + t * 5.8);
      sprite.material.opacity = Math.sin(t * Math.PI) * 0.4;
      sprite.material.rotation = phase * 5 + time * 0.035;
    });
    this.fireLights.forEach((light, i) => { light.intensity = 9 + Math.sin(time * 15 + i) * 3; });
    this.atmosphere.children.forEach((object) => {
      if (object instanceof THREE.Sprite && object.userData.fire) object.material.opacity = 0.55 + Math.sin(time * 13 + object.userData.phase) * 0.3;
    });
    const ash = this.atmosphere.getObjectByName('ash');
    if (ash) { ash.position.x = Math.sin(time * 0.12) * 3; ash.position.y = Math.cos(time * 0.2) * 0.7; }
    this.helicopter.position.set(29 - (time * 0.75) % 85, 17 + Math.sin(time * 0.4) * 0.4, -67);
    this.helicopter.rotation.y = -Math.PI / 2.5;
    this.rotor.rotation.y = time * 26;
    this.helicopter.visible = this.options.atmosphere;
    this.bloom.enabled = this.options.bloom && this.options.quality !== 'performance';
    if (this.bloom.enabled) this.composer.render(); else this.renderer.render(this.scene, this.camera);
  }

  public screenshot() {
    return this.canvas.toDataURL('image/png');
  }

  private disposeObject(root: THREE.Object3D) {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points) object.geometry.dispose();
      if (object instanceof THREE.Mesh || object instanceof THREE.Sprite || object instanceof THREE.Points) {
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
          material.dispose();
        });
      }
    });
  }

  public dispose() {
    this.disposed = true;
    this.abort.abort();
    if (this.modelTimeout) clearTimeout(this.modelTimeout);
    this.allActors.forEach((actor) => { actor.mixer?.stopAllAction(); this.disposeObject(actor.group); });
    this.disposeObject(this.scene);
    if (this.modelTemplate) this.disposeObject(this.modelTemplate);
    this.glow.dispose();
    this.smokeMap.dispose();
    this.backgroundTexture?.dispose();
    this.envTarget.dispose();
    this.bloom.dispose();
    this.composer.dispose();
    this.renderer.dispose();
  }
}