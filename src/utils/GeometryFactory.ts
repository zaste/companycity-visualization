/**
 * Geometry Factory - Optimized geometry creation and caching
 */

import * as THREE from 'three';
import { NodeType } from '@/types';
import { HEX_SIZE } from '@/config';

export interface GeometryCache {
  [key: string]: THREE.BufferGeometry;
}

export interface HexagonOptions {
  size: number;
  depth?: number;
  bevelEnabled?: boolean;
  bevelThickness?: number;
  bevelSize?: number;
  bevelSegments?: number;
}

export interface BuildingOptions {
  baseSize: number;
  height: number;
  type?: 'box' | 'cylinder' | 'hexagon' | 'random';
  segments?: number;
}

export class GeometryFactory {
  private static instance: GeometryFactory;
  private cache: GeometryCache = {};
  private disposedGeometries: Set<string> = new Set();

  public static getInstance(): GeometryFactory {
    if (!GeometryFactory.instance) {
      GeometryFactory.instance = new GeometryFactory();
    }
    return GeometryFactory.instance;
  }

  private constructor() {
    // Private constructor for singleton
  }

  public createHexagon(options: HexagonOptions): THREE.BufferGeometry {
    const cacheKey = this.getHexagonCacheKey(options);
    
    if (this.cache[cacheKey] && !this.disposedGeometries.has(cacheKey)) {
      return this.cache[cacheKey].clone();
    }

    const { size, depth = 3, bevelEnabled = true, bevelThickness = 0.5, bevelSize = 0.5, bevelSegments = 3 } = options;
    
    // Create hexagonal shape
    const shape = new THREE.Shape();
    const angleStep = Math.PI * 2 / 6;
    const rotationOffset = Math.PI / 6; // 30 degrees to align with grid
    
    for (let i = 0; i < 6; i++) {
      const angle = angleStep * i + rotationOffset;
      const x = Math.cos(angle) * size;
      const y = Math.sin(angle) * size;
      
      if (i === 0) {
        shape.moveTo(x, y);
      } else {
        shape.lineTo(x, y);
      }
    }
    shape.closePath();
    
    // Extrude for 3D effect
    const extrudeSettings = {
      depth,
      bevelEnabled,
      bevelThickness,
      bevelSize,
      bevelSegments,
    };
    
    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.rotateX(-Math.PI / 2); // Lay flat
    
    // Optimize geometry
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    this.cache[cacheKey] = geometry;
    this.disposedGeometries.delete(cacheKey);
    
    return geometry.clone();
  }

  public createBuilding(options: BuildingOptions): THREE.BufferGeometry {
    const cacheKey = this.getBuildingCacheKey(options);
    
    if (this.cache[cacheKey] && !this.disposedGeometries.has(cacheKey)) {
      return this.cache[cacheKey].clone();
    }

    const { baseSize, height, type = 'random', segments = 8 } = options;
    let geometry: THREE.BufferGeometry;
    
    const geometryType = type === 'random' ? this.getRandomBuildingType() : type;
    
    switch (geometryType) {
      case 'cylinder':
        geometry = new THREE.CylinderGeometry(
          baseSize * 0.5,
          baseSize * 0.6,
          height,
          segments
        );
        break;
        
      case 'hexagon':
        geometry = new THREE.CylinderGeometry(
          baseSize * 0.5,
          baseSize * 0.5,
          height,
          6
        );
        break;
        
      case 'box':
      default:
        geometry = new THREE.BoxGeometry(baseSize, height, baseSize);
        break;
    }
    
    // Optimize geometry
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    this.cache[cacheKey] = geometry;
    this.disposedGeometries.delete(cacheKey);
    
    return geometry.clone();
  }

  public createNodeGeometry(nodeType: NodeType, size: number = 5): THREE.BufferGeometry {
    const cacheKey = `node_${nodeType}_${size}`;
    
    if (this.cache[cacheKey] && !this.disposedGeometries.has(cacheKey)) {
      return this.cache[cacheKey].clone();
    }

    let geometry: THREE.BufferGeometry;
    
    switch (nodeType) {
      case 'service':
        geometry = new THREE.CylinderGeometry(size * 0.8, size, size * 2, 8);
        break;
        
      case 'database':
        geometry = new THREE.CylinderGeometry(size, size, size * 1.5, 16);
        break;
        
      case 'api':
        geometry = new THREE.BoxGeometry(size * 1.5, size, size * 1.5);
        break;
        
      case 'queue':
        geometry = new THREE.BoxGeometry(size * 2, size * 0.5, size);
        break;
        
      case 'cache':
        geometry = new THREE.SphereGeometry(size * 0.8, 16, 12);
        break;
        
      case 'monitor':
        geometry = new THREE.OctahedronGeometry(size);
        break;
        
      default:
        geometry = new THREE.BoxGeometry(size, size, size);
        break;
    }
    
    // Optimize geometry
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    this.cache[cacheKey] = geometry;
    this.disposedGeometries.delete(cacheKey);
    
    return geometry.clone();
  }

  public createGrid(hexSize: number = HEX_SIZE, gridRadius: number = 200): THREE.BufferGeometry[] {
    const cacheKey = `grid_${hexSize}_${gridRadius}`;
    
    if (this.cache[cacheKey] && !this.disposedGeometries.has(cacheKey)) {
      return [this.cache[cacheKey].clone()];
    }

    const geometries: THREE.BufferGeometry[] = [];
    
    // Create hexagonal grid using axial coordinates
    for (let q = -8; q <= 8; q++) {
      for (let r = -8; r <= 8; r++) {
        // Convert axial to pixel coordinates
        const x = hexSize * 3/2 * q;
        const z = hexSize * Math.sqrt(3) * (r + q/2);
        
        if (Math.sqrt(x*x + z*z) < gridRadius) {
          const hexGeometry = new THREE.RingGeometry(
            hexSize * 0.8, 
            hexSize * 0.85, 
            6
          );
          
          hexGeometry.rotateZ(Math.PI / 6);
          hexGeometry.translate(x, 0, z);
          
          geometries.push(hexGeometry);
        }
      }
    }
    
    // Merge geometries for better performance
    const mergedGeometry = new THREE.BufferGeometry();
    const positions: number[] = [];
    const indices: number[] = [];
    let indexOffset = 0;
    
    geometries.forEach((geometry) => {
      const positionAttribute = geometry.attributes.position;
      const indexAttribute = geometry.index;
      
      // Add positions
      for (let i = 0; i < positionAttribute.count; i++) {
        positions.push(
          positionAttribute.getX(i),
          positionAttribute.getY(i),
          positionAttribute.getZ(i)
        );
      }
      
      // Add indices with offset
      if (indexAttribute) {
        for (let i = 0; i < indexAttribute.count; i++) {
          indices.push(indexAttribute.getX(i) + indexOffset);
        }
      }
      
      indexOffset += positionAttribute.count;
      geometry.dispose();
    });
    
    mergedGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    mergedGeometry.setIndex(indices);
    mergedGeometry.computeBoundingBox();
    mergedGeometry.computeBoundingSphere();
    
    this.cache[cacheKey] = mergedGeometry;
    this.disposedGeometries.delete(cacheKey);
    
    return [mergedGeometry.clone()];
  }

  public createParticle(size: number = 0.5): THREE.BufferGeometry {
    const cacheKey = `particle_${size}`;
    
    if (this.cache[cacheKey] && !this.disposedGeometries.has(cacheKey)) {
      return this.cache[cacheKey].clone();
    }

    const geometry = new THREE.SphereGeometry(size, 8, 6);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    this.cache[cacheKey] = geometry;
    this.disposedGeometries.delete(cacheKey);
    
    return geometry.clone();
  }

  public createPlane(width: number, height: number, segments: number = 1): THREE.BufferGeometry {
    const cacheKey = `plane_${width}_${height}_${segments}`;
    
    if (this.cache[cacheKey] && !this.disposedGeometries.has(cacheKey)) {
      return this.cache[cacheKey].clone();
    }

    const geometry = new THREE.PlaneGeometry(width, height, segments, segments);
    geometry.computeBoundingBox();
    geometry.computeBoundingSphere();
    
    this.cache[cacheKey] = geometry;
    this.disposedGeometries.delete(cacheKey);
    
    return geometry.clone();
  }

  private getRandomBuildingType(): 'box' | 'cylinder' | 'hexagon' {
    const types = ['box', 'cylinder', 'hexagon'] as const;
    const weights = [0.4, 0.4, 0.2]; // 40% box, 40% cylinder, 20% hexagon
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < types.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return types[i];
      }
    }
    
    return 'box';
  }

  private getHexagonCacheKey(options: HexagonOptions): string {
    const { size, depth = 3, bevelEnabled = true, bevelThickness = 0.5, bevelSize = 0.5, bevelSegments = 3 } = options;
    return `hexagon_${size}_${depth}_${bevelEnabled}_${bevelThickness}_${bevelSize}_${bevelSegments}`;
  }

  private getBuildingCacheKey(options: BuildingOptions): string {
    const { baseSize, height, type = 'random', segments = 8 } = options;
    return `building_${baseSize}_${height}_${type}_${segments}`;
  }

  public getCacheSize(): number {
    return Object.keys(this.cache).length;
  }

  public getCacheKeys(): string[] {
    return Object.keys(this.cache);
  }

  public clearCache(): void {
    Object.values(this.cache).forEach((geometry) => {
      geometry.dispose();
    });
    
    this.cache = {};
    this.disposedGeometries.clear();
  }

  public disposeGeometry(cacheKey: string): void {
    if (this.cache[cacheKey]) {
      this.cache[cacheKey].dispose();
      delete this.cache[cacheKey];
      this.disposedGeometries.add(cacheKey);
    }
  }

  public getMemoryUsage(): { geometries: number; totalVertices: number; totalFaces: number } {
    let totalVertices = 0;
    let totalFaces = 0;
    
    Object.values(this.cache).forEach((geometry) => {
      const positionAttribute = geometry.attributes.position;
      if (positionAttribute) {
        totalVertices += positionAttribute.count;
      }
      
      const indexAttribute = geometry.index;
      if (indexAttribute) {
        totalFaces += indexAttribute.count / 3;
      }
    });
    
    return {
      geometries: Object.keys(this.cache).length,
      totalVertices,
      totalFaces,
    };
  }
}

// Export singleton instance
export const geometryFactory = GeometryFactory.getInstance();
