/**
 * AnimationLoop - High-performance render loop with adaptive frame rate
 */

import { EventManager } from './EventManager';
import { StateManager } from './StateManager';
import { PerformanceState } from '@/types';

export interface AnimationLoopConfig {
  targetFPS: number;
  enableAdaptiveFrameRate: boolean;
  enablePerformanceTracking: boolean;
  maxDeltaTime: number;
  enableFixedTimeStep: boolean;
  fixedTimeStep: number;
}

export interface FrameStats {
  fps: number;
  frameTime: number;
  deltaTime: number;
  elapsedTime: number;
  frameCount: number;
  renderCalls: number;
  memoryUsage: number;
  triangleCount: number;
}

export type UpdateCallback = (deltaTime: number, elapsedTime: number) => void;
export type RenderCallback = (renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera) => void;

export class AnimationLoop {
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private animationId: number | null = null;
  
  // Timing
  private lastTime: number = 0;
  private elapsedTime: number = 0;
  private deltaTime: number = 0;
  private frameCount: number = 0;
  private targetFrameTime: number;
  
  // Performance tracking
  private fpsHistory: number[] = [];
  private frameTimeHistory: number[] = [];
  private performanceUpdateInterval: number = 500; // Update every 500ms
  private lastPerformanceUpdate: number = 0;
  
  // Fixed timestep
  private accumulator: number = 0;
  private maxAccumulator: number = 0.25; // Prevent spiral of death
  
  // Callbacks
  private updateCallbacks: Set<UpdateCallback> = new Set();
  private renderCallbacks: Set<RenderCallback> = new Set();
  private preUpdateCallbacks: Set<UpdateCallback> = new Set();
  private postRenderCallbacks: Set<UpdateCallback> = new Set();
  
  private config: AnimationLoopConfig;
  private eventManager: EventManager;
  private stateManager: StateManager;

  constructor(
    config: AnimationLoopConfig,
    eventManager: EventManager,
    stateManager: StateManager
  ) {
    this.config = config;
    this.eventManager = eventManager;
    this.stateManager = stateManager;
    this.targetFrameTime = 1000 / config.targetFPS;
    
    // Bind methods
    this.loop = this.loop.bind(this);
    
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen for performance quality changes
    this.eventManager.on('performance:quality-change', (event) => {
      this.adjustPerformanceSettings(event.data.to);
    });

    // Listen for state changes that affect rendering
    this.stateManager.subscribe('features', (newFeatures, oldFeatures) => {
      if (newFeatures.enableAnimations !== oldFeatures.enableAnimations) {
        if (!newFeatures.enableAnimations) {
          this.pause();
        } else if (this.isPaused) {
          this.resume();
        }
      }
    });
  }

  // Main animation loop
  private loop(currentTime: number): void {
    if (!this.isRunning) return;

    // Calculate delta time
    const rawDeltaTime = currentTime - this.lastTime;
    this.deltaTime = Math.min(rawDeltaTime / 1000, this.config.maxDeltaTime);
    this.lastTime = currentTime;
    this.elapsedTime += this.deltaTime;
    this.frameCount++;

    // Performance tracking
    if (this.config.enablePerformanceTracking) {
      this.trackPerformance(rawDeltaTime);
    }

    // Skip frame if paused
    if (this.isPaused) {
      this.animationId = requestAnimationFrame(this.loop);
      return;
    }

    try {
      if (this.config.enableFixedTimeStep) {
        this.fixedTimeStepUpdate();
      } else {
        this.variableTimeStepUpdate();
      }
    } catch (error) {
      console.error('Error in animation loop:', error);
      this.stateManager.setError(`Animation error: ${error.message}`);
    }

    // Schedule next frame
    if (this.config.enableAdaptiveFrameRate) {
      this.scheduleAdaptiveFrame();
    } else {
      this.animationId = requestAnimationFrame(this.loop);
    }
  }

  private fixedTimeStepUpdate(): void {
    this.accumulator += this.deltaTime;
    
    // Prevent spiral of death
    if (this.accumulator > this.maxAccumulator) {
      this.accumulator = this.maxAccumulator;
    }

    // Update with fixed timestep
    while (this.accumulator >= this.config.fixedTimeStep) {
      // Pre-update callbacks
      this.preUpdateCallbacks.forEach(callback => {
        callback(this.config.fixedTimeStep, this.elapsedTime);
      });

      // Main update callbacks
      this.updateCallbacks.forEach(callback => {
        callback(this.config.fixedTimeStep, this.elapsedTime);
      });

      this.accumulator -= this.config.fixedTimeStep;
    }

    // Render with interpolation
    const alpha = this.accumulator / this.config.fixedTimeStep;
    this.render(alpha);
  }

  private variableTimeStepUpdate(): void {
    // Pre-update callbacks
    this.preUpdateCallbacks.forEach(callback => {
      callback(this.deltaTime, this.elapsedTime);
    });

    // Main update callbacks
    this.updateCallbacks.forEach(callback => {
      callback(this.deltaTime, this.elapsedTime);
    });

    // Render
    this.render();
  }

  private render(interpolationAlpha?: number): void {
    // Execute render callbacks
    this.renderCallbacks.forEach(callback => {
      // Note: renderer, scene, camera would be passed from the main app
      // This is a simplified version
      callback(null as any, null as any, null as any);
    });

    // Post-render callbacks
    this.postRenderCallbacks.forEach(callback => {
      callback(this.deltaTime, this.elapsedTime);
    });
  }

  private scheduleAdaptiveFrame(): void {
    const targetFPS = this.getAdaptiveFPS();
    const targetDelay = 1000 / targetFPS;
    const actualDelay = Math.max(0, targetDelay - this.deltaTime * 1000);

    if (actualDelay > 0) {
      setTimeout(() => {
        this.animationId = requestAnimationFrame(this.loop);
      }, actualDelay);
    } else {
      this.animationId = requestAnimationFrame(this.loop);
    }
  }

  private getAdaptiveFPS(): number {
    const currentFPS = this.getCurrentFPS();
    const targetFPS = this.config.targetFPS;
    
    // If we're consistently below target, reduce target FPS
    if (currentFPS < targetFPS * 0.8) {
      return Math.max(30, targetFPS * 0.75);
    }
    
    // If we're consistently above target, we can aim higher
    if (currentFPS > targetFPS * 1.1) {
      return Math.min(120, targetFPS * 1.1);
    }
    
    return targetFPS;
  }

  private trackPerformance(frameTime: number): void {
    // Add to history
    this.frameTimeHistory.push(frameTime);
    this.fpsHistory.push(1000 / frameTime);

    // Limit history size
    const maxHistory = 60; // Keep last 60 frames
    if (this.frameTimeHistory.length > maxHistory) {
      this.frameTimeHistory.shift();
      this.fpsHistory.shift();
    }

    // Update performance state periodically
    const now = Date.now();
    if (now - this.lastPerformanceUpdate > this.performanceUpdateInterval) {
      this.updatePerformanceState();
      this.lastPerformanceUpdate = now;
    }
  }

  private updatePerformanceState(): void {
    const avgFPS = this.getAverageFPS();
    const avgFrameTime = this.getAverageFrameTime();
    const memoryUsage = this.getMemoryUsage();

    const performanceState: Partial<PerformanceState> = {
      fps: avgFPS,
      frameTime: avgFrameTime,
      memoryUsage: memoryUsage,
      renderCalls: this.frameCount // Simplified
    };

    this.stateManager.updatePerformance(performanceState);

    // Emit performance event
    this.eventManager.emit('performance:update', {
      type: 'performance:update',
      data: {
        fps: avgFPS,
        frameTime: avgFrameTime,
        memoryUsage: memoryUsage,
        frameCount: this.frameCount
      }
    });
  }

  private adjustPerformanceSettings(quality: 'low' | 'medium' | 'high'): void {
    switch (quality) {
      case 'low':
        this.config.targetFPS = 30;
        this.config.enableAdaptiveFrameRate = true;
        break;
      case 'medium':
        this.config.targetFPS = 45;
        this.config.enableAdaptiveFrameRate = true;
        break;
      case 'high':
        this.config.targetFPS = 60;
        this.config.enableAdaptiveFrameRate = false;
        break;
    }

    this.targetFrameTime = 1000 / this.config.targetFPS;
  }

  // Public API
  public start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.loop);

    this.eventManager.emit('animation:start', {
      type: 'animation:start',
      data: { timestamp: Date.now() }
    });
  }

  public stop(): void {
    if (!this.isRunning) return;

    this.isRunning = false;
    this.isPaused = false;
    
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.eventManager.emit('animation:stop', {
      type: 'animation:stop',
      data: { timestamp: Date.now() }
    });
  }

  public pause(): void {
    if (!this.isRunning || this.isPaused) return;

    this.isPaused = true;

    this.eventManager.emit('animation:pause', {
      type: 'animation:pause',
      data: { timestamp: Date.now() }
    });
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;

    this.isPaused = false;
    this.lastTime = performance.now(); // Reset timing

    this.eventManager.emit('animation:resume', {
      type: 'animation:resume',
      data: { timestamp: Date.now() }
    });
  }

  public step(): void {
    if (this.isRunning && !this.isPaused) return;

    const now = performance.now();
    this.deltaTime = this.config.fixedTimeStep;
    this.elapsedTime += this.deltaTime;

    this.variableTimeStepUpdate();
  }

  // Callback management
  public addUpdateCallback(callback: UpdateCallback): () => void {
    this.updateCallbacks.add(callback);
    return () => this.updateCallbacks.delete(callback);
  }

  public addRenderCallback(callback: RenderCallback): () => void {
    this.renderCallbacks.add(callback);
    return () => this.renderCallbacks.delete(callback);
  }

  public addPreUpdateCallback(callback: UpdateCallback): () => void {
    this.preUpdateCallbacks.add(callback);
    return () => this.preUpdateCallbacks.delete(callback);
  }

  public addPostRenderCallback(callback: UpdateCallback): () => void {
    this.postRenderCallbacks.add(callback);
    return () => this.postRenderCallbacks.delete(callback);
  }

  // Performance getters
  public getCurrentFPS(): number {
    return this.fpsHistory.length > 0 ? 
      this.fpsHistory[this.fpsHistory.length - 1] : 0;
  }

  public getAverageFPS(): number {
    if (this.fpsHistory.length === 0) return 0;
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    return sum / this.fpsHistory.length;
  }

  public getAverageFrameTime(): number {
    if (this.frameTimeHistory.length === 0) return 0;
    const sum = this.frameTimeHistory.reduce((a, b) => a + b, 0);
    return sum / this.frameTimeHistory.length;
  }

  public getMemoryUsage(): number {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      return Math.round(memory.usedJSHeapSize / (1024 * 1024)); // MB
    }
    return 0;
  }

  public getFrameStats(): FrameStats {
    return {
      fps: this.getCurrentFPS(),
      frameTime: this.deltaTime * 1000,
      deltaTime: this.deltaTime,
      elapsedTime: this.elapsedTime,
      frameCount: this.frameCount,
      renderCalls: this.frameCount, // Simplified
      memoryUsage: this.getMemoryUsage(),
      triangleCount: 0 // Would need to be tracked separately
    };
  }

  // State getters
  public get running(): boolean {
    return this.isRunning;
  }

  public get paused(): boolean {
    return this.isPaused;
  }

  public get deltaTimeValue(): number {
    return this.deltaTime;
  }

  public get elapsedTimeValue(): number {
    return this.elapsedTime;
  }

  public get frameCountValue(): number {
    return this.frameCount;
  }

  // Configuration
  public setTargetFPS(fps: number): void {
    this.config.targetFPS = Math.max(15, Math.min(120, fps));
    this.targetFrameTime = 1000 / this.config.targetFPS;
  }

  public setAdaptiveFrameRate(enabled: boolean): void {
    this.config.enableAdaptiveFrameRate = enabled;
  }

  public setFixedTimeStep(enabled: boolean, timeStep?: number): void {
    this.config.enableFixedTimeStep = enabled;
    if (timeStep !== undefined) {
      this.config.fixedTimeStep = timeStep;
    }
  }

  // Debug
  public debug(): void {
    console.group('🎬 AnimationLoop Debug');
    console.log('Running:', this.isRunning);
    console.log('Paused:', this.isPaused);
    console.log('Current FPS:', this.getCurrentFPS().toFixed(1));
    console.log('Average FPS:', this.getAverageFPS().toFixed(1));
    console.log('Frame Time:', this.deltaTime.toFixed(3), 'ms');
    console.log('Elapsed Time:', this.elapsedTime.toFixed(3), 's');
    console.log('Frame Count:', this.frameCount);
    console.log('Memory Usage:', this.getMemoryUsage(), 'MB');
    console.log('Update Callbacks:', this.updateCallbacks.size);
    console.log('Render Callbacks:', this.renderCallbacks.size);
    console.groupEnd();
  }

  // Cleanup
  public dispose(): void {
    this.stop();
    this.updateCallbacks.clear();
    this.renderCallbacks.clear();
    this.preUpdateCallbacks.clear();
    this.postRenderCallbacks.clear();
    this.fpsHistory.length = 0;
    this.frameTimeHistory.length = 0;
  }
}
