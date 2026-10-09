import { BattlefieldRenderer } from './BattlefieldRenderer';
import { DEFAULT_GRAPHICS, type BattleState, type Enemy, type Bullet, type RoadObject, type BattleParticle, type GraphicsOptions, type HUDStats, squadPosition } from './battleTypes';
import type { AudienceMode, PowerUpType } from '../types/game';
import { POWER_UP_CONFIG } from '../data/sampleQuestions';
import { soundManager } from '../utils/audio';

export class RoadEngine implements BattleState {
  public playerX = 0;
  public targetPlayerX = 0;
  public hp = 100;
  public maxHp = 100;
  public squadSize = 5;
  public score = 0;
  public kills = 0;
  public wave = 1;
  public waveTimer = 0;
  public currentWeapon: PowerUpType = 'dual_smg';
  public weaponRemaining = 0;
  public shieldTimer = 0;
  public freezeTimer = 0;
  public screenShake = 0;
  public muzzleTimer = 0;
  public time = 0;
  public isPaused = false;
  public isGameOver = false;
  public isPreview = true;
  public audience: AudienceMode = 'adult';
  public enemies: Enemy[] = [];
  public bullets: Bullet[] = [];
  public objects: RoadObject[] = [];
  public particles: BattleParticle[] = [];
  public readonly visual: BattlefieldRenderer;
  public onTriggerQuestion: ((reward: PowerUpType, isSurvivor: boolean, name?: string) => void) | null = null;
  public onGameOver: (() => void) | null = null;
  public onStatsUpdate: ((stats: HUDStats) => void) | null = null;
  public onNotice: ((title: string, detail: string) => void) | null = null;

  private frame = 0;
  private lastTime = 0;
  private nextId = 1;
  private spawnTimer = 0;
  private objectTimer = 0;
  private fireTimer = 0;
  private hudTimer = 0;
  private questionCooldown = 0;
  private fps = 60;
  private keys = { left: false, right: false };
  private pointerDown = false;
  private destroyed = false;

  constructor(canvas: HTMLCanvasElement, graphics = DEFAULT_GRAPHICS, onAssets: (detailed: boolean) => void = () => {}) {
    this.visual = new BattlefieldRenderer(canvas, graphics, onAssets);
    this.spawnHorde(32, true);
    this.objects = [
      { id: this.nextId++, x: -3.7, z: -3.5, type: 'gate', hp: 1, maxHp: 1, value: 5, reward: 'squad_boost_small' },
      { id: this.nextId++, x: 3.3, z: -11, type: 'supply', hp: 45, maxHp: 45, value: 0, reward: 'gatling_overload' },
    ];
    this.lastTime = performance.now();
    this.frame = requestAnimationFrame(this.tick);
  }

  public init() {
    this.visual.resetCombat();
    this.hp = this.maxHp = 100;
    this.playerX = this.targetPlayerX = 0;
    this.squadSize = 5;
    this.score = this.kills = 0;
    this.wave = 1;
    this.waveTimer = this.spawnTimer = this.objectTimer = this.fireTimer = 0;
    this.shieldTimer = 3;
    this.freezeTimer = this.weaponRemaining = this.screenShake = this.muzzleTimer = 0;
    this.currentWeapon = 'dual_smg';
    this.isPreview = this.isGameOver = this.isPaused = false;
    this.questionCooldown = 0;
    this.enemies = [];
    this.bullets = [];
    this.objects = [];
    this.particles = [];
    this.clearInput();
    this.spawnHorde(19);
    this.spawnObjects(true);
    this.publishStats();
    this.onNotice?.('OPERATION LIVE', 'Hold the crossing. Your weapons fire automatically.');
  }

  private tick = (now: number) => {
    if (this.destroyed) return;
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(0.04, Math.max(0, rawDt));
    this.lastTime = now;
    this.fps += ((rawDt > 0 ? Math.min(144, 1 / rawDt) : 60) - this.fps) * 0.025;
    if (!this.isPaused && !this.isGameOver) {
      this.time += dt;
      if (this.isPreview) this.updatePreview(dt); else this.update(dt);
    }
    this.visual.render(this, dt);
    this.hudTimer += dt;
    if (this.hudTimer >= 0.16) { this.hudTimer = 0; this.publishStats(); }
    this.frame = requestAnimationFrame(this.tick);
  };

  private updatePreview(dt: number) {
    this.fireTimer += dt;
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    if (this.fireTimer > 0.32) { this.fireTimer = 0; this.fireWeapons(true); }
    this.bullets.forEach((bullet) => {
      bullet.x += bullet.vx * dt;
      bullet.z += bullet.vz * dt;
      bullet.life -= dt;
      if (bullet.z < -22 && Math.random() < 0.13) {
        this.burst(bullet.x, 0.85, bullet.z, 0xffc675, 3);
        bullet.life = 0;
      }
    });
    this.bullets = this.bullets.filter((bullet) => bullet.life > 0);
    this.updateParticles(dt);
  }

  public update(dt: number) {
    this.screenShake = Math.max(0, this.screenShake - dt * 1.5);
    this.muzzleTimer = Math.max(0, this.muzzleTimer - dt);
    this.shieldTimer = Math.max(0, this.shieldTimer - dt);
    this.freezeTimer = Math.max(0, this.freezeTimer - dt);
    this.questionCooldown = Math.max(0, this.questionCooldown - dt);
    if (this.weaponRemaining > 0) {
      this.weaponRemaining = Math.max(0, this.weaponRemaining - dt);
      if (this.weaponRemaining === 0) this.currentWeapon = 'dual_smg';
    }

    if (this.keys.left) this.targetPlayerX -= dt * 8.5;
    if (this.keys.right) this.targetPlayerX += dt * 8.5;
    this.targetPlayerX = Math.max(-6.1, Math.min(6.1, this.targetPlayerX));
    this.playerX += (this.targetPlayerX - this.playerX) * Math.min(1, dt * 13);

    this.fireTimer += dt;
    const fireInterval = this.currentWeapon === 'gatling_overload' ? 0.075 : this.currentWeapon === 'shotgun_spread' ? 0.42 : this.currentWeapon === 'rocket_barrage' ? 0.55 : 0.21;
    if (this.fireTimer > fireInterval) { this.fireTimer = 0; this.fireWeapons(); }
    this.spawnTimer += dt;
    this.objectTimer += dt;
    this.waveTimer += dt;
    if (this.spawnTimer > Math.max(2.8, 6 - this.wave * 0.3)) {
      this.spawnTimer = 0;
      this.spawnHorde(6 + this.wave * 2);
    }
    if (this.objectTimer > 14) { this.objectTimer = 0; this.spawnObjects(); }
    if (this.waveTimer >= 40) {
      this.waveTimer = 0;
      this.wave++;
      this.score += 500;
      this.hp = Math.min(100, this.hp + 10);
      this.spawnHorde(10 + this.wave * 2);
      if (this.wave % 3 === 0) this.spawnBoss();
      this.onNotice?.(`WAVE ${String(this.wave).padStart(2, '0')}`, this.wave % 3 === 0 ? 'Heavy hostile detected. Stay mobile.' : 'Reinforcements incoming. Keep the perimeter clear.');
    }

    for (const object of [...this.objects]) {
      object.z += dt * 2.7;
      if (object.z > 6.8 && object.z < 10.5 && Math.abs(object.x - this.playerX) < 1.75) {
        this.objects = this.objects.filter((item) => item.id !== object.id);
        if (object.type === 'gate') {
          this.squadSize = Math.min(35, this.squadSize + object.value);
          soundManager.playGateMultiplier();
          this.burst(object.x, 1, object.z, 0x80e8e6, 30);
          this.onNotice?.(`+${object.value} REINFORCEMENTS`, 'Your squad just got stronger.');
        } else if (object.type === 'barrier') {
          this.takeDamage(12);
        } else if (this.questionCooldown <= 0) {
          this.triggerQuestion(object);
          return;
        }
      }
    }
    this.objects = this.objects.filter((object) => object.z < 19);

    for (const enemy of this.enemies) {
      enemy.hitFlash = Math.max(0, enemy.hitFlash - dt * 5);
      if (this.freezeTimer <= 0) {
        enemy.z += enemy.speed * dt;
        if (enemy.z > -8) enemy.x += (this.playerX - enemy.x) * dt * 0.19;
      }
      if (enemy.z > 6.85 && enemy.z < 11.5 && Math.abs(enemy.x - this.playerX) < 1.6) {
        this.takeDamage(enemy.type === 'boss' ? 28 : enemy.type === 'brute' ? 13 : this.audience === 'kid' ? 4 : 7);
        this.burst(enemy.x, 0.85, enemy.z, this.audience === 'kid' ? 0x91e2df : 0xdab887, 14);
        enemy.z = 40;
        if (this.squadSize > 1 && Math.random() < 0.23 && this.shieldTimer === 0) this.squadSize--;
      }
    }
    this.enemies = this.enemies.filter((enemy) => enemy.z < 23);
    if (this.isGameOver) return;

    for (const bullet of this.bullets) {
      const previousZ = bullet.z;
      bullet.x += bullet.vx * dt;
      bullet.z += bullet.vz * dt;
      bullet.life -= dt;
      if (bullet.life <= 0) continue;

      for (const object of this.objects) {
        if (object.type === 'gate' || this.questionCooldown > 0) continue;
        if (Math.abs(bullet.x - object.x) < 0.86 && bullet.z <= object.z + 0.65 && previousZ >= object.z - 0.65) {
          object.hp -= bullet.damage;
          bullet.life = 0;
          this.burst(bullet.x, 1.2, object.z, 0xffd397, 4);
          if (object.hp <= 0) {
            this.objects = this.objects.filter((item) => item.id !== object.id);
            this.score += 100;
            this.burst(object.x, 1.2, object.z, 0xffc76b, 32);
            soundManager.playExplosion();
            if (object.type !== 'barrier') { this.triggerQuestion(object); return; }
          }
          break;
        }
      }
      if (bullet.life <= 0) continue;
      for (const enemy of this.enemies) {
        const radius = enemy.type === 'boss' ? 0.85 : enemy.type === 'brute' ? 0.66 : 0.44;
        // Swept depth checks prevent fast tracers from skipping targets on slower devices.
        if (enemy.hp > 0 && !bullet.hits.has(enemy.id) && Math.abs(bullet.x - enemy.x) < radius && bullet.z <= enemy.z + radius && previousZ >= enemy.z - radius) {
          enemy.hp -= bullet.damage;
          enemy.hitFlash = 1;
          bullet.hits.add(enemy.id);
          this.burst(bullet.x, 1.35, enemy.z, 0xffd399, 4);
          if (bullet.type === 'rocket') {
            this.enemies.forEach((other) => { if (Math.hypot(other.x - enemy.x, other.z - enemy.z) < 3.8) { other.hp -= 22; other.hitFlash = 1; } });
            this.burst(enemy.x, 1.0, enemy.z, 0xffa64c, 50);
            this.screenShake = 0.28;
            soundManager.playExplosion();
          }
          if (bullet.type !== 'plasma') { bullet.life = 0; break; }
        }
      }
    }
    this.bullets = this.bullets.filter((bullet) => bullet.life > 0 && bullet.z > -125);
    this.removeDefeated();
    this.updateParticles(dt);
  }

  private removeDefeated() {
    this.enemies = this.enemies.filter((enemy) => {
      if (enemy.hp > 0) return true;
      this.kills++;
      this.score += enemy.type === 'boss' ? 1200 : enemy.type === 'brute' ? 180 : 75;
      this.burst(enemy.x, 0.85, enemy.z, this.audience === 'kid' ? 0x8cdfd5 : 0xc8ad7b, enemy.type === 'boss' ? 50 : 9);
      return false;
    });
  }

  private takeDamage(amount: number) {
    if (this.shieldTimer > 0 || this.isGameOver) return;
    this.hp = Math.max(0, this.hp - amount);
    this.screenShake = 0.32;
    soundManager.playHit();
    if (this.hp === 0) {
      this.isGameOver = true;
      this.clearInput();
      this.publishStats();
      soundManager.playGameOver();
      this.onGameOver?.();
    }
  }

  private triggerQuestion(object: RoadObject) {
    if (!this.onTriggerQuestion || this.isGameOver || this.isPaused) return;
    this.pause();
    this.questionCooldown = 6;
    this.publishStats();
    this.onTriggerQuestion(object.reward, object.type === 'rescue', object.name);
  }

  private spawnHorde(count: number, preview = false) {
    const max = Math.min(count, 58 - this.enemies.length);
    for (let i = 0; i < max; i++) {
      const type = i % 9 === 0 ? 'brute' : i % 5 === 0 ? 'runner' : 'walker';
      const hp = (type === 'brute' ? 44 : 14) + this.wave * 2;
      this.enemies.push({
        id: this.nextId++, x: (Math.random() - 0.5) * 12.5,
        z: preview ? -15 - Math.random() * 46 : -38 - Math.random() * 40,
        hp, maxHp: hp, speed: (type === 'runner' ? 4.4 : type === 'brute' ? 2.2 : 2.9) + this.wave * 0.13,
        type, phase: Math.random() * Math.PI * 2, hitFlash: 0,
      });
    }
  }

  private spawnBoss() {
    this.enemies.push({ id: this.nextId++, x: 0, z: -42, hp: 230 + this.wave * 50, maxHp: 230 + this.wave * 50, speed: 1.9, type: 'boss', phase: 0, hitFlash: 0 });
  }

  private spawnObjects(initial = false) {
    const sign = Math.random() > 0.5 ? -1 : 1;
    this.objects.push({ id: this.nextId++, x: sign * 3.6, z: initial ? -16 : -28, hp: 1, maxHp: 1, type: 'gate', value: this.wave > 3 ? 8 : 5, reward: 'squad_boost_small' });
    const isRescue = !initial && Math.random() < 0.3;
    const rewards: PowerUpType[] = ['gatling_overload', 'plasma_laser', 'shotgun_spread', 'rocket_barrage', 'energy_shield', 'ice_blizzard'];
    this.objects.push({
      id: this.nextId++, x: -sign * (initial ? 4.8 : 2.8), z: initial ? -35 : -31,
      hp: initial ? 70 : 48, maxHp: initial ? 70 : 48, type: isRescue ? 'rescue' : 'supply', value: 0,
      reward: isRescue ? 'rescue_medic_ally' : rewards[Math.floor(Math.random() * rewards.length)],
      name: isRescue ? (this.wave % 2 ? 'Dr. Elena' : 'Sgt. Maya') : undefined,
    });
  }

  private fireWeapons(preview = false) {
    this.muzzleTimer = 0.07;
    const rocket = this.currentWeapon === 'rocket_barrage';
    const plasma = this.currentWeapon === 'plasma_laser';
    const shotgun = this.currentWeapon === 'shotgun_spread';
    const streams = Math.min(this.squadSize, rocket || plasma ? 2 : 6);
    if (!preview) soundManager.playShoot(plasma ? 'plasma_laser' : rocket ? 'rocket' : 'standard');
    for (let i = 0; i < streams; i++) {
      const origin = squadPosition(i, this.playerX);
      const nearby = this.enemies.filter((enemy) => enemy.z < origin.z && Math.abs(enemy.x - origin.x) < 1.8).sort((a, b) => b.z - a.z)[0];
      const aim = nearby ? Math.max(-2.5, Math.min(2.5, (nearby.x - origin.x - 0.28) * 1.8)) : 0;
      for (let p = 0; p < (shotgun ? 5 : 1); p++) {
        if (this.bullets.length >= 280) break;
        this.bullets.push({
          x: origin.x + 0.28, y: 1.24, z: origin.z - 1.18,
          vx: shotgun ? (p - 2) * 3.4 : aim + (Math.random() - 0.5) * 0.6,
          vz: rocket ? -29 : -48, damage: rocket ? 30 : plasma ? 14 : this.currentWeapon === 'gatling_overload' ? 7 : 5,
          life: 2.9, type: rocket ? 'rocket' : plasma ? 'plasma' : 'round', hits: new Set(),
        });
      }
    }
  }

  private burst(x: number, y: number, z: number, color: number, count: number) {
    for (let i = 0; i < count && this.particles.length < 410; i++) {
      const life = 0.24 + Math.random() * 0.7;
      this.particles.push({ x, y, z, vx: (Math.random() - 0.5) * 6, vy: Math.random() * 4, vz: (Math.random() - 0.5) * 6, life, maxLife: life, size: 0.015 + Math.random() * 0.048, color });
    }
  }

  private updateParticles(dt: number) {
    this.particles.forEach((particle) => {
      particle.x += particle.vx * dt; particle.y += particle.vy * dt; particle.z += particle.vz * dt;
      particle.vy -= 9.5 * dt;
      if (particle.y < 0.04) { particle.y = 0.04; particle.vy = Math.abs(particle.vy) * 0.25; }
      particle.life -= dt;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);
  }

  public applyPowerUp(type: PowerUpType) {
    soundManager.playPowerUp();
    if (['dual_smg', 'shotgun_spread', 'gatling_overload', 'plasma_laser', 'rocket_barrage'].includes(type)) {
      this.currentWeapon = type;
      this.weaponRemaining = POWER_UP_CONFIG[type].durationSeconds || 15;
    } else if (type === 'squad_boost_small') this.squadSize = Math.min(35, this.squadSize + 5);
    else if (type === 'squad_boost_large') this.squadSize = Math.min(35, this.squadSize + 15);
    else if (type === 'rescue_medic_ally') { this.hp = 100; this.squadSize = Math.min(35, this.squadSize + 5); }
    else if (type === 'rescue_sniper_ally') { this.squadSize = Math.min(35, this.squadSize + 3); this.currentWeapon = 'plasma_laser'; this.weaponRemaining = 16; }
    else if (type === 'energy_shield') this.shieldTimer = 10;
    else if (type === 'ice_blizzard') this.freezeTimer = 8;
    else if (type === 'nuke_airstrike') {
      this.enemies.forEach((enemy) => { enemy.hp = 0; });
      this.removeDefeated(); this.screenShake = 0.7; soundManager.playExplosion();
    }
    this.score += 250;
    this.onNotice?.('UPGRADE SECURED', POWER_UP_CONFIG[type].name);
    this.publishStats();
  }

  public pause() { this.isPaused = true; this.clearInput(); }
  public resume() { this.isPaused = false; this.lastTime = performance.now(); }
  public clearInput() { this.keys.left = this.keys.right = this.pointerDown = false; this.targetPlayerX = this.playerX; }
  public resize() { this.visual.resize(); }
  public setGraphics(options: GraphicsOptions) { this.visual.setOptions(options); }
  public handleKeyDown(event: KeyboardEvent) {
    if (this.isPaused || this.isGameOver || this.isPreview) return;
    const target = event.target as HTMLElement;
    if (target.matches('input,textarea,select') || target.isContentEditable) return;
    if (['a', 'A', 'ArrowLeft'].includes(event.key)) { this.keys.left = true; event.preventDefault(); }
    if (['d', 'D', 'ArrowRight'].includes(event.key)) { this.keys.right = true; event.preventDefault(); }
  }
  public handleKeyUp(event: KeyboardEvent) {
    if (['a', 'A', 'ArrowLeft'].includes(event.key)) this.keys.left = false;
    if (['d', 'D', 'ArrowRight'].includes(event.key)) this.keys.right = false;
  }
  public handlePointerDown(clientX: number) {
    if (this.isPaused || this.isPreview || this.isGameOver) return;
    this.pointerDown = true;
    this.targetPlayerX = this.visual.pointerX(clientX);
  }
  public handlePointerMove(clientX: number) { if (this.pointerDown) this.targetPlayerX = this.visual.pointerX(clientX); }
  public handlePointerUp() { this.pointerDown = false; }

  public capture() {
    this.visual.render(this, 0);
    return this.visual.screenshot();
  }

  private publishStats() {
    this.onStatsUpdate?.({ hp: this.hp, squad: this.squadSize, score: this.score, kills: this.kills, wave: this.wave, waveProgress: this.waveTimer / 40, weapon: this.currentWeapon, weaponRemaining: this.weaponRemaining, shield: this.shieldTimer, enemies: this.enemies.length, fps: Math.round(this.fps) });
  }

  public destroy() { this.destroyed = true; cancelAnimationFrame(this.frame); this.clearInput(); this.visual.dispose(); }
}