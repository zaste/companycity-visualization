/**
 * Material Factory - Optimized material creation and management
 */

import * as THREE from 'three';
import { ThemeConfig, NodeType } from '@/types';
import { NODE_TYPE_CONFIGS } from '@/config';

export interface MaterialCache {
  [key: string]: THREE.Material;
}

export interface MaterialOptions {
  color?: number | string;
  emissive?: number | string;
  emissiveIntensity?: number;
  transparent?: boolean;
  opacity?: number;
  metalness?: number;
  roughness?: number;
  envMapIntensity?: number;
  side?: THREE.Side;
}

export interface DistrictMaterialOptions extends MaterialOptions {
  districtColor: number;
  scale?: number;
  isCentralCore?: boolean;
}

export interface BuildingMaterialOptions extends MaterialOptions {
  buildingType?: 'standard' | 'highlighted' | 'inactive';
  nodeType?: NodeType;
  animated?: boolean;
}

export interface ParticleMaterialOptions extends MaterialOptions {
  size?: number;
  sizeAttenuation?: boolean;
  alphaTest?: number;
  blending?: THREE.Blending;
}

export class MaterialFactory {
  private static instance: MaterialFactory;
  private cache: MaterialCache = {};
  private disposedMaterials: Set<string> = new Set();
  private theme: ThemeConfig;

  public static getInstance(): MaterialFactory {
    if (!MaterialFactory.instance) {
      MaterialFactory.instance = new MaterialFactory();
    }
    return MaterialFactory.instance;
  }

  private constructor() {
    // Initialize with default theme
    this.theme = {
      primaryColor: '#8b5cf6',
      backgroundColor: '#050510',
      accentColor: '#00ff88',
      textColor: '#ffffff',
      fontFamily: '-apple-system, "SF Pro Display", sans-serif',
      borderRadius: 8,
      shadows: true,
    };
  }

  public updateTheme(theme: ThemeConfig): void {
    this.theme = theme;
    // Clear cache to regenerate materials with new theme
    this.clearCache();
  }

  public createDistrictMaterial(options: DistrictMaterialOptions): THREE.Material {
    const cacheKey = this.getDistrictCacheKey(options);
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const { districtColor, scale = 1, isCentralCore = false } = options;
    
    const material = new THREE.MeshPhongMaterial({
      color: 0x1a1a1a,
      emissive: new THREE.Color(districtColor),
      emissiveIntensity: isCentralCore ? 0.1 : 0.05,
      transparent: true,
      opacity: 0.8,
      shininess: 30,
      ...this.filterMaterialOptions(options),
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createDistrictEdgeMaterial(districtColor: number, opacity: number = 0.3): THREE.Material {
    const cacheKey = `district_edge_${districtColor}_${opacity}`;
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(districtColor),
      transparent: true,
      opacity,
      linewidth: 1,
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createBuildingMaterial(options: BuildingMaterialOptions): THREE.Material {
    const cacheKey = this.getBuildingCacheKey(options);
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const { buildingType = 'standard', nodeType, animated = false } = options;
    
    let baseColor = 0x2a2a2a;
    let emissiveColor = this.theme.primaryColor;
    let emissiveIntensity = 0.1;
    
    if (nodeType && NODE_TYPE_CONFIGS[nodeType]) {
      emissiveColor = NODE_TYPE_CONFIGS[nodeType].color;
    }
    
    switch (buildingType) {
      case 'highlighted':
        emissiveIntensity = 0.3;
        break;
      case 'inactive':
        emissiveIntensity = 0.02;
        baseColor = 0x1a1a1a;
        break;
    }
    
    const material = new THREE.MeshPhongMaterial({
      color: baseColor,
      emissive: new THREE.Color(emissiveColor),
      emissiveIntensity,
      shininess: 20,
      ...this.filterMaterialOptions(options),
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createNodeMaterial(nodeType: NodeType, options?: MaterialOptions): THREE.Material {
    const cacheKey = this.getNodeCacheKey(nodeType, options);
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const config = NODE_TYPE_CONFIGS[nodeType];
    
    const material = new THREE.MeshBasicMaterial({
      color: config.color,
      transparent: true,
      opacity: 0.8,
      ...this.filterMaterialOptions(options),
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createParticleMaterial(options: ParticleMaterialOptions): THREE.Material {
    const cacheKey = this.getParticleCacheKey(options);
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const { 
      size = 1, 
      sizeAttenuation = true, 
      alphaTest = 0.1, 
      blending = THREE.AdditiveBlending 
    } = options;
    
    const material = new THREE.PointsMaterial({
      color: options.color ?? this.theme.primaryColor,
      size,
      sizeAttenuation,
      transparent: true,
      alphaTest,
      blending,
      vertexColors: true,
      ...this.filterMaterialOptions(options),
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createConnectionMaterial(color?: number, opacity: number = 0.2): THREE.Material {
    const cacheKey = `connection_${color ?? 'default'}_${opacity}`;
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const material = new THREE.LineBasicMaterial({
      color: color ?? this.theme.primaryColor,
      transparent: true,
      opacity,
      linewidth: 1,
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createGlowMaterial(color: number | string, intensity: number = 0.1): THREE.Material {
    const cacheKey = `glow_${color}_${intensity}`;
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: intensity,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createShaderMaterial(
    vertexShader: string, 
    fragmentShader: string, 
    uniforms: { [uniform: string]: THREE.IUniform } = {}
  ): THREE.ShaderMaterial {
    // Shader materials are not cached due to their dynamic nature
    return new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      transparent: true,
    });
  }

  public createPlatformMaterial(): THREE.Material {
    const cacheKey = 'platform_material';
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const material = new THREE.MeshPhongMaterial({
      color: 0x0a0a0a,
      emissive: 0x1a1a2e,
      emissiveIntensity: 0.1,
      transparent: true,
      opacity: 0.8,
      flatShading: true,
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createGridMaterial(isHighlighted: boolean = false): THREE.Material {
    const cacheKey = `grid_${isHighlighted}`;
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const material = new THREE.MeshBasicMaterial({
      color: isHighlighted ? 0x2a2a3e : 0x1a1a2e,
      transparent: true,
      opacity: isHighlighted ? 0.25 : 0.1,
      side: THREE.DoubleSide,
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public createWindowMaterial(color: number, opacity: number = 0.3): THREE.Material {
    const cacheKey = `window_${color}_${opacity}`;
    
    if (this.cache[cacheKey] && !this.disposedMaterials.has(cacheKey)) {
      return this.cache[cacheKey];
    }

    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(color),
      transparent: true,
      opacity: 0.3 + Math.random() * 0.3, // Slight variation
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.1,
    });

    this.cache[cacheKey] = material;
    this.disposedMaterials.delete(cacheKey);
    
    return material;
  }

  public updateMaterialOpacity(material: THREE.Material, opacity: number): void {
    if ('opacity' in material) {
      (material as any).opacity = opacity;
      material.transparent = opacity < 1;
      material.needsUpdate = true;
    }
  }

  public updateMaterialColor(material: THREE.Material, color: number | string): void {
    if ('color' in material) {
      (material as any).color.set(color);
      material.needsUpdate = true;
    }
  }

  public updateMaterialEmissive(material: THREE.Material, color: number | string, intensity?: number): void {
    if ('emissive' in material) {
      (material as any).emissive.set(color);
      material.needsUpdate = true;
    }
    
    if (intensity !== undefined && 'emissiveIntensity' in material) {
      (material as any).emissiveIntensity = intensity;
      material.needsUpdate = true;
    }
  }

  private filterMaterialOptions(options?: MaterialOptions): Partial<THREE.MaterialParameters> {
    if (!options) return {};
    
    const filtered: Partial<THREE.MaterialParameters> = {};
    
    if (options.transparent !== undefined) filtered.transparent = options.transparent;
    if (options.opacity !== undefined) filtered.opacity = options.opacity;
    if (options.side !== undefined) filtered.side = options.side;
    
    return filtered;
  }

  private getDistrictCacheKey(options: DistrictMaterialOptions): string {
    const { districtColor, scale = 1, isCentralCore = false, opacity = 0.8 } = options;
    return `district_${districtColor}_${scale}_${isCentralCore}_${opacity}`;
  }

  private getBuildingCacheKey(options: BuildingMaterialOptions): string {
    const { buildingType = 'standard', nodeType = 'service', animated = false } = options;
    return `building_${buildingType}_${nodeType}_${animated}`;
  }

  private getNodeCacheKey(nodeType: NodeType, options?: MaterialOptions): string {
    const opacity = options?.opacity ?? 0.8;
    const transparent = options?.transparent ?? true;
    return `node_${nodeType}_${opacity}_${transparent}`;
  }

  private getParticleCacheKey(options: ParticleMaterialOptions): string {
    const { 
      size = 1, 
      sizeAttenuation = true, 
      alphaTest = 0.1, 
      blending = THREE.AdditiveBlending,
      color = this.theme.primaryColor 
    } = options;
    return `particle_${color}_${size}_${sizeAttenuation}_${alphaTest}_${blending}`;
  }

  public getCacheSize(): number {
    return Object.keys(this.cache).length;
  }

  public getCacheKeys(): string[] {
    return Object.keys(this.cache);
  }

  public clearCache(): void {
    Object.values(this.cache).forEach((material) => {
      material.dispose();
    });
    
    this.cache = {};
    this.disposedMaterials.clear();
  }

  public disposeMaterial(cacheKey: string): void {
    if (this.cache[cacheKey]) {
      this.cache[cacheKey].dispose();
      delete this.cache[cacheKey];
      this.disposedMaterials.add(cacheKey);
    }
  }

  public getMemoryUsage(): { materials: number; textures: number } {
    let textureCount = 0;
    
    Object.values(this.cache).forEach((material) => {
      // Count textures in material
      Object.values(material).forEach((value) => {
        if (value instanceof THREE.Texture) {
          textureCount++;
        }
      });
    });
    
    return {
      materials: Object.keys(this.cache).length,
      textures: textureCount,
    };
  }
}

// Export singleton instance
export const materialFactory = MaterialFactory.getInstance();
