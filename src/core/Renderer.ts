/**
 * Renderer - Advanced WebGL renderer with performance optimizations
 */

import * as THREE from 'three';
import { PerformanceConfig, ThemeConfig } from '@/types';

export interface RendererConfig {
  canvas?: HTMLCanvasElement;
  container?: HTMLElement;
  performance: PerformanceConfig;
  theme: ThemeConfig;
  enableShadows?: boolean;
  enablePostProcessing?: boolean;
  pixelRatio?: number;
}

export interface RenderStats {
  fps: number;
  frameTime: number;
  drawCalls: number;
  triangles: number;
  geometries: number;
  textures: number;
  programs: number;
  memory: {
    geometries: number;
    textures: number;
  };
}

export class Renderer {
  public readonly renderer: THREE.WebGLRenderer;
  public readonly domElement: HTMLElement;
  
  private config: RendererConfig;
  private stats: RenderStats;
  private frameCount: number = 0;
  private lastTime: number = 0;
  private frameBuffer: number[] = [];
  private readonly frameBufferSize = 60;
  
  // Performance monitoring
  private adaptiveQuality: boolean = false;
  private currentQualityLevel: number = 1.0;
  private lastPerformanceCheck: number = 0;
  private performanceCheckInterval: number = 1000; // 1 second
  
  constructor(config: RendererConfig) {
    this.config = config;
    
    // Initialize stats
    this.stats = {
      fps: 60,
      frameTime: 16.67,
      drawCalls: 0,
      triangles: 0,
      geometries: 0,
      textures: 0,
      programs: 0,
      memory: {
        geometries: 0,
        textures: 0,
      },
    };
    
    this.renderer = this.createRenderer();
    this.domElement = this.setupContainer();
    this.setupPerformanceMonitoring();
  }

  private createRenderer(): THREE.WebGLRenderer {
    const renderer = new THREE.WebGLRenderer({
      canvas: this.config.canvas,
      antialias: this.config.performance.shadowQuality !== 'low',
      alpha: false,
      powerPreference: 'high-performance',
      stencil: false,
      depth: true,
    });
    
    // Basic setup
    const pixelRatio = this.config.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    renderer.setPixelRatio(pixelRatio);
    renderer.setClearColor(this.config.theme.backgroundColor);
    
    // Shadow configuration
    if (this.config.enableShadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = this.getShadowMapType();
    }
    
    // Tone mapping for better colors
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    
    // Output encoding
    renderer.outputEncoding = THREE.sRGBEncoding;
    
    // Enable adaptive quality if configured
    this.adaptiveQuality = this.config.performance.adaptiveQuality ?? false;
    
    return renderer;
  }

  private getShadowMapType(): THREE.ShadowMapType {
    switch (this.config.performance.shadowQuality) {
      case 'high':
        return THREE.PCFSoftShadowMap;
      case 'medium':
        return THREE.PCFShadowMap;
      case 'low':
      default:
        return THREE.BasicShadowMap;
    }
  }

  private setupContainer(): HTMLElement {
    if (this.config.container) {
      this.config.container.appendChild(this.renderer.domElement);
      return this.config.container;
    }
    
    return this.renderer.domElement;
  }

  private setupPerformanceMonitoring(): void {
    this.lastTime = performance.now();
  }

  public render(scene: THREE.Scene, camera: THREE.Camera): void {
    const startTime = performance.now();
    
    // Update performance stats
    this.updateStats(startTime);
    
    // Adaptive quality adjustment
    if (this.adaptiveQuality) {
      this.checkPerformance(startTime);
    }
    
    // Render the scene
    this.renderer.render(scene, camera);
    
    // Update frame timing
    const endTime = performance.now();
    const frameTime = endTime - startTime;
    this.updateFrameBuffer(frameTime);
    
    this.frameCount++;
  }

  private updateStats(currentTime: number): void {
    const deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;
    
    // Calculate FPS
    this.stats.fps = 1000 / deltaTime;
    this.stats.frameTime = deltaTime;
    
    // Update renderer info
    const info = this.renderer.info;
    this.stats.drawCalls = info.render.calls;
    this.stats.triangles = info.render.triangles;
    this.stats.geometries = info.memory.geometries;
    this.stats.textures = info.memory.textures;
    this.stats.programs = info.programs?.length ?? 0;
    
    // Memory stats (approximation)
    this.stats.memory.geometries = info.memory.geometries;
    this.stats.memory.textures = info.memory.textures;
  }

  private updateFrameBuffer(frameTime: number): void {
    this.frameBuffer.push(frameTime);
    
    if (this.frameBuffer.length > this.frameBufferSize) {
      this.frameBuffer.shift();
    }
  }

  private checkPerformance(currentTime: number): void {
    if (currentTime - this.lastPerformanceCheck < this.performanceCheckInterval) {
      return;
    }
    
    this.lastPerformanceCheck = currentTime;
    
    if (this.frameBuffer.length < this.frameBufferSize / 2) {
      return; // Not enough samples
    }
    
    const avgFrameTime = this.frameBuffer.reduce((sum, time) => sum + time, 0) / this.frameBuffer.length;
    const avgFPS = 1000 / avgFrameTime;
    const targetFPS = this.config.performance.targetFPS ?? 60;
    
    // Performance adjustment logic
    if (avgFPS < targetFPS * 0.8) {
      // Performance is too low, reduce quality
      this.reduceQuality();
    } else if (avgFPS > targetFPS * 0.95 && this.currentQualityLevel < 1.0) {
      // Performance is good, we can increase quality
      this.increaseQuality();
    }
  }

  private reduceQuality(): void {
    const step = 0.1;
    this.currentQualityLevel = Math.max(0.3, this.currentQualityLevel - step);
    this.applyQualityLevel();
  }

  private increaseQuality(): void {
    const step = 0.05;
    this.currentQualityLevel = Math.min(1.0, this.currentQualityLevel + step);
    this.applyQualityLevel();
  }

  private applyQualityLevel(): void {
    // Adjust pixel ratio based on quality
    const basePixelRatio = this.config.pixelRatio ?? Math.min(window.devicePixelRatio, 2);
    const adjustedPixelRatio = basePixelRatio * this.currentQualityLevel;
    this.renderer.setPixelRatio(adjustedPixelRatio);
    
    // Adjust shadow map size
    if (this.config.enableShadows) {
      const baseShadowMapSize = {
        low: 512,
        medium: 1024,
        high: 2048,
      }[this.config.performance.shadowQuality ?? 'medium'];
      
      const adjustedSize = Math.floor(baseShadowMapSize * this.currentQualityLevel);
      
      // This would need to be applied to all shadow-casting lights
      // We'll emit an event that the scene can listen to
      this.domElement.dispatchEvent(new CustomEvent('qualityChanged', {
        detail: {
          qualityLevel: this.currentQualityLevel,
          shadowMapSize: adjustedSize,
        },
      }));
    }
  }

  public resize(width: number, height: number): void {
    this.renderer.setSize(width, height, false);
  }

  public setPixelRatio(ratio: number): void {
    this.config.pixelRatio = ratio;
    this.renderer.setPixelRatio(ratio);
  }

  public updateTheme(theme: ThemeConfig): void {
    this.config.theme = theme;
    this.renderer.setClearColor(theme.backgroundColor);
  }

  public updatePerformance(config: PerformanceConfig): void {
    this.config.performance = config;
    
    // Update shadow quality
    if (this.config.enableShadows) {
      this.renderer.shadowMap.type = this.getShadowMapType();
    }
    
    // Update adaptive quality
    this.adaptiveQuality = config.adaptiveQuality ?? false;
    
    if (!this.adaptiveQuality) {
      this.currentQualityLevel = 1.0;
      this.applyQualityLevel();
    }
  }

  public enableShadows(enable: boolean): void {
    this.config.enableShadows = enable;
    this.renderer.shadowMap.enabled = enable;
    
    if (enable) {
      this.renderer.shadowMap.type = this.getShadowMapType();
    }
  }

  public setToneMapping(toneMapping: THREE.ToneMapping, exposure: number = 1.0): void {
    this.renderer.toneMapping = toneMapping;
    this.renderer.toneMappingExposure = exposure;
  }

  public screenshot(width?: number, height?: number): string {
    const originalSize = this.renderer.getSize(new THREE.Vector2());
    
    if (width && height) {
      this.renderer.setSize(width, height, false);
    }
    
    // Render current frame
    this.renderer.render;
    
    // Get image data
    const canvas = this.renderer.domElement;
    const dataURL = canvas.toDataURL('image/png');
    
    // Restore original size
    if (width && height) {
      this.renderer.setSize(originalSize.x, originalSize.y, false);
    }
    
    return dataURL;
  }

  public getAverageFPS(): number {
    if (this.frameBuffer.length === 0) return 0;
    
    const avgFrameTime = this.frameBuffer.reduce((sum, time) => sum + time, 0) / this.frameBuffer.length;
    return 1000 / avgFrameTime;
  }

  public getPerformanceGrade(): string {
    const avgFPS = this.getAverageFPS();
    
    if (avgFPS >= 55) return 'A';
    if (avgFPS >= 45) return 'B';
    if (avgFPS >= 30) return 'C';
    if (avgFPS >= 20) return 'D';
    return 'F';
  }

  public isPerformancePoor(): boolean {
    return this.getAverageFPS() < (this.config.performance.targetFPS ?? 60) * 0.7;
  }

  public resetPerformanceStats(): void {
    this.frameBuffer.length = 0;
    this.frameCount = 0;
    this.lastTime = performance.now();
    this.currentQualityLevel = 1.0;
  }

  public dispose(): void {
    this.renderer.dispose();
    this.frameBuffer.length = 0;
    
    if (this.domElement && this.domElement.parentNode) {
      this.domElement.parentNode.removeChild(this.domElement);
    }
  }

  // Getters
  public get canvas(): HTMLCanvasElement {
    return this.renderer.domElement;
  }

  public get context(): WebGLRenderingContext | WebGL2RenderingContext {
    return this.renderer.getContext();
  }

  public get capabilities(): THREE.WebGLCapabilities {
    return this.renderer.capabilities;
  }

  public get renderStats(): RenderStats {
    return { ...this.stats };
  }

  public get qualityLevel(): number {
    return this.currentQualityLevel;
  }

  public get isAdaptiveQuality(): boolean {
    return this.adaptiveQuality;
  }

  public get size(): THREE.Vector2 {
    return this.renderer.getSize(new THREE.Vector2());
  }

  public get pixelRatio(): number {
    return this.renderer.getPixelRatio();
  }
}
