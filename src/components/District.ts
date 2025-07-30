/**
 * District Component - Hexagonal district with buildings and effects
 */

import * as THREE from 'three';
import { DistrictData, DistrictId, NodeData, ExtendedGroup, ExtendedMesh } from '@/types';
import { geometryFactory, materialFactory } from '@/utils';
import { Building } from './Building';
import { HEX_RADIUS } from '@/config';

export interface DistrictConfig {
  enableShadows: boolean;
  enableAnimations: boolean;
  quality: 'low' | 'medium' | 'high';
}

export class District {
  public readonly group: ExtendedGroup;
  public readonly data: DistrictData;
  
  private config: DistrictConfig;
  private platform?: ExtendedMesh;
  private ring?: ExtendedMesh;
  private glow?: ExtendedMesh;
  private buildings: Building[] = [];
  private isSelected: boolean = false;
  private isHovered: boolean = false;
  private animationMixers: THREE.AnimationMixer[] = [];

  constructor(data: DistrictData, config: DistrictConfig) {
    this.data = data;
    this.config = config;
    
    this.group = new THREE.Group() as ExtendedGroup;
    this.group.userData = {
      id: data.id,
      type: 'district',
      component: this,
      data: data,
    };
    
    this.group.position.set(data.position.x, 0, data.position.z);
    
    this.initialize();
  }

  private initialize(): void {
    this.createPlatform();
    this.createRing();
    this.createGlow();
    this.createBuildings();
    
    if (this.data.id === 'central-core') {
      this.createCentralEffects();
    }
  }

  private createPlatform(): void {
    const scale = this.data.scale || 1.0;
    const hexSize = 35 * scale;
    
    const geometry = geometryFactory.createHexagon({
      size: hexSize,
      depth: 3,
      bevelEnabled: true,
      bevelThickness: 0.5,
      bevelSize: 0.5,
      bevelSegments: 3,
    });
    
    const material = materialFactory.createDistrictMaterial({
      districtColor: this.data.color,
      scale,
      isCentralCore: this.data.id === 'central-core',
    });
    
    this.platform = new THREE.Mesh(geometry, material) as ExtendedMesh;
    this.platform.position.y = 1;
    this.platform.castShadow = this.config.enableShadows;
    this.platform.receiveShadow = this.config.enableShadows;
    
    this.platform.userData = {
      id: `${this.data.id}-platform`,
      type: 'district-platform',
      component: this,
      parentDistrict: this.data.id,
    };
    
    // Add glowing edge
    const edgeGeometry = new THREE.EdgesGeometry(geometry);
    const edgeMaterial = materialFactory.createDistrictEdgeMaterial(
      this.data.color,
      this.data.id === 'central-core' ? 0.5 : 0.3
    );
    
    const edges = new THREE.LineSegments(edgeGeometry, edgeMaterial);
    this.platform.add(edges);
    
    this.group.add(this.platform);
  }

  private createRing(): void {
    const scale = this.data.scale || 1.0;
    const hexSize = 35 * scale;
    
    const ringGeometry = new THREE.RingGeometry(hexSize * 0.65, hexSize * 0.75, 6);
    const ringMaterial = materialFactory.createGlowMaterial(this.data.color, 0.2);
    
    this.ring = new THREE.Mesh(ringGeometry, ringMaterial) as ExtendedMesh;
    this.ring.rotation.x = -Math.PI / 2;
    this.ring.rotation.z = Math.PI / 6;
    this.ring.position.y = 4.1;
    
    this.ring.userData = {
      id: `${this.data.id}-ring`,
      type: 'district-ring',
      component: this,
      parentDistrict: this.data.id,
    };
    
    this.group.add(this.ring);
  }

  private createGlow(): void {
    if (this.data.id !== 'central-core') return;
    
    const scale = this.data.scale || 1.0;
    const hexSize = 35 * scale;
    
    const glowGeometry = new THREE.CircleGeometry(hexSize * 1.2, 32);
    const glowMaterial = materialFactory.createGlowMaterial(this.data.color, 0.05);
    
    this.glow = new THREE.Mesh(glowGeometry, glowMaterial) as ExtendedMesh;
    this.glow.rotation.x = -Math.PI / 2;
    this.glow.position.y = 0.2;
    
    this.glow.userData = {
      id: `${this.data.id}-glow`,
      type: 'district-glow',
      component: this,
      parentDistrict: this.data.id,
    };
    
    this.group.add(this.glow);
  }

  private createBuildings(): void {
    const scale = this.data.scale || 1.0;
    const buildingScale = scale * 0.8;
    
    this.data.nodes.forEach((nodeData) => {
      const building = new Building(nodeData, this.data.color, {
        enableShadows: this.config.enableShadows,
        enableAnimations: this.config.enableAnimations,
        quality: this.config.quality,
        scale: buildingScale,
      });
      
      building.group.position.set(
        nodeData.relPos.x * buildingScale,
        0,
        nodeData.relPos.z * buildingScale
      );
      
      building.group.scale.setScalar(0.9);
      
      this.buildings.push(building);
      this.group.add(building.group);
    });
  }

  private createCentralEffects(): void {
    // Additional effects for central core
    const pulseRingGeometry = new THREE.RingGeometry(38, 42, 64);
    const pulseRingMaterial = materialFactory.createGlowMaterial(this.data.color, 0.25);
    
    const pulseRing = new THREE.Mesh(pulseRingGeometry, pulseRingMaterial);
    pulseRing.rotation.x = -Math.PI / 2;
    pulseRing.position.y = 0.5;
    pulseRing.userData.isPulseRing = true;
    
    this.group.add(pulseRing);
  }

  public update(deltaTime: number, elapsedTime: number): void {
    // Update buildings
    this.buildings.forEach((building) => {
      building.update(deltaTime, elapsedTime);
    });
    
    // Animate platform
    if (this.platform && this.config.enableAnimations) {
      const pulseScale = 1 + Math.sin(elapsedTime * 1.5 + this.getPulseOffset()) * 0.03;
      this.platform.scale.y = pulseScale;
    }
    
    // Animate ring
    if (this.ring && this.config.enableAnimations) {
      const ringPulse = 1 + Math.sin(elapsedTime * 2 + this.getPulseOffset()) * 0.1;
      this.ring.scale.setScalar(ringPulse);
      
      const material = this.ring.material as THREE.MeshBasicMaterial;
      material.opacity = 0.2 + Math.sin(elapsedTime * 2 + this.getPulseOffset()) * 0.1;
    }
    
    // Animate glow for central core
    if (this.glow && this.config.enableAnimations) {
      const glowPulse = 1 + Math.sin(elapsedTime * 1 + this.getPulseOffset()) * 0.05;
      this.glow.scale.setScalar(glowPulse);
    }
    
    // Animate central effects
    this.group.children.forEach((child) => {
      if (child.userData.isPulseRing && this.config.enableAnimations) {
        const pulseScale = 1 + Math.sin(elapsedTime * 1.5) * 0.08;
        child.scale.setScalar(pulseScale);
        
        const material = (child as THREE.Mesh).material as THREE.MeshBasicMaterial;
        material.opacity = 0.25 + Math.sin(elapsedTime * 1.5) * 0.1;
      }
    });
    
    // Update animation mixers
    this.animationMixers.forEach((mixer) => {
      mixer.update(deltaTime);
    });
  }

  public setSelected(selected: boolean): void {
    if (this.isSelected === selected) return;
    
    this.isSelected = selected;
    
    // Update visual state
    this.updateVisualState();
    
    // Update buildings
    this.buildings.forEach((building) => {
      building.setParentSelected(selected);
    });
  }

  public setHovered(hovered: boolean): void {
    if (this.isHovered === hovered) return;
    
    this.isHovered = hovered;
    
    // Update visual state
    this.updateVisualState();
  }

  private updateVisualState(): void {
    if (!this.platform) return;
    
    let emissiveIntensity = this.data.id === 'central-core' ? 0.1 : 0.05;
    
    if (this.isSelected) {
      emissiveIntensity *= 2;
    } else if (this.isHovered) {
      emissiveIntensity *= 1.5;
    }
    
    materialFactory.updateMaterialEmissive(
      this.platform.material as THREE.Material,
      this.data.color,
      emissiveIntensity
    );
  }

  public getBuildingByNodeId(nodeId: string): Building | undefined {
    return this.buildings.find((building) => building.data.id === nodeId);
  }

  public getAllBuildings(): Building[] {
    return [...this.buildings];
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

  public setLOD(distance: number, lodLevels: [number, number, number]): void {
    const [high, medium, low] = lodLevels;
    
    let quality: 'low' | 'medium' | 'high' = 'high';
    
    if (distance > low) {
      quality = 'low';
    } else if (distance > medium) {
      quality = 'medium';
    }
    
    // Update building LOD
    this.buildings.forEach((building) => {
      building.setLOD(distance, lodLevels);
    });
    
    // Update ring visibility based on distance
    if (this.ring) {
      this.ring.visible = distance < medium;
    }
    
    // Update glow visibility
    if (this.glow) {
      this.glow.visible = distance < high;
    }
  }

  public setOpacity(opacity: number): void {
    // Update platform opacity
    if (this.platform) {
      materialFactory.updateMaterialOpacity(this.platform.material as THREE.Material, opacity);
    }
    
    // Update ring opacity
    if (this.ring) {
      materialFactory.updateMaterialOpacity(this.ring.material as THREE.Material, opacity * 0.2);
    }
    
    // Update glow opacity
    if (this.glow) {
      materialFactory.updateMaterialOpacity(this.glow.material as THREE.Material, opacity * 0.05);
    }
    
    // Update buildings opacity
    this.buildings.forEach((building) => {
      building.setOpacity(opacity);
    });
  }

  public playAnimation(animationName: string): void {
    // Implementation for playing specific animations
    console.log(`Playing animation: ${animationName} on district ${this.data.id}`);
  }

  public stopAllAnimations(): void {
    this.animationMixers.forEach((mixer) => {
      mixer.stopAllAction();
    });
  }

  private getPulseOffset(): number {
    // Create unique pulse offset based on district position
    return (this.data.position.x + this.data.position.z) * 0.01;
  }

  public dispose(): void {
    // Dispose buildings
    this.buildings.forEach((building) => {
      building.dispose();
    });
    this.buildings.length = 0;
    
    // Stop animations
    this.stopAllAnimations();
    this.animationMixers.length = 0;
    
    // Remove from parent
    if (this.group.parent) {
      this.group.parent.remove(this.group);
    }
    
    // Dispose geometries and materials are handled by factories
  }

  // Getters
  public get id(): DistrictId {
    return this.data.id;
  }

  public get name(): string {
    return this.data.name;
  }

  public get position(): THREE.Vector3 {
    return this.group.position.clone();
  }

  public get color(): number {
    return this.data.color;
  }

  public get scale(): number {
    return this.data.scale || 1.0;
  }

  public get selected(): boolean {
    return this.isSelected;
  }

  public get hovered(): boolean {
    return this.isHovered;
  }

  public get nodeCount(): number {
    return this.data.nodes.length;
  }
}
