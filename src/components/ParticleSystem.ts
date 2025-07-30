/**
 * ParticleSystem Component - Advanced particle effects with object pooling
 */

import * as THREE from 'three';
import { ExtendedGroup, ExtendedMesh, Vector3, ParticleType } from '@/types';
import { ObjectPool } from '@/utils';
import { PARTICLE_CONFIGS } from '@/config';

export interface ParticleConfig {
  maxParticles: number;
  spawnRate: number;
  enablePhysics: boolean;
  enableCollisions: boolean;
  quality: 'low' | 'medium' | 'high';
}

export interface ParticleData {
  id: string;
  type: ParticleType;
  position: Vector3;
  velocity: Vector3;
  life: number;
  maxLife: number;
  size: number;
  color: number;
  trail?: TrailData;
}

export interface TrailData {
  positions: Vector3[];
  maxLength: number;
  fadeRate: number;
}

export class DataParticle {
  public mesh: ExtendedMesh;
  public data: ParticleData;
  public trail?: THREE.Line;
  private trailGeometry?: THREE.BufferGeometry;
  private trailMaterial?: THREE.LineBasicMaterial;
  
  constructor(data: ParticleData) {
    this.data = data;
    this.createMesh();
    if (data.trail) {
      this.createTrail();
    }
  }

  private createMesh(): void {
    const config = PARTICLE_CONFIGS[this.data.type] || PARTICLE_CONFIGS.default;
    
    const geometry = new THREE.SphereGeometry(this.data.size, config.segments, config.segments);
    const material = new THREE.MeshBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0.8
    });

    this.mesh = new THREE.Mesh(geometry, material) as ExtendedMesh;
    this.mesh.position.copy(this.data.position);
    
    this.mesh.userData = {
      id: this.data.id,
      type: 'particle',
      component: this,
      particleType: this.data.type
    };
  }

  private createTrail(): void {
    if (!this.data.trail) return;

    const maxPoints = this.data.trail.maxLength;
    const positions = new Float32Array(maxPoints * 3);
    
    // Initialize with current position
    for (let i = 0; i < maxPoints; i++) {
      positions[i * 3] = this.data.position.x;
      positions[i * 3 + 1] = this.data.position.y;
      positions[i * 3 + 2] = this.data.position.z;
    }

    this.trailGeometry = new THREE.BufferGeometry();
    this.trailGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    this.trailMaterial = new THREE.LineBasicMaterial({
      color: this.data.color,
      transparent: true,
      opacity: 0.3
    });

    this.trail = new THREE.Line(this.trailGeometry, this.trailMaterial);
  }

  public update(deltaTime: number): boolean {
    // Update life
    this.data.life -= deltaTime;
    if (this.data.life <= 0) {
      return false; // Mark for removal
    }

    // Update position
    this.data.position.x += this.data.velocity.x * deltaTime;
    this.data.position.y += this.data.velocity.y * deltaTime;
    this.data.position.z += this.data.velocity.z * deltaTime;

    this.mesh.position.copy(this.data.position);

    // Update opacity based on life
    const lifeRatio = this.data.life / this.data.maxLife;
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.opacity = 0.8 * lifeRatio;

    // Update trail
    if (this.trail && this.trailGeometry && this.data.trail) {
      this.updateTrail();
    }

    // Apply physics
    if (this.data.velocity.y > -10) {
      this.data.velocity.y -= 9.8 * deltaTime * 0.1; // Gravity
    }

    return true; // Keep alive
  }

  private updateTrail(): void {
    if (!this.trailGeometry || !this.data.trail) return;

    const positions = this.trailGeometry.attributes.position.array as Float32Array;
    const maxPoints = this.data.trail.maxLength;

    // Shift existing points
    for (let i = maxPoints - 1; i > 0; i--) {
      positions[i * 3] = positions[(i - 1) * 3];
      positions[i * 3 + 1] = positions[(i - 1) * 3 + 1];
      positions[i * 3 + 2] = positions[(i - 1) * 3 + 2];
    }

    // Add new point at the beginning
    positions[0] = this.data.position.x;
    positions[1] = this.data.position.y;
    positions[2] = this.data.position.z;

    this.trailGeometry.attributes.position.needsUpdate = true;

    // Update trail opacity
    if (this.trailMaterial) {
      const lifeRatio = this.data.life / this.data.maxLife;
      this.trailMaterial.opacity = 0.3 * lifeRatio;
    }
  }

  public reset(data: ParticleData): void {
    this.data = data;
    this.mesh.position.copy(data.position);
    
    const material = this.mesh.material as THREE.MeshBasicMaterial;
    material.color.setHex(data.color);
    material.opacity = 0.8;

    // Reset trail if exists
    if (this.trail && this.trailGeometry && data.trail) {
      const positions = this.trailGeometry.attributes.position.array as Float32Array;
      for (let i = 0; i < positions.length; i += 3) {
        positions[i] = data.position.x;
        positions[i + 1] = data.position.y;
        positions[i + 2] = data.position.z;
      }
      this.trailGeometry.attributes.position.needsUpdate = true;
    }
  }

  public dispose(): void {
    if (this.mesh.geometry) this.mesh.geometry.dispose();
    if (this.mesh.material) {
      (this.mesh.material as THREE.Material).dispose();
    }
    if (this.trailGeometry) this.trailGeometry.dispose();
    if (this.trailMaterial) this.trailMaterial.dispose();
  }
}

export class ParticleSystem {
  public readonly group: ExtendedGroup;
  private config: ParticleConfig;
  private particlePool: ObjectPool<DataParticle>;
  private activeParticles: Set<DataParticle> = new Set();
  private spawnTimer: number = 0;
  private enabled: boolean = true;

  constructor(config: ParticleConfig) {
    this.config = config;
    this.group = new THREE.Group() as ExtendedGroup;
    
    this.group.userData = {
      id: 'particle-system',
      type: 'particle-system',
      component: this
    };

    // Initialize particle pool
    this.particlePool = new ObjectPool(
      () => this.createParticle(),
      (particle) => this.resetParticle(particle),
      Math.min(50, config.maxParticles)
    );
  }

  private createParticle(): DataParticle {
    const data: ParticleData = {
      id: '',
      type: 'data-flow',
      position: { x: 0, y: 0, z: 0 },
      velocity: { x: 0, y: 0, z: 0 },
      life: 1,
      maxLife: 1,
      size: 0.5,
      color: 0x8b5cf6
    };
    return new DataParticle(data);
  }

  private resetParticle(particle: DataParticle): void {
    // Remove from scene
    this.group.remove(particle.mesh);
    if (particle.trail) {
      this.group.remove(particle.trail);
    }
  }

  public spawnParticle(
    from: Vector3,
    to: Vector3,
    type: ParticleType = 'data-flow',
    color: number = 0x8b5cf6
  ): DataParticle | null {
    if (this.activeParticles.size >= this.config.maxParticles) {
      return null;
    }

    const particle = this.particlePool.acquire();
    if (!particle) return null;

    // Calculate trajectory
    const direction = {
      x: to.x - from.x,
      y: to.y - from.y,
      z: to.z - from.z
    };
    
    const distance = Math.sqrt(direction.x ** 2 + direction.y ** 2 + direction.z ** 2);
    const speed = 30 + Math.random() * 20; // Variable speed
    const travelTime = distance / speed;

    // Create bezier curve for smooth movement
    const midPoint = {
      x: (from.x + to.x) / 2,
      y: Math.max(from.y, to.y) + 15 + Math.random() * 10,
      z: (from.z + to.z) / 2
    };

    const particleData: ParticleData = {
      id: `particle-${Date.now()}-${Math.random()}`,
      type,
      position: { ...from },
      velocity: {
        x: direction.x / travelTime,
        y: direction.y / travelTime,
        z: direction.z / travelTime
      },
      life: travelTime,
      maxLife: travelTime,
      size: this.getParticleSize(type),
      color,
      trail: this.shouldHaveTrail(type) ? {
        positions: [],
        maxLength: 10,
        fadeRate: 0.1
      } : undefined
    };

    particle.reset(particleData);

    // Add to scene
    this.group.add(particle.mesh);
    if (particle.trail) {
      this.group.add(particle.trail);
    }

    this.activeParticles.add(particle);
    return particle;
  }

  private getParticleSize(type: ParticleType): number {
    const config = PARTICLE_CONFIGS[type] || PARTICLE_CONFIGS.default;
    return config.baseSize + Math.random() * config.sizeVariation;
  }

  private shouldHaveTrail(type: ParticleType): boolean {
    const config = PARTICLE_CONFIGS[type] || PARTICLE_CONFIGS.default;
    return config.hasTrail && this.config.quality !== 'low';
  }

  public update(deltaTime: number): void {
    if (!this.enabled) return;

    // Update spawn timer
    this.spawnTimer += deltaTime;

    // Update active particles
    const particlesToRemove: DataParticle[] = [];
    
    this.activeParticles.forEach(particle => {
      if (!particle.update(deltaTime)) {
        particlesToRemove.push(particle);
      }
    });

    // Remove dead particles
    particlesToRemove.forEach(particle => {
      this.activeParticles.delete(particle);
      this.particlePool.release(particle);
    });
  }

  public spawnDataFlow(
    fromDistrict: Vector3,
    toDistrict: Vector3,
    color: number = 0x8b5cf6
  ): void {
    if (this.spawnTimer < 1 / this.config.spawnRate) return;
    
    this.spawnParticle(fromDistrict, toDistrict, 'data-flow', color);
    this.spawnTimer = 0;
  }

  public spawnBurst(
    center: Vector3,
    count: number,
    type: ParticleType = 'energy',
    color: number = 0x00ff88
  ): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 10 + Math.random() * 20;
      
      const target = {
        x: center.x + Math.cos(angle) * radius,
        y: center.y + Math.random() * 10,
        z: center.z + Math.sin(angle) * radius
      };

      this.spawnParticle(center, target, type, color);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.group.visible = enabled;
  }

  public setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.config.quality = quality;
    
    // Adjust max particles based on quality
    switch (quality) {
      case 'low':
        this.config.maxParticles = 50;
        this.config.spawnRate = 2;
        break;
      case 'medium':
        this.config.maxParticles = 100;
        this.config.spawnRate = 5;
        break;
      case 'high':
        this.config.maxParticles = 200;
        this.config.spawnRate = 10;
        break;
    }
  }

  public clearAllParticles(): void {
    this.activeParticles.forEach(particle => {
      this.particlePool.release(particle);
    });
    this.activeParticles.clear();
  }

  public getActiveCount(): number {
    return this.activeParticles.size;
  }

  public getMaxCount(): number {
    return this.config.maxParticles;
  }

  public dispose(): void {
    this.clearAllParticles();
    
    // Dispose pool
    this.particlePool.releaseAll();
    
    // Remove from parent
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
  }
}
