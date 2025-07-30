/**
 * LODManager - Level of Detail system for performance optimization
 */

import * as THREE from 'three';
import { EventManager } from './EventManager';
import { StateManager } from './StateManager';
import { District } from '@/components/District';
import { Building } from '@/components/Building';

export interface LODConfig {
  enableLOD: boolean;
  distances: [number, number, number]; // [high, medium, low]
  enableFrustumCulling: boolean;
  enableOcclusionCulling: boolean;
  updateFrequency: number; // Hz
}

export interface LODObject {
  object: THREE.Object3D;
  component?: District | Building;
  boundingSphere: THREE.Sphere;
  lastDistance: number;
  lastLODLevel: 'high' | 'medium' | 'low' | 'culled';
  isVisible: boolean;
  forceUpdate: boolean;
}

export class LODManager {
  private config: LODConfig;
  private eventManager: EventManager;
  private stateManager: StateManager;

  // LOD objects tracking
  private lodObjects: Map<string, LODObject> = new Map();
  private visibleObjects: Set<string> = new Set();

  // Culling
  private frustum: THREE.Frustum = new THREE.Frustum();
  private cameraMatrix: THREE.Matrix4 = new THREE.Matrix4();

  // Update timing
  private lastUpdateTime: number = 0;
  private updateInterval: number;

  // Performance tracking
  private stats = {
    totalObjects: 0,
    visibleObjects: 0,
    culledObjects: 0,
    lodLevels: {
      high: 0,
      medium: 0,
      low: 0
    },
    lastUpdateDuration: 0
  };

  constructor(
    eventManager: EventManager,
    stateManager: StateManager,
    config: Partial<LODConfig> = {}
  ) {
    this.eventManager = eventManager;
    this.stateManager = stateManager;
    
    this.config = {
      enableLOD: true,
      distances: [50, 100, 200],
      enableFrustumCulling: true,
      enableOcclusionCulling: false,
      updateFrequency: 30, // 30 Hz
      ...config
    };

    this.updateInterval = 1000 / this.config.updateFrequency;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for quality changes
    this.eventManager.on('performance:quality-change', (event) => {
      this.adjustQualitySettings(event.data.to);
    });

    // Listen for view mode changes
    this.stateManager.subscribe('viewMode', (newMode, oldMode) => {
      this.handleViewModeChange(newMode);
    });

    // Listen for camera changes
    this.eventManager.on('camera:move', () => {
      this.markAllForUpdate();
    });
  }

  private adjustQualitySettings(quality: 'low' | 'medium' | 'high'): void {
    switch (quality) {
      case 'low':
        this.config.distances = [75, 150, 300];
        this.config.updateFrequency = 15;
        break;
      case 'medium':
        this.config.distances = [60, 120, 250];
        this.config.updateFrequency = 20;
        break;
      case 'high':
        this.config.distances = [50, 100, 200];
        this.config.updateFrequency = 30;
        break;
    }

    this.updateInterval = 1000 / this.config.updateFrequency;
    this.markAllForUpdate();
  }

  private handleViewModeChange(viewMode: 'city' | 'network' | 'transition'): void {
    // Adjust LOD distances based on view mode
    const baseDistances = this.config.distances;
    
    switch (viewMode) {
      case 'city':
        this.config.distances = [
          baseDistances[0] * 1.2,
          baseDistances[1] * 1.2,
          baseDistances[2] * 1.2
        ] as [number, number, number];
        break;
      case 'network':
        this.config.distances = [
          baseDistances[0] * 0.6,
          baseDistances[1] * 0.6,
          baseDistances[2] * 0.6
        ] as [number, number, number];
        break;
      case 'transition':
        // Use default distances
        break;
    }

    this.markAllForUpdate();
  }

  public addObject(object: THREE.Object3D, component?: District | Building): void {
    const id = object.uuid;
    
    // Calculate bounding sphere
    const boundingSphere = new THREE.Sphere();
    
    if (object.geometry) {
      object.geometry.computeBoundingSphere();
      if (object.geometry.boundingSphere) {
        boundingSphere.copy(object.geometry.boundingSphere);
      }
    } else {
      // For groups, calculate from children
      const box = new THREE.Box3().setFromObject(object);
      box.getBoundingSphere(boundingSphere);
    }

    const lodObject: LODObject = {
      object,
      component,
      boundingSphere,
      lastDistance: Infinity,
      lastLODLevel: 'high',
      isVisible: true,
      forceUpdate: true
    };

    this.lodObjects.set(id, lodObject);
    this.stats.totalObjects++;

    this.eventManager.emit('lod:object-added', {
      type: 'lod:object-added',
      data: { objectId: id, hasComponent: !!component }
    });
  }

  public addObjects(objects: (District | Building)[]): void {
    objects.forEach(obj => {
      if ('group' in obj) {
        this.addObject(obj.group, obj);
      }
    });
  }

  public removeObject(objectId: string): void {
    if (this.lodObjects.delete(objectId)) {
      this.visibleObjects.delete(objectId);
      this.stats.totalObjects--;

      this.eventManager.emit('lod:object-removed', {
        type: 'lod:object-removed',
        data: { objectId }
      });
    }
  }

  public update(cameraPosition: THREE.Vector3, camera?: THREE.Camera): void {
    const now = performance.now();
    
    // Throttle updates based on frequency
    if (now - this.lastUpdateTime < this.updateInterval) {
      return;
    }

    const startTime = performance.now();

    // Update frustum if camera provided
    if (camera && this.config.enableFrustumCulling) {
      this.updateFrustum(camera);
    }

    // Reset stats
    this.stats.visibleObjects = 0;
    this.stats.culledObjects = 0;
    this.stats.lodLevels = { high: 0, medium: 0, low: 0 };

    // Update each LOD object
    this.lodObjects.forEach((lodObject, id) => {
      this.updateLODObject(lodObject, cameraPosition, camera);
    });

    // Update timing
    this.lastUpdateTime = now;
    this.stats.lastUpdateDuration = performance.now() - startTime;

    // Emit performance stats
    this.eventManager.emit('lod:stats-update', {
      type: 'lod:stats-update',
      data: { ...this.stats }
    });
  }

  private updateFrustum(camera: THREE.Camera): void {
    this.cameraMatrix.multiplyMatrices(
      camera.projectionMatrix,
      camera.matrixWorldInverse
    );
    this.frustum.setFromProjectionMatrix(this.cameraMatrix);
  }

  private updateLODObject(
    lodObject: LODObject,
    cameraPosition: THREE.Vector3,
    camera?: THREE.Camera
  ): void {
    const { object, component, boundingSphere } = lodObject;
    
    // Get world position
    const worldPosition = new THREE.Vector3();
    object.getWorldPosition(worldPosition);
    
    // Calculate distance to camera
    const distance = cameraPosition.distanceTo(worldPosition);
    
    // Check if update is needed
    const distanceChanged = Math.abs(distance - lodObject.lastDistance) > 5;
    if (!lodObject.forceUpdate && !distanceChanged) {
      return;
    }

    lodObject.lastDistance = distance;
    lodObject.forceUpdate = false;

    // Frustum culling
    let isInFrustum = true;
    if (camera && this.config.enableFrustumCulling) {
      // Transform bounding sphere to world space
      const worldBoundingSphere = boundingSphere.clone();
      worldBoundingSphere.center.add(worldPosition);
      
      isInFrustum = this.frustum.intersectsSphere(worldBoundingSphere);
    }

    if (!isInFrustum) {
      // Object is outside frustum - cull it
      this.setObjectVisibility(lodObject, false);
      lodObject.lastLODLevel = 'culled';
      this.stats.culledObjects++;
      return;
    }

    // Determine LOD level based on distance
    const [highDist, mediumDist, lowDist] = this.config.distances;
    let newLODLevel: 'high' | 'medium' | 'low';

    if (distance <= highDist) {
      newLODLevel = 'high';
      this.stats.lodLevels.high++;
    } else if (distance <= mediumDist) {
      newLODLevel = 'medium';
      this.stats.lodLevels.medium++;
    } else if (distance <= lowDist) {
      newLODLevel = 'low';
      this.stats.lodLevels.low++;
    } else {
      // Too far - cull
      this.setObjectVisibility(lodObject, false);
      lodObject.lastLODLevel = 'culled';
      this.stats.culledObjects++;
      return;
    }

    // Object is visible
    this.setObjectVisibility(lodObject, true);
    this.stats.visibleObjects++;

    // Apply LOD level if changed
    if (newLODLevel !== lodObject.lastLODLevel || lodObject.forceUpdate) {
      this.applyLODLevel(lodObject, newLODLevel, distance);
      lodObject.lastLODLevel = newLODLevel;
    }
  }

  private setObjectVisibility(lodObject: LODObject, visible: boolean): void {
    if (lodObject.isVisible === visible) return;

    lodObject.object.visible = visible;
    lodObject.isVisible = visible;

    const id = lodObject.object.uuid;
    if (visible) {
      this.visibleObjects.add(id);
    } else {
      this.visibleObjects.delete(id);
    }
  }

  private applyLODLevel(
    lodObject: LODObject,
    level: 'high' | 'medium' | 'low',
    distance: number
  ): void {
    const { component } = lodObject;

    // Apply LOD to component if available
    if (component && 'setLOD' in component) {
      component.setLOD(distance, this.config.distances);
    }

    // Apply generic LOD based on object type
    this.applyGenericLOD(lodObject.object, level);

    this.eventManager.emit('lod:level-change', {
      type: 'lod:level-change',
      data: {
        objectId: lodObject.object.uuid,
        level,
        distance
      }
    });
  }

  private applyGenericLOD(object: THREE.Object3D, level: 'high' | 'medium' | 'low'): void {
    // Apply LOD to materials
    object.traverse((child) => {
      if (child instanceof THREE.Mesh && child.material) {
        const material = child.material as THREE.Material;
        
        switch (level) {
          case 'high':
            // Full quality
            if ('roughness' in material) (material as any).roughness = 0.3;
            if ('metalness' in material) (material as any).metalness = 0.8;
            break;
          case 'medium':
            // Reduced quality
            if ('roughness' in material) (material as any).roughness = 0.5;
            if ('metalness' in material) (material as any).metalness = 0.5;
            break;
          case 'low':
            // Low quality
            if ('roughness' in material) (material as any).roughness = 0.8;
            if ('metalness' in material) (material as any).metalness = 0.2;
            break;
        }
      }
    });
  }

  // Public API
  public setDistances(distances: [number, number, number]): void {
    this.config.distances = distances;
    this.markAllForUpdate();
  }

  public setUpdateFrequency(frequency: number): void {
    this.config.updateFrequency = Math.max(5, Math.min(60, frequency));
    this.updateInterval = 1000 / this.config.updateFrequency;
  }

  public enableFrustumCulling(enabled: boolean): void {
    this.config.enableFrustumCulling = enabled;
    this.markAllForUpdate();
  }

  public markAllForUpdate(): void {
    this.lodObjects.forEach(lodObject => {
      lodObject.forceUpdate = true;
    });
  }

  public markObjectForUpdate(objectId: string): void {
    const lodObject = this.lodObjects.get(objectId);
    if (lodObject) {
      lodObject.forceUpdate = true;
    }
  }

  public getVisibleObjects(): string[] {
    return Array.from(this.visibleObjects);
  }

  public getObjectLODLevel(objectId: string): 'high' | 'medium' | 'low' | 'culled' | null {
    const lodObject = this.lodObjects.get(objectId);
    return lodObject ? lodObject.lastLODLevel : null;
  }

  public getStats(): typeof this.stats {
    return { ...this.stats };
  }

  public getObjectCount(): number {
    return this.lodObjects.size;
  }

  public getVisibleCount(): number {
    return this.visibleObjects.size;
  }

  // Debug
  public debug(): void {
    console.group('👁️ LODManager Debug');
    console.log('Config:', this.config);
    console.log('Total Objects:', this.stats.totalObjects);
    console.log('Visible Objects:', this.stats.visibleObjects);
    console.log('Culled Objects:', this.stats.culledObjects);
    console.log('LOD Levels:', this.stats.lodLevels);
    console.log('Last Update Duration:', this.stats.lastUpdateDuration.toFixed(2), 'ms');
    console.log('Update Frequency:', this.config.updateFrequency, 'Hz');
    console.groupEnd();
  }

  public visualizeDebug(scene: THREE.Scene): void {
    // Add debug wireframes to show LOD levels
    this.lodObjects.forEach((lodObject, id) => {
      const { object, lastLODLevel } = lodObject;
      
      // Remove existing debug wireframe
      const existingWireframe = object.getObjectByName(`debug-wireframe-${id}`);
      if (existingWireframe) {
        object.remove(existingWireframe);
      }

      if (lastLODLevel === 'culled') return;

      // Create wireframe based on LOD level
      let color: number;
      switch (lastLODLevel) {
        case 'high': color = 0x00ff00; break;
        case 'medium': color = 0xffff00; break;
        case 'low': color = 0xff0000; break;
        default: color = 0x888888; break;
      }

      const wireframeGeometry = new THREE.EdgesGeometry(object.geometry);
      const wireframeMaterial = new THREE.LineBasicMaterial({ color });
      const wireframe = new THREE.LineSegments(wireframeGeometry, wireframeMaterial);
      wireframe.name = `debug-wireframe-${id}`;
      
      object.add(wireframe);
    });
  }

  // Cleanup
  public dispose(): void {
    this.lodObjects.clear();
    this.visibleObjects.clear();
    
    // Reset stats
    this.stats = {
      totalObjects: 0,
      visibleObjects: 0,
      culledObjects: 0,
      lodLevels: { high: 0, medium: 0, low: 0 },
      lastUpdateDuration: 0
    };
  }
}
