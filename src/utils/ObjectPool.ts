/**
 * Object Pool - High-performance object pooling system
 */

export interface Poolable {
  reset?(): void;
  dispose?(): void;
}

export interface PoolConfig<T> {
  createFn: () => T;
  resetFn?: (obj: T) => void;
  disposeFn?: (obj: T) => void;
  initialSize?: number;
  maxSize?: number;
  autoGrow?: boolean;
  autoShrink?: boolean;
  shrinkThreshold?: number;
  validateFn?: (obj: T) => boolean;
}

export interface PoolStats {
  total: number;
  active: number;
  available: number;
  created: number;
  reused: number;
  disposed: number;
  peak: number;
}

export class ObjectPool<T> {
  private available: T[] = [];
  private active: Set<T> = new Set();
  private config: Required<PoolConfig<T>>;
  private stats: PoolStats;
  private lastShrinkCheck: number = 0;
  private shrinkCheckInterval: number = 5000; // 5 seconds

  constructor(config: PoolConfig<T>) {
    this.config = {
      initialSize: 10,
      maxSize: 1000,
      autoGrow: true,
      autoShrink: true,
      shrinkThreshold: 0.5,
      resetFn: (obj: T) => {
        if ('reset' in obj && typeof obj.reset === 'function') {
          (obj as any).reset();
        }
      },
      disposeFn: (obj: T) => {
        if ('dispose' in obj && typeof obj.dispose === 'function') {
          (obj as any).dispose();
        }
      },
      validateFn: () => true,
      ...config,
    };

    this.stats = {
      total: 0,
      active: 0,
      available: 0,
      created: 0,
      reused: 0,
      disposed: 0,
      peak: 0,
    };

    this.initialize();
  }

  private initialize(): void {
    for (let i = 0; i < this.config.initialSize; i++) {
      this.createObject();
    }
  }

  private createObject(): T {
    if (this.getTotalSize() >= this.config.maxSize) {
      throw new Error(`Pool has reached maximum size: ${this.config.maxSize}`);
    }

    const obj = this.config.createFn();
    this.available.push(obj);
    
    this.stats.created++;
    this.stats.total++;
    this.stats.available++;
    
    return obj;
  }

  public acquire(): T {
    let obj: T;

    if (this.available.length > 0) {
      obj = this.available.pop()!;
      this.stats.reused++;
    } else if (this.config.autoGrow && this.getTotalSize() < this.config.maxSize) {
      obj = this.config.createFn();
      this.stats.created++;
      this.stats.total++;
    } else {
      throw new Error('Pool exhausted and cannot grow');
    }

    // Validate object before use
    if (!this.config.validateFn(obj)) {
      this.config.disposeFn(obj);
      this.stats.disposed++;
      this.stats.total--;
      
      // Try to get another object
      return this.acquire();
    }

    this.active.add(obj);
    this.stats.active++;
    this.stats.available--;
    
    // Update peak
    if (this.stats.active > this.stats.peak) {
      this.stats.peak = this.stats.active;
    }

    return obj;
  }

  public release(obj: T): void {
    if (!this.active.has(obj)) {
      console.warn('Attempting to release object that is not in active set');
      return;
    }

    this.active.delete(obj);
    this.stats.active--;

    // Reset object state
    try {
      this.config.resetFn(obj);
    } catch (error) {
      console.error('Error resetting object:', error);
      this.config.disposeFn(obj);
      this.stats.disposed++;
      this.stats.total--;
      return;
    }

    this.available.push(obj);
    this.stats.available++;

    // Check if we should shrink the pool
    if (this.config.autoShrink) {
      this.checkShrink();
    }
  }

  public releaseAll(): void {
    const activeObjects = Array.from(this.active);
    
    activeObjects.forEach(obj => {
      this.release(obj);
    });
  }

  public batchAcquire(count: number): T[] {
    const objects: T[] = [];
    
    for (let i = 0; i < count; i++) {
      try {
        objects.push(this.acquire());
      } catch (error) {
        // Release any objects we've already acquired
        objects.forEach(obj => this.release(obj));
        throw error;
      }
    }
    
    return objects;
  }

  public batchRelease(objects: T[]): void {
    objects.forEach(obj => {
      this.release(obj);
    });
  }

  private checkShrink(): void {
    const now = Date.now();
    
    if (now - this.lastShrinkCheck < this.shrinkCheckInterval) {
      return;
    }
    
    this.lastShrinkCheck = now;
    
    const utilizationRatio = this.stats.active / this.stats.total;
    
    if (utilizationRatio < this.config.shrinkThreshold && this.available.length > this.config.initialSize) {
      const excessObjects = this.available.length - this.config.initialSize;
      const objectsToRemove = Math.min(excessObjects, Math.floor(this.available.length * 0.25));
      
      for (let i = 0; i < objectsToRemove; i++) {
        const obj = this.available.pop();
        if (obj) {
          this.config.disposeFn(obj);
          this.stats.disposed++;
          this.stats.total--;
          this.stats.available--;
        }
      }
    }
  }

  public clear(): void {
    // Release all active objects
    this.releaseAll();
    
    // Dispose all available objects
    while (this.available.length > 0) {
      const obj = this.available.pop()!;
      this.config.disposeFn(obj);
      this.stats.disposed++;
      this.stats.total--;
      this.stats.available--;
    }
    
    this.active.clear();
  }

  public resize(newSize: number): void {
    if (newSize < 0) {
      throw new Error('Pool size cannot be negative');
    }
    
    if (newSize > this.config.maxSize) {
      throw new Error(`New size exceeds maximum: ${this.config.maxSize}`);
    }
    
    const currentSize = this.getTotalSize();
    
    if (newSize > currentSize) {
      // Grow the pool
      const objectsToAdd = newSize - currentSize;
      for (let i = 0; i < objectsToAdd; i++) {
        this.createObject();
      }
    } else if (newSize < currentSize) {
      // Shrink the pool
      const objectsToRemove = currentSize - newSize;
      let removed = 0;
      
      // Remove from available objects first
      while (removed < objectsToRemove && this.available.length > 0) {
        const obj = this.available.pop()!;
        this.config.disposeFn(obj);
        this.stats.disposed++;
        this.stats.total--;
        this.stats.available--;
        removed++;
      }
      
      if (removed < objectsToRemove) {
        console.warn(`Could only remove ${removed} objects, ${objectsToRemove - removed} active objects remain`);
      }
    }
  }

  public warmUp(count: number = this.config.initialSize): void {
    const objects = this.batchAcquire(Math.min(count, this.config.maxSize - this.getTotalSize()));
    this.batchRelease(objects);
  }

  public validate(): { valid: number; invalid: number } {
    let valid = 0;
    let invalid = 0;
    
    // Validate available objects
    this.available = this.available.filter(obj => {
      if (this.config.validateFn(obj)) {
        valid++;
        return true;
      } else {
        this.config.disposeFn(obj);
        this.stats.disposed++;
        this.stats.total--;
        this.stats.available--;
        invalid++;
        return false;
      }
    });
    
    // Validate active objects (just count, don't remove)
    this.active.forEach(obj => {
      if (this.config.validateFn(obj)) {
        valid++;
      } else {
        invalid++;
      }
    });
    
    return { valid, invalid };
  }

  public getTotalSize(): number {
    return this.available.length + this.active.size;
  }

  public getActiveCount(): number {
    return this.active.size;
  }

  public getAvailableCount(): number {
    return this.available.length;
  }

  public getUtilization(): number {
    const total = this.getTotalSize();
    return total > 0 ? this.active.size / total : 0;
  }

  public getStats(): PoolStats {
    return {
      ...this.stats,
      total: this.getTotalSize(),
      active: this.active.size,
      available: this.available.length,
    };
  }

  public resetStats(): void {
    this.stats = {
      total: this.getTotalSize(),
      active: this.active.size,
      available: this.available.length,
      created: 0,
      reused: 0,
      disposed: 0,
      peak: this.active.size,
    };
  }

  public getConfig(): Readonly<PoolConfig<T>> {
    return { ...this.config };
  }

  public updateConfig(updates: Partial<PoolConfig<T>>): void {
    this.config = { ...this.config, ...updates };
    
    // Apply new max size if changed
    if (updates.maxSize !== undefined && this.getTotalSize() > updates.maxSize) {
      this.resize(updates.maxSize);
    }
  }
}

/**
 * Specialized object pool for Three.js objects
 */
export class ThreeObjectPool<T extends THREE.Object3D> extends ObjectPool<T> {
  constructor(config: PoolConfig<T>) {
    const threeConfig: PoolConfig<T> = {
      ...config,
      resetFn: (obj: T) => {
        // Reset Three.js object properties
        obj.position.set(0, 0, 0);
        obj.rotation.set(0, 0, 0);
        obj.scale.set(1, 1, 1);
        obj.visible = true;
        
        // Clear parent
        if (obj.parent) {
          obj.parent.remove(obj);
        }
        
        // Clear children
        while (obj.children.length > 0) {
          obj.remove(obj.children[0]);
        }
        
        // Call custom reset function if provided
        if (config.resetFn) {
          config.resetFn(obj);
        }
      },
      disposeFn: (obj: T) => {
        // Dispose Three.js resources
        if ('geometry' in obj && obj.geometry) {
          (obj.geometry as any).dispose();
        }
        
        if ('material' in obj && obj.material) {
          const material = obj.material as any;
          if (Array.isArray(material)) {
            material.forEach(m => m.dispose());
          } else {
            material.dispose();
          }
        }
        
        // Call custom dispose function if provided
        if (config.disposeFn) {
          config.disposeFn(obj);
        }
      },
    };
    
    super(threeConfig);
  }
}

/**
 * Pool manager for managing multiple pools
 */
export class PoolManager {
  private pools: Map<string, ObjectPool<any>> = new Map();
  
  public createPool<T>(name: string, config: PoolConfig<T>): ObjectPool<T> {
    if (this.pools.has(name)) {
      throw new Error(`Pool with name '${name}' already exists`);
    }
    
    const pool = new ObjectPool(config);
    this.pools.set(name, pool);
    
    return pool;
  }
  
  public getPool<T>(name: string): ObjectPool<T> | undefined {
    return this.pools.get(name);
  }
  
  public removePool(name: string): boolean {
    const pool = this.pools.get(name);
    if (pool) {
      pool.clear();
      this.pools.delete(name);
      return true;
    }
    return false;
  }
  
  public clearAll(): void {
    this.pools.forEach(pool => pool.clear());
    this.pools.clear();
  }
  
  public getPoolNames(): string[] {
    return Array.from(this.pools.keys());
  }
  
  public getTotalStats(): Record<string, PoolStats> {
    const stats: Record<string, PoolStats> = {};
    this.pools.forEach((pool, name) => {
      stats[name] = pool.getStats();
    });
    return stats;
  }
}

// Export singleton instance
export const poolManager = new PoolManager();
