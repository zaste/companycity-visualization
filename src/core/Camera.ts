/**
 * Camera Controller - Advanced camera management with smooth transitions
 */

import * as THREE from 'three';
import { CameraState, ViewMode, Vector3 } from '@/types';
import { ANIMATION_CONFIG, MIN_CAMERA_DISTANCE, MAX_CAMERA_DISTANCE } from '@/config';

export interface CameraConfig {
  fov: number;
  near: number;
  far: number;
  aspect: number;
  initialDistance: number;
  smoothing: number;
}

export interface CameraTarget {
  position: Vector3;
  lookAt: Vector3;
  transition?: boolean;
  duration?: number;
}

export class Camera {
  public readonly camera: THREE.PerspectiveCamera;
  
  private state: CameraState;
  private targetState: CameraState;
  private config: CameraConfig;
  private transitionProgress: number = 0;
  private isTransitioning: boolean = false;
  private transitionDuration: number = 1000;
  private transitionStart: number = 0;
  
  constructor(config: CameraConfig) {
    this.config = config;
    
    this.camera = new THREE.PerspectiveCamera(
      config.fov,
      config.aspect,
      config.near,
      config.far
    );
    
    // Initialize states
    this.state = {
      distance: config.initialDistance,
      angle: 0,
      elevation: Math.PI * 0.35,
      target: { x: 0, y: 0, z: 0 },
      fov: config.fov,
    };
    
    this.targetState = { ...this.state };
    
    this.updatePosition();
  }

  private updatePosition(): void {
    const { distance, angle, elevation, target } = this.state;
    
    // Calculate spherical coordinates
    const x = Math.sin(angle) * Math.cos(elevation) * distance;
    const y = Math.sin(elevation) * distance;
    const z = Math.cos(angle) * Math.cos(elevation) * distance;
    
    this.camera.position.set(
      target.x + x,
      target.y + y,
      target.z + z
    );
    
    this.camera.lookAt(target.x, target.y, target.z);
    this.camera.updateMatrixWorld();
  }

  public update(deltaTime: number): void {
    let needsUpdate = false;
    
    // Handle transitions
    if (this.isTransitioning) {
      needsUpdate = this.updateTransition(deltaTime) || needsUpdate;
    }
    
    // Smooth movement to target
    const smoothing = this.config.smoothing;
    
    // Distance smoothing
    const distanceDiff = this.targetState.distance - this.state.distance;
    if (Math.abs(distanceDiff) > 0.01) {
      this.state.distance += distanceDiff * smoothing;
      needsUpdate = true;
    }
    
    // Angle smoothing
    let angleDiff = this.targetState.angle - this.state.angle;
    // Handle angle wrapping
    if (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    if (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
    
    if (Math.abs(angleDiff) > 0.001) {
      this.state.angle += angleDiff * smoothing;
      needsUpdate = true;
    }
    
    // Elevation smoothing
    const elevationDiff = this.targetState.elevation - this.state.elevation;
    if (Math.abs(elevationDiff) > 0.001) {
      this.state.elevation += elevationDiff * smoothing;
      needsUpdate = true;
    }
    
    // Target smoothing
    const targetDiff = {
      x: this.targetState.target.x - this.state.target.x,
      y: this.targetState.target.y - this.state.target.y,
      z: this.targetState.target.z - this.state.target.z,
    };
    
    if (Math.abs(targetDiff.x) > 0.01 || Math.abs(targetDiff.y) > 0.01 || Math.abs(targetDiff.z) > 0.01) {
      this.state.target.x += targetDiff.x * smoothing;
      this.state.target.y += targetDiff.y * smoothing;
      this.state.target.z += targetDiff.z * smoothing;
      needsUpdate = true;
    }
    
    // FOV smoothing
    const fovDiff = this.targetState.fov - this.state.fov;
    if (Math.abs(fovDiff) > 0.1) {
      this.state.fov += fovDiff * smoothing;
      this.camera.fov = this.state.fov;
      this.camera.updateProjectionMatrix();
      needsUpdate = true;
    }
    
    if (needsUpdate) {
      this.updatePosition();
    }
  }

  private updateTransition(deltaTime: number): boolean {
    const elapsed = Date.now() - this.transitionStart;
    this.transitionProgress = Math.min(elapsed / this.transitionDuration, 1);
    
    if (this.transitionProgress >= 1) {
      this.isTransitioning = false;
      this.transitionProgress = 0;
      return false;
    }
    
    return true;
  }

  public setDistance(distance: number, smooth: boolean = true): void {
    const clampedDistance = Math.max(MIN_CAMERA_DISTANCE, Math.min(MAX_CAMERA_DISTANCE, distance));
    
    if (smooth) {
      this.targetState.distance = clampedDistance;
    } else {
      this.state.distance = clampedDistance;
      this.targetState.distance = clampedDistance;
      this.updatePosition();
    }
  }

  public setAngle(angle: number, smooth: boolean = true): void {
    if (smooth) {
      this.targetState.angle = angle;
    } else {
      this.state.angle = angle;
      this.targetState.angle = angle;
      this.updatePosition();
    }
  }

  public setElevation(elevation: number, smooth: boolean = true): void {
    const clampedElevation = Math.max(0.1, Math.min(Math.PI / 2.5, elevation));
    
    if (smooth) {
      this.targetState.elevation = clampedElevation;
    } else {
      this.state.elevation = clampedElevation;
      this.targetState.elevation = clampedElevation;
      this.updatePosition();
    }
  }

  public setTarget(target: Vector3, smooth: boolean = true): void {
    if (smooth) {
      this.targetState.target = { ...target };
    } else {
      this.state.target = { ...target };
      this.targetState.target = { ...target };
      this.updatePosition();
    }
  }

  public setFOV(fov: number, smooth: boolean = true): void {
    const clampedFOV = Math.max(10, Math.min(120, fov));
    
    if (smooth) {
      this.targetState.fov = clampedFOV;
    } else {
      this.state.fov = clampedFOV;
      this.targetState.fov = clampedFOV;
      this.camera.fov = clampedFOV;
      this.camera.updateProjectionMatrix();
    }
  }

  public orbit(deltaAngle: number, deltaElevation: number): void {
    this.setAngle(this.targetState.angle + deltaAngle);
    this.setElevation(this.targetState.elevation + deltaElevation);
  }

  public zoom(factor: number): void {
    this.setDistance(this.targetState.distance * factor);
  }

  public zoomIn(amount: number = 0.9): void {
    this.zoom(amount);
  }

  public zoomOut(amount: number = 1.1): void {
    this.zoom(amount);
  }

  public focusOn(
    position: Vector3, 
    distance?: number, 
    transition: boolean = true
  ): void {
    if (transition) {
      this.startTransition(1000);
    }
    
    this.setTarget(position, transition);
    
    if (distance !== undefined) {
      this.setDistance(distance, transition);
    }
  }

  public setViewMode(mode: ViewMode, transition: boolean = true): void {
    const presets = this.getViewModePresets(mode);
    
    if (transition) {
      this.startTransition(ANIMATION_CONFIG.viewTransitionDuration);
    }
    
    this.setDistance(presets.distance, transition);
    this.setAngle(presets.angle, transition);
    this.setElevation(presets.elevation, transition);
    this.setFOV(presets.fov, transition);
  }

  private getViewModePresets(mode: ViewMode) {
    switch (mode) {
      case 'city':
        return {
          distance: 140,
          angle: 0,
          elevation: Math.PI * 0.35,
          fov: 45,
        };
      case 'network':
        return {
          distance: 80,
          angle: 0,
          elevation: Math.PI * 0.4,
          fov: 50,
        };
      case 'transition':
        return {
          distance: 110,
          angle: 0,
          elevation: Math.PI * 0.37,
          fov: 47,
        };
      default:
        return {
          distance: 140,
          angle: 0,
          elevation: Math.PI * 0.35,
          fov: 45,
        };
    }
  }

  public reset(transition: boolean = true): void {
    if (transition) {
      this.startTransition(1000);
    }
    
    this.setDistance(this.config.initialDistance, transition);
    this.setAngle(0, transition);
    this.setElevation(Math.PI * 0.35, transition);
    this.setTarget({ x: 0, y: 0, z: 0 }, transition);
    this.setFOV(this.config.fov, transition);
  }

  public startTransition(duration: number = 1000): void {
    this.isTransitioning = true;
    this.transitionDuration = duration;
    this.transitionStart = Date.now();
    this.transitionProgress = 0;
  }

  public stopTransition(): void {
    this.isTransitioning = false;
    this.transitionProgress = 0;
  }

  public updateAspect(aspect: number): void {
    this.config.aspect = aspect;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }

  public screenToWorld(screenX: number, screenY: number, z: number = 0): THREE.Vector3 {
    const vector = new THREE.Vector3(screenX, screenY, z);
    vector.unproject(this.camera);
    return vector;
  }

  public worldToScreen(worldPosition: THREE.Vector3): THREE.Vector2 {
    const vector = worldPosition.clone();
    vector.project(this.camera);
    return new THREE.Vector2(vector.x, vector.y);
  }

  public getRay(screenX: number, screenY: number): THREE.Ray {
    const origin = this.camera.position.clone();
    const direction = this.screenToWorld(screenX, screenY, 1)
      .sub(this.camera.position)
      .normalize();
    
    return new THREE.Ray(origin, direction);
  }

  public getDistanceToTarget(): number {
    return this.camera.position.distanceTo(
      new THREE.Vector3(this.state.target.x, this.state.target.y, this.state.target.z)
    );
  }

  public getCurrentViewMode(): ViewMode {
    const distance = this.state.distance;
    
    if (distance > 150) return 'city';
    if (distance < 100) return 'network';
    return 'transition';
  }

  public isMoving(): boolean {
    const threshold = 0.01;
    
    return (
      Math.abs(this.targetState.distance - this.state.distance) > threshold ||
      Math.abs(this.targetState.angle - this.state.angle) > threshold ||
      Math.abs(this.targetState.elevation - this.state.elevation) > threshold ||
      Math.abs(this.targetState.target.x - this.state.target.x) > threshold ||
      Math.abs(this.targetState.target.y - this.state.target.y) > threshold ||
      Math.abs(this.targetState.target.z - this.state.target.z) > threshold ||
      this.isTransitioning
    );
  }

  // Getters
  public get state(): CameraState {
    return { ...this.state };
  }

  public get targetState(): CameraState {
    return { ...this.targetState };
  }

  public get position(): THREE.Vector3 {
    return this.camera.position.clone();
  }

  public get direction(): THREE.Vector3 {
    return this.camera.getWorldDirection(new THREE.Vector3());
  }

  public get up(): THREE.Vector3 {
    return this.camera.up.clone();
  }

  public get right(): THREE.Vector3 {
    return this.direction.cross(this.up).normalize();
  }

  public get isInTransition(): boolean {
    return this.isTransitioning;
  }

  public get transitionState(): number {
    return this.transitionProgress;
  }
}
