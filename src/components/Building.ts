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

export interface WindowLight {
  mesh: THREE.Mesh;
  originalOpacity: number;
  flickerSpeed: number;
}

export class Building {
  public readonly group: ExtendedGroup;
  public readonly data: NodeData;
  
  private config: BuildingConfig;
  private districtColor: number;
  private mainStructure?: ExtendedMesh;
  private beacon?: ExtendedMesh;
  private activityIndicator?: ExtendedMesh;
  private windowLights: WindowLight[] = [];
  private isSelected: boolean = false;
  private isHovered: boolean = false;
  private isParentSelected: boolean = false;
  private pulseOffset: number;

  constructor(data: NodeData, districtColor: number, config: BuildingConfig) {
    this.data = data;
    this.districtColor = districtColor;
    this.config = config;
    
    this.group = new THREE.Group() as ExtendedGroup;
    this.group.userData = {
      id: data.id,
      type: 'building',
      component: this,
      data: data,
      nodeType: data.type,
    };
    
    // Create unique pulse offset for this building
    this.pulseOffset = (data.relPos.x + data.relPos.z) * 0.1;
    
    this.initialize();
  }

  private initialize(): void {
    this.createMainStructure();
    this.createWindowLights();
    this.createBeacon();
    this.createActivityIndicator();
  }

  private createMainStructure(): void {
    const baseSize = 6 + Math.random() * 4;
    const height = 10 + Math.random() * 15;
    
    // Get geometry based on node type or random
    const nodeConfig = this.data.type ? NODE_TYPE_CONFIGS[this.data.type] : null;
    const shapeType = nodeConfig?.shape || this.getRandomShape();
    
    let geometry: THREE.BufferGeometry;
    
    switch (shapeType) {
      case 'cylinder':
        geometry = geometryFactory.createBuilding({
          baseSize,
          height,
          type: 'cylinder',
          segments: 8,
        });
        break;
        
      case 'sphere':
        geometry = geometryFactory.createBuilding({
          baseSize: baseSize * 0.8,
          height: baseSize * 0.8,
          type: 'cylinder',
          segments: 16,
        });
        // Convert to sphere-like
        break;
        
      case 'octahedron':
        geometry = new THREE.OctahedronGeometry(baseSize * 0.7);
        break;
        
      case 'box':
      default:
        geometry = geometryFactory.createBuilding({
          baseSize,
          height,
          type: 'box',
        });
        break;
    }
    
    // Use node type color if available, otherwise district color
    const buildingColor = nodeConfig?.color || this.districtColor;
    
    const material = materialFactory.createBuildingMaterial({
      buildingType: 'standard',
      nodeType: this.data.type,
      color: buildingColor,
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
      height: height,
      baseSize: baseSize,
    };
    
    this.group.add(this.mainStructure);
  }

  private createWindowLights(): void {
    if (!this.mainStructure) return;
    
    const height = this.mainStructure.userData.height as number;
    const baseSize = this.mainStructure.userData.baseSize as number;
    const levels = Math.floor(height / 5);
    
    // Use node type color for windows
    const nodeConfig = this.data.type ? NODE_TYPE_CONFIGS[this.data.type] : null;
    const windowColor = nodeConfig?.color || this.districtColor;
    
    for (let i = 0; i < levels; i++) {
      const windowGeometry = new THREE.PlaneGeometry(baseSize * 0.8, 0.8);
      const windowMaterial = materialFactory.createWindowMaterial(
        windowColor,
        0.3 + Math.random() * 0.3
      );
      
      // Front and back windows
      for (let side = 0; side < 2; side++) {
        const window = new THREE.Mesh(windowGeometry, windowMaterial);
        window.position.y = 5 + i * 5;
        window.position.z = side === 0 ? baseSize * 0.51 : -baseSize * 0.51;
        if (side === 1) window.rotation.y = Math.PI;
        
        const windowLight: WindowLight = {
          mesh: window,
          originalOpacity: windowMaterial.opacity,
          flickerSpeed: 0.5 + Math.random() * 1.5,
        };
        
        this.windowLights.push(windowLight);
        this.mainStructure!.add(window);
      }
    }
  }

  private createBeacon(): void {
    if (!this.mainStructure) return;
    
    const height = this.mainStructure.userData.height as number;
    const baseSize = this.mainStructure.userData.baseSize as number;
    
    const beaconGeometry = new THREE.BoxGeometry(baseSize * 0.8, 1, baseSize * 0.8);
    const nodeConfig = this.data.type ? NODE_TYPE_CONFIGS[this.data.type] : null;
    const beaconColor = nodeConfig?.color || this.districtColor;
    
    const beaconMaterial = materialFactory.createGlowMaterial(beaconColor, 0.6);
    
    this.beacon = new THREE.Mesh(beaconGeometry, beaconMaterial) as ExtendedMesh;
    this.beacon.position.y = height + 3.5;
    
    this.beacon.userData = {
      id: `${this.data.id}-beacon`,
      type: 'building-beacon',
      component: this,
    };
    
    this.mainStructure.add(this.beacon);
  }

  private createActivityIndicator(): void {
    if (!this.mainStructure) return;
    
    const height = this.mainStructure.userData.height as number;
    
    const activityGeometry = new THREE.SphereGeometry(1, 8, 6);
    const nodeConfig = this.data.type ? NODE_TYPE_CONFIGS[this.data.type] : null;
    const activityColor = nodeConfig?.color || this.districtColor;
    
    const activityMaterial = materialFactory.createGlowMaterial(activityColor, 0.8);
    
    this.activityIndicator = new THREE.Mesh(activityGeometry, activityMaterial) as ExtendedMesh;
    this.activityIndicator.position.y = height + 5;
    
    this.activityIndicator.userData = {
      id: `${this.data.id}-activity`,
      type: 'building-activity',
      component: this,
    };
    
    this.mainStructure.add(this.activityIndicator);
  }

  private getRandomShape(): 'box' | 'cylinder' | 'sphere' | 'octahedron' {
    const shapes = ['box', 'cylinder', 'sphere'] as const;
    const weights = [0.5, 0.3, 0.2]; // 50% box, 30% cylinder, 20% sphere
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < shapes.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return shapes[i];
      }
    }
    
    return 'box';
  }

  public update(deltaTime: number, elapsedTime: number): void {
    if (!this.config.enableAnimations) return;
    
    // Pulse animation on main structure
    if (this.mainStructure) {
      const pulseScale = 1 + Math.sin(elapsedTime * 1.5 + this.pulseOffset) * 0.03;
      this.mainStructure.scale.y = pulseScale;
    }
    
    // Beacon animation
    if (this.beacon) {
      const beaconPulse = 0.4 + Math.sin(elapsedTime * 3 + this.pulseOffset) * 0.3;
      materialFactory.updateMaterialOpacity(this.beacon.material as THREE.Material, beaconPulse);
    }
    
    // Activity indicator animation
    if (this.activityIndicator) {
      const activityScale = 0.8 + Math.sin(elapsedTime * 4 + this.pulseOffset) * 0.4;
      this.activityIndicator.scale.setScalar(activityScale);
      
      const activityOpacity = 0.6 + Math.sin(elapsedTime * 4 + this.pulseOffset) * 0.2;
      materialFactory.updateMaterialOpacity(this.activityIndicator.material as THREE.Material, activityOpacity);
    }
    
    // Window lights flickering
    this.windowLights.forEach((windowLight, index) => {
      const flicker = Math.sin(elapsedTime * windowLight.flickerSpeed + index) * 0.1;
      const opacity = Math.max(0.1, windowLight.originalOpacity + flicker);
      materialFactory.updateMaterialOpacity(windowLight.mesh.material as THREE.Material, opacity);
    });
    
    // Enhanced effects when selected or hovered
    if (this.isSelected || this.isHovered || this.isParentSelected) {
      this.updateEnhancedEffects(elapsedTime);
    }
  }

  private updateEnhancedEffects(elapsedTime: number): void {
    const intensity = this.isSelected ? 2.0 : (this.isHovered ? 1.5 : 1.2);
    
    // Enhanced beacon glow
    if (this.beacon) {
      const enhancedGlow = 0.6 * intensity + Math.sin(elapsedTime * 5) * 0.2;
      materialFactory.updateMaterialOpacity(this.beacon.material as THREE.Material, enhancedGlow);
    }
    
    // Enhanced activity indicator
    if (this.activityIndicator) {
      const enhancedActivity = 0.8 * intensity + Math.sin(elapsedTime * 6) * 0.3;
      materialFactory.updateMaterialOpacity(this.activityIndicator.material as THREE.Material, enhancedActivity);
    }
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
    if (!this.mainStructure) return;
    
    let buildingType: 'standard' | 'highlighted' | 'inactive' = 'standard';
    
    if (this.isSelected) {
      buildingType = 'highlighted';
    } else if (this.isParentSelected || this.isHovered) {
      buildingType = 'highlighted';
    }
    
    // Update main structure material
    const nodeConfig = this.data.type ? NODE_TYPE_CONFIGS[this.data.type] : null;
    const buildingColor = nodeConfig?.color || this.districtColor;
    
    const newMaterial = materialFactory.createBuildingMaterial({
      buildingType,
      nodeType: this.data.type,
      color: buildingColor,
    });
    
    this.mainStructure.material = newMaterial;
  }

  public setLOD(distance: number, lodLevels: [number, number, number]): void {
    const [high, medium, low] = lodLevels;
    
    if (distance > low) {
      // Low detail - hide windows and activity indicator
      this.windowLights.forEach(light => {
        light.mesh.visible = false;
      });
      if (this.activityIndicator) this.activityIndicator.visible = false;
      if (this.beacon) this.beacon.visible = false;
    } else if (distance > medium) {
      // Medium detail - show beacon, hide windows
      this.windowLights.forEach(light => {
        light.mesh.visible = false;
      });
      if (this.activityIndicator) this.activityIndicator.visible = true;
      if (this.beacon) this.beacon.visible = true;
    } else {
      // High detail - show everything
      this.windowLights.forEach(light => {
        light.mesh.visible = true;
      });
      if (this.activityIndicator) this.activityIndicator.visible = true;
      if (this.beacon) this.beacon.visible = true;
    }
  }

  public setOpacity(opacity: number): void {
    // Update main structure
    if (this.mainStructure) {
      materialFactory.updateMaterialOpacity(this.mainStructure.material as THREE.Material, opacity);
    }
    
    // Update beacon
    if (this.beacon) {
      materialFactory.updateMaterialOpacity(this.beacon.material as THREE.Material, opacity * 0.6);
    }
    
    // Update activity indicator
    if (this.activityIndicator) {
      materialFactory.updateMaterialOpacity(this.activityIndicator.material as THREE.Material, opacity * 0.8);
    }
    
    // Update windows
    this.windowLights.forEach(light => {
      materialFactory.updateMaterialOpacity(
        light.mesh.material as THREE.Material,
        opacity * light.originalOpacity
      );
    });
  }

  public updateMetrics(metrics: NodeData['metrics']): void {
    if (!metrics) return;
    
    // Update activity based on throughput
    const throughputNormalized = Math.min(metrics.throughput / 1000, 1);
    
    if (this.activityIndicator) {
      const scale = 0.5 + throughputNormalized * 0.8;
      this.activityIndicator.scale.setScalar(scale);
    }
    
    // Update beacon based on error rate
    if (this.beacon && metrics.errorRate !== undefined) {
      const errorColor = metrics.errorRate > 0.05 ? 0xff0000 : (this.data.type ? NODE_TYPE_CONFIGS[this.data.type].color : this.districtColor);
      materialFactory.updateMaterialColor(this.beacon.material as THREE.Material, errorColor);
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

  public dispose(): void {
    // Clear window lights
    this.windowLights.length = 0;
    
    // Remove from parent
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    
    // Geometries and materials are handled by factories
  }

  // Getters
  public get id(): NodeId {
    return this.data.id;
  }

  public get name(): string {
    return this.data.name;
  }

  public get nodeType(): NodeType | undefined {
    return this.data.type;
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

  public get height(): number {
    return this.mainStructure?.userData.height as number || 0;
  }

  public get metrics(): NodeData['metrics'] {
    return this.data.metrics;
  }
}
