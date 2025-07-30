/**
 * Building Component - Individual building with animations and effects
 */

import * as THREE from 'three';
import { NodeData, NodeId, NodeType, ExtendedGroup, ExtendedMesh } from '@/types';
import { geometryFactory, materialFactory } from '@/utils';
import { NODE_TYPE_CONFIGS } from '@/config';

export interface BuildingConfig {
  enableShadows: boolean;
  enableAnimations: boolean;
  quality: 'low' | 'medium' | 'high';
  scale: number;
}

export interface BuildingEffects {
  windows: THREE.Mesh[];
  beacon: THREE.Mesh;
  activity: THREE.Mesh;
  trails: THREE.Object3D[];
}

export class Building {
  public readonly group: ExtendedGroup;
  public readonly data: NodeData;
  
  private config: BuildingConfig;
  private mainStructure?: ExtendedMesh;
  private effects: BuildingEffects;
  private districtColor: number;
  private isSelected: boolean = false;
  private isHovered: boolean = false;
  private isParentSelected: boolean = false;
  private pulseOffset: number;

  constructor(data: NodeData, districtColor: number, config: BuildingConfig) {
    this.data = data;
    this.districtColor = districtColor;
    this.config = config;
    this.pulseOffset = Math.random() * Math.PI * 2;
    
    this.group = new THREE.Group() as ExtendedGroup;
    this.group.userData = {
      id: data.id,
      type: 'building',
      component: this,
      data: data,
      nodeType: data.type,
    };
    
    this.effects = {
      windows: [],
      beacon: new THREE.Mesh(),
      activity: new THREE.Mesh(),
      trails: [],
    };
    
    this.initialize();
  }

  private initialize(): void {
    this.createMainStructure();
    this.createWindows();
    this.createBeacon();
    this.createActivityIndicator();
    
    if (this.config.enableAnimations && this.config.quality !== 'low') {
      this.createTrailEffects();
    }
  }

  private createMainStructure(): void {
    const baseSize = 6 + Math.random() * 4;
    const height = 10 + Math.random() * 15;
    const nodeType = this.data.type || 'service';
    
    // Get geometry based on node type
    const shapeType = NODE_TYPE_CONFIGS[nodeType]?.shape || 'cylinder';
    let geometryType: 'box' | 'cylinder' | 'hexagon';
    
    switch (shapeType) {
      case 'box':
        geometryType = 'box';
        break;
      case 'cylinder':
        geometryType = 'cylinder';
        break;
      case 'sphere':
        geometryType = 'cylinder'; // Use cylinder as fallback
        break;
      case 'octahedron':
        geometryType = 'hexagon';
        break;
      default:
        geometryType = 'cylinder';
    }
    
    const geometry = geometryFactory.createBuilding({
      baseSize,
      height,
      type: geometryType,
      segments: this.config.quality === 'high' ? 16 : 8,
    });
    
    const material = materialFactory.createBuildingMaterial({
      nodeType,
      buildingType: 'standard',
      animated: this.config.enableAnimations,
    });
    
    this.mainStructure = new THREE.Mesh(geometry, material) as ExtendedMesh;
    this.mainStructure.position.y = height / 2 + 3;
    this.mainStructure.castShadow = this.config.enableShadows;
    this.mainStructure.receiveShadow = this.config.enableShadows;
    
    this.mainStructure.userData = {
      id: `${this.data.id}-structure`,
      type: 'building-structure',
      component: this,
      parentNode: this.data.id,
      nodeType: this.data.type,
      baseSize,
      height,
    };
    
    this.group.add(this.mainStructure);
  }

  private createWindows(): void {
    if (!this.mainStructure || this.config.quality === 'low') return;
    
    const height = this.mainStructure.userData.height;
    const baseSize = this.mainStructure.userData.baseSize;
    const levels = Math.floor(height / 5);
    const nodeColor = NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
    
    for (let level = 0; level < levels; level++) {
      const windowGeometry = new THREE.PlaneGeometry(baseSize * 0.8, 0.8);
      const windowMaterial = materialFactory.createWindowMaterial(nodeColor);
      
      // Front and back windows
      for (let side = 0; side < 2; side++) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.y = 5 + level * 5;
        window.position.z = side === 0 ? baseSize * 0.51 : -baseSize * 0.51;
        
        if (side === 1) {
          window.rotation.y = Math.PI;
        }
        
        this.effects.windows.push(window);
        this.group.add(window);
      }
    }
  }

  private createBeacon(): void {
    if (!this.mainStructure) return;
    
    const height = this.mainStructure.userData.height;
    const baseSize = this.mainStructure.userData.baseSize;
    const nodeColor = NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
    
    const beaconGeometry = new THREE.BoxGeometry(baseSize * 0.8, 1, baseSize * 0.8);
    const beaconMaterial = materialFactory.createGlowMaterial(nodeColor, 0.6);
    
    this.effects.beacon = new THREE.Mesh(beaconGeometry, beaconMaterial);
    this.effects.beacon.position.y = height + 3.5;
    
    this.group.add(this.effects.beacon);
  }

  private createActivityIndicator(): void {
    if (!this.mainStructure) return;
    
    const height = this.mainStructure.userData.height;
    const nodeColor = NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
    
    const activityGeometry = new THREE.SphereGeometry(1, 8, 6);
    const activityMaterial = materialFactory.createGlowMaterial(nodeColor, 0.8);
    
    this.effects.activity = new THREE.Mesh(activityGeometry, activityMaterial);
    this.effects.activity.position.y = height + 5;
    
    this.group.add(this.effects.activity);
  }

  private createTrailEffects(): void {
    if (this.config.quality === 'low') return;
    
    // Create subtle particle trails for active nodes
    const nodeColor = NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
    
    for (let i = 0; i < 3; i++) {
      const trailGeometry = new THREE.SphereGeometry(0.2, 4, 3);
      const trailMaterial = materialFactory.createGlowMaterial(nodeColor, 0.3);
      
      const trail = new THREE.Mesh(trailGeometry, trailMaterial);
      trail.visible = false; // Start invisible
      
      this.effects.trails.push(trail);
      this.group.add(trail);
    }
  }

  public update(deltaTime: number, elapsedTime: number): void {
    if (!this.config.enableAnimations) return;
    
    // Animate main structure pulsing
    if (this.mainStructure) {
      const pulseScale = 1 + Math.sin(elapsedTime * 1.5 + this.pulseOffset) * 0.03;
      this.mainStructure.scale.y = pulseScale;
    }
    
    // Animate beacon
    const beaconOpacity = 0.4 + Math.sin(elapsedTime * 3 + this.pulseOffset) * 0.3;
    materialFactory.updateMaterialOpacity(this.effects.beacon.material as THREE.Material, beaconOpacity);
    
    // Animate activity indicator
    const activityScale = 0.8 + Math.sin(elapsedTime * 4 + this.pulseOffset) * 0.4;
    this.effects.activity.scale.setScalar(activityScale);
    
    const activityOpacity = 0.6 + Math.sin(elapsedTime * 4 + this.pulseOffset) * 0.2;
    materialFactory.updateMaterialOpacity(this.effects.activity.material as THREE.Material, activityOpacity);
    
    // Animate windows
    this.effects.windows.forEach((window, index) => {
      const windowOpacity = 0.3 + Math.sin(elapsedTime * 2 + index * 0.5 + this.pulseOffset) * 0.2;
      materialFactory.updateMaterialOpacity(window.material as THREE.Material, windowOpacity);
    });
    
    // Animate trails
    this.updateTrails(elapsedTime);
    
    // Update based on selection state
    this.updateSelectionEffects(elapsedTime);
  }

  private updateTrails(elapsedTime: number): void {
    if (this.config.quality === 'low' || !this.isActive()) return;
    
    this.effects.trails.forEach((trail, index) => {
      const offset = index * (Math.PI * 2 / 3);
      const radius = 8;
      const speed = 1 + index * 0.2;
      
      trail.position.x = Math.cos(elapsedTime * speed + offset) * radius;
      trail.position.z = Math.sin(elapsedTime * speed + offset) * radius;
      trail.position.y = 8 + Math.sin(elapsedTime * 2 + offset) * 3;
      
      trail.visible = this.isSelected || this.isParentSelected;
      
      if (trail.visible) {
        const opacity = 0.3 + Math.sin(elapsedTime * 3 + offset) * 0.2;
        materialFactory.updateMaterialOpacity(trail.material as THREE.Material, opacity);
      }
    });
  }

  private updateSelectionEffects(elapsedTime: number): void {
    if (!this.mainStructure) return;
    
    let emissiveIntensity = 0.1;
    
    if (this.isSelected) {
      emissiveIntensity = 0.3 + Math.sin(elapsedTime * 4) * 0.1;
    } else if (this.isHovered) {
      emissiveIntensity = 0.2 + Math.sin(elapsedTime * 2) * 0.05;
    } else if (this.isParentSelected) {
      emissiveIntensity = 0.15;
    }
    
    const nodeColor = NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
    materialFactory.updateMaterialEmissive(
      this.mainStructure.material as THREE.Material,
      nodeColor,
      emissiveIntensity
    );
  }

  public setSelected(selected: boolean): void {
    if (this.isSelected === selected) return;
    
    this.isSelected = selected;
    this.updateVisualState();
  }

  public setHovered(hovered: boolean): void {
    if (this.isHovered === hovered) return;
    
    this.isHovered = hovered;
    this.updateVisualState();
  }

  public setParentSelected(parentSelected: boolean): void {
    if (this.isParentSelected === parentSelected) return;
    
    this.isParentSelected = parentSelected;
    this.updateVisualState();
  }

  private updateVisualState(): void {
    // Visual state is updated in the update() method for smooth animations
    // This method can be used for immediate state changes if needed
  }

  public setLOD(distance: number, lodLevels: [number, number, number]): void {
    const [high, medium, low] = lodLevels;
    
    // Adjust visibility based on distance
    this.effects.windows.forEach(window => {
      window.visible = distance < medium;
    });
    
    // Hide trails at far distances
    this.effects.trails.forEach(trail => {
      trail.visible = trail.visible && distance < high;
    });
    
    // Reduce geometry detail for far objects
    if (this.mainStructure && distance > medium) {
      // Could implement geometry swapping here for even better performance
    }
  }

  public setOpacity(opacity: number): void {
    // Update main structure
    if (this.mainStructure) {
      materialFactory.updateMaterialOpacity(this.mainStructure.material as THREE.Material, opacity);
    }
    
    // Update effects
    materialFactory.updateMaterialOpacity(this.effects.beacon.material as THREE.Material, opacity * 0.6);
    materialFactory.updateMaterialOpacity(this.effects.activity.material as THREE.Material, opacity * 0.8);
    
    this.effects.windows.forEach(window => {
      materialFactory.updateMaterialOpacity(window.material as THREE.Material, opacity * 0.3);
    });
    
    this.effects.trails.forEach(trail => {
      materialFactory.updateMaterialOpacity(trail.material as THREE.Material, opacity * 0.3);
    });
  }

  public updateMetrics(metrics: { throughput?: number; latency?: number; errorRate?: number }): void {
    // Update visual indicators based on metrics
    if (metrics.errorRate !== undefined && metrics.errorRate > 0.05) {
      // High error rate - make beacon red
      materialFactory.updateMaterialColor(this.effects.beacon.material as THREE.Material, 0xff0000);
    } else if (metrics.latency !== undefined && metrics.latency > 1000) {
      // High latency - make beacon yellow
      materialFactory.updateMaterialColor(this.effects.beacon.material as THREE.Material, 0xffff00);
    } else {
      // Normal - use node type color
      const nodeColor = NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
      materialFactory.updateMaterialColor(this.effects.beacon.material as THREE.Material, nodeColor);
    }
    
    // Adjust activity indicator based on throughput
    if (metrics.throughput !== undefined) {
      const normalizedThroughput = Math.min(metrics.throughput / 1000, 1); // Normalize to 0-1
      const activityScale = 0.5 + normalizedThroughput * 0.5;
      this.effects.activity.scale.setScalar(activityScale);
    }
  }

  public getBounds(): THREE.Box3 {
    const box = new THREE.Box3();
    box.setFromObject(this.group);
    return box;
  }

  public getWorldPosition(): THREE.Vector3 {
    return this.group.getWorldPosition(new THREE.Vector3());
  }

  public getDistanceFromCamera(camera: THREE.Camera): number {
    const worldPos = this.getWorldPosition();
    return worldPos.distanceTo(camera.position);
  }

  private isActive(): boolean {
    // Determine if building should show activity effects
    return this.isSelected || this.isParentSelected || this.data.type === 'monitor';
  }

  public playAlert(): void {
    // Play alert animation
    if (!this.config.enableAnimations) return;
    
    const alertAnimation = () => {
      materialFactory.updateMaterialColor(this.effects.beacon.material as THREE.Material, 0xff0000);
      
      setTimeout(() => {
        const nodeColor = NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
        materialFactory.updateMaterialColor(this.effects.beacon.material as THREE.Material, nodeColor);
      }, 500);
    };
    
    alertAnimation();
    setTimeout(alertAnimation, 600);
    setTimeout(alertAnimation, 1200);
  }

  public dispose(): void {
    // Remove from parent
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    
    // Clear effects arrays
    this.effects.windows.length = 0;
    this.effects.trails.length = 0;
    
    // Geometries and materials are managed by factories
  }

  // Getters
  public get id(): NodeId {
    return this.data.id;
  }

  public get name(): string {
    return this.data.name;
  }

  public get type(): NodeType {
    return this.data.type || 'service';
  }

  public get position(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public get selected(): boolean {
    return this.isSelected;
  }

  public get hovered(): boolean {
    return this.isHovered;
  }

  public get parentSelected(): boolean {
    return this.isParentSelected;
  }

  public get height(): number {
    return this.mainStructure?.userData.height || 0;
  }

  public get color(): number {
    return NODE_TYPE_CONFIGS[this.data.type || 'service'].color;
  }
}
