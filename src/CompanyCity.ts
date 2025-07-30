/**
 * CompanyCity - Main application class that orchestrates the entire 3D visualization
 */

import * as THREE from 'three';
import { Scene } from '@/core/Scene';
import { Camera } from '@/core/Camera';
import { Renderer } from '@/core/Renderer';
import { District } from '@/components/District';
import { ParticleSystem } from '@/components/ParticleSystem';
import { StateManager } from '@/systems/StateManager';
import { EventManager } from '@/systems/EventManager';
import { AnimationLoop } from '@/systems/AnimationLoop';
import { InputManager } from '@/systems/InputManager';
import { LODManager } from '@/systems/LODManager';
import { 
  CityConfig, 
  CityData, 
  DistrictData, 
  NodeData, 
  ViewMode,
  Vector3,
  DistrictId,
  NodeId
} from '@/types';
import { DEFAULT_CONFIG } from '@/config';

export interface CompanyCityOptions {
  container: string | HTMLElement;
  data?: CityData;
  config?: Partial<CityConfig>;
  enableRealtimeData?: boolean;
  onReady?: () => void;
  onError?: (error: Error) => void;
}

export class CompanyCity {
  // Core systems
  private eventManager: EventManager;
  private stateManager: StateManager;
  private animationLoop: AnimationLoop;
  private inputManager: InputManager;
  private lodManager: LODManager;

  // 3D Engine
  private scene: Scene;
  private camera: Camera;
  private renderer: Renderer;
  private particleSystem: ParticleSystem;

  // Component collections
  private districts: Map<DistrictId, District> = new Map();
  private districtGroups: Map<string, DistrictId[]> = new Map();

  // Configuration and data
  private config: CityConfig;
  private data: CityData;
  private container: HTMLElement;

  // State flags
  private isInitialized: boolean = false;
  private isDisposed: boolean = false;
  private isLoading: boolean = false;

  constructor(options: CompanyCityOptions) {
    // Validate and setup container
    this.container = this.resolveContainer(options.container);
    this.config = { ...DEFAULT_CONFIG, ...options.config };
    this.data = options.data || { districts: [] };

    try {
      this.initializeSystems();
      this.initializeEngine();
      this.setupEventListeners();
      
      if (this.data.districts.length > 0) {
        this.loadData(this.data);
      }

      this.isInitialized = true;
      
      if (options.onReady) {
        options.onReady();
      }

      this.eventManager.emit('city:ready', {
        type: 'city:ready',
        data: { timestamp: Date.now() }
      });

    } catch (error) {
      const errorObj = error instanceof Error ? error : new Error(String(error));
      
      if (options.onError) {
        options.onError(errorObj);
      } else {
        console.error('CompanyCity initialization failed:', errorObj);
      }

      this.stateManager?.setError(errorObj.message);
    }
  }

  private resolveContainer(container: string | HTMLElement): HTMLElement {
    if (typeof container === 'string') {
      const element = document.querySelector(container) as HTMLElement;
      if (!element) {
        throw new Error(`Container not found: ${container}`);
      }
      return element;
    }
    
    if (!(container instanceof HTMLElement)) {
      throw new Error('Container must be a string selector or HTMLElement');
    }
    
    return container;
  }

  private initializeSystems(): void {
    // Initialize core systems
    this.eventManager = new EventManager({
      enableDebug: this.config.debug.enableEventDebug,
      enableHistory: true,
      maxHistorySize: 1000,
      enablePerformanceTracking: this.config.performance.enablePerformanceTracking
    });

    this.stateManager = new StateManager(
      {
        performance: {
          quality: this.config.performance.quality,
          adaptiveQuality: this.config.performance.enableAdaptiveQuality,
          fps: 60,
          frameTime: 16.67,
          memoryUsage: 0,
          activeParticles: 0,
          renderCalls: 0
        },
        features: {
          showFlow: this.config.effects.enableParticles,
          showHeatmap: false,
          showConnections: this.config.city.showConnections,
          enableAnimations: this.config.effects.enableAnimations,
          enableShadows: this.config.lighting.enableShadows,
          enablePostProcessing: this.config.effects.enablePostProcessing
        }
      },
      {
        enableReactivity: true,
        enablePersistence: this.config.enablePersistence,
        enableHistory: true,
        maxHistorySize: 50
      },
      this.eventManager
    );

    this.animationLoop = new AnimationLoop(
      {
        targetFPS: this.config.performance.targetFPS,
        enableAdaptiveFrameRate: this.config.performance.enableAdaptiveQuality,
        enablePerformanceTracking: this.config.performance.enablePerformanceTracking,
        maxDeltaTime: 0.1,
        enableFixedTimeStep: false,
        fixedTimeStep: 1/60
      },
      this.eventManager,
      this.stateManager
    );

    this.inputManager = new InputManager(
      this.container,
      this.eventManager,
      this.stateManager
    );

    this.lodManager = new LODManager(
      this.eventManager,
      this.stateManager
    );
  }

  private initializeEngine(): void {
    // Initialize 3D engine components
    this.scene = new Scene(this.config.scene, this.eventManager);
    this.camera = new Camera(this.config.camera, this.eventManager, this.stateManager);
    this.renderer = new Renderer(
      this.container,
      this.config.renderer,
      this.eventManager,
      this.stateManager
    );

    // Initialize particle system
    this.particleSystem = new ParticleSystem({
      maxParticles: this.config.effects.maxParticles,
      spawnRate: this.config.effects.particleSpawnRate,
      enablePhysics: this.config.effects.enablePhysics,
      enableCollisions: false,
      quality: this.config.performance.quality
    });

    this.scene.add(this.particleSystem.group);

    // Setup animation callbacks
    this.animationLoop.addUpdateCallback((deltaTime, elapsedTime) => {
      this.update(deltaTime, elapsedTime);
    });

    this.animationLoop.addRenderCallback(() => {
      this.render();
    });
  }

  private setupEventListeners(): void {
    // Camera events
    this.eventManager.on('camera:move', (event) => {
      this.updateViewModeBasedOnDistance();
    });

    // Selection events
    this.eventManager.on('selection:district-change', (event) => {
      const { from, to } = event.data;
      this.handleDistrictSelection(from, to);
    });

    this.eventManager.on('selection:node-change', (event) => {
      const { from, to } = event.data;
      this.handleNodeSelection(from, to);
    });

    // Performance events
    this.eventManager.on('performance:quality-change', (event) => {
      this.adjustQualitySettings(event.data.to);
    });

    // Feature toggle events
    this.eventManager.on('feature:toggle', (event) => {
      this.handleFeatureToggle(event.data.feature, event.data.enabled);
    });

    // Window resize
    window.addEventListener('resize', () => {
      this.handleResize();
    });

    // Visibility change (for performance)
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) {
        this.animationLoop.pause();
      } else {
        this.animationLoop.resume();
      }
    });
  }

  private update(deltaTime: number, elapsedTime: number): void {
    if (this.isDisposed) return;

    // Update camera
    this.camera.update(deltaTime);

    // Update districts
    this.districts.forEach(district => {
      district.update(deltaTime, elapsedTime);
    });

    // Update particle system
    this.particleSystem.update(deltaTime);

    // Update LOD system
    this.lodManager.update(this.camera.position);

    // Spawn particles occasionally
    if (this.stateManager.getStateProperty('features').showFlow) {
      this.spawnRandomParticles(deltaTime);
    }

    // Update last update timestamp
    this.stateManager.setState({ lastUpdate: Date.now() });
  }

  private render(): void {
    if (this.isDisposed) return;

    try {
      this.renderer.render(this.scene.threeScene, this.camera.threeCamera);
    } catch (error) {
      console.error('Render error:', error);
      this.stateManager.setError(`Render error: ${error.message}`);
    }
  }

  private spawnRandomParticles(deltaTime: number): void {
    const districts = Array.from(this.districts.values());
    if (districts.length < 2) return;

    // Spawn particles occasionally
    if (Math.random() < deltaTime * 0.5) { // 50% chance per second
      const fromDistrict = districts[Math.floor(Math.random() * districts.length)];
      let toDistrict = districts[Math.floor(Math.random() * districts.length)];
      
      // Ensure different districts
      while (toDistrict === fromDistrict && districts.length > 1) {
        toDistrict = districts[Math.floor(Math.random() * districts.length)];
      }

      const fromPos = fromDistrict.getWorldPosition();
      const toPos = toDistrict.getWorldPosition();

      this.particleSystem.spawnDataFlow(fromPos, toPos, fromDistrict.color);
    }
  }

  private updateViewModeBasedOnDistance(): void {
    const distance = this.camera.distance;
    let newMode: ViewMode;

    if (distance > 150) {
      newMode = 'city';
    } else if (distance < 100) {
      newMode = 'network';
    } else {
      newMode = 'transition';
    }

    if (this.stateManager.getStateProperty('viewMode') !== newMode) {
      this.stateManager.setViewMode(newMode);
      this.updateDistrictVisibility(newMode);
    }
  }

  private updateDistrictVisibility(viewMode: ViewMode): void {
    this.districts.forEach(district => {
      district.setViewMode(viewMode);
    });

    // Update particle system visibility
    this.particleSystem.setEnabled(viewMode !== 'network');
  }

  private handleDistrictSelection(from: DistrictId | null, to: DistrictId | null): void {
    // Deselect previous district
    if (from) {
      const district = this.districts.get(from);
      if (district) {
        district.setSelected(false);
      }
    }

    // Select new district
    if (to) {
      const district = this.districts.get(to);
      if (district) {
        district.setSelected(true);
        
        // Zoom to district
        const position = district.getWorldPosition();
        this.camera.lookAt(position);
        this.camera.setDistance(80, true);
      }
    }
  }

  private handleNodeSelection(from: NodeId | null, to: NodeId | null): void {
    // Find and update node selection states
    this.districts.forEach(district => {
      district.nodes.forEach(building => {
        if (from && building.id === from) {
          building.setSelected(false);
        }
        if (to && building.id === to) {
          building.setSelected(true);
        }
      });
    });
  }

  private adjustQualitySettings(quality: 'low' | 'medium' | 'high'): void {
    // Update particle system quality
    this.particleSystem.setQuality(quality);

    // Update renderer quality
    this.renderer.setQuality(quality);

    // Update LOD distances
    const lodDistances: [number, number, number] = quality === 'high' 
      ? [50, 100, 200] 
      : quality === 'medium' 
        ? [75, 150, 250] 
        : [100, 200, 300];

    this.lodManager.setDistances(lodDistances);
  }

  private handleFeatureToggle(feature: string, enabled: boolean): void {
    switch (feature) {
      case 'showFlow':
        this.particleSystem.setEnabled(enabled);
        break;
      case 'enableShadows':
        this.renderer.setShadowsEnabled(enabled);
        break;
      case 'enableAnimations':
        if (enabled) {
          this.animationLoop.resume();
        } else {
          this.animationLoop.pause();
        }
        break;
    }
  }

  private handleResize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;

    this.camera.setAspect(width / height);
    this.renderer.setSize(width, height);
  }

  // Public API
  public start(): void {
    if (!this.isInitialized || this.isDisposed) {
      throw new Error('CompanyCity not properly initialized');
    }

    this.animationLoop.start();
    this.stateManager.setLoading(false);

    this.eventManager.emit('city:start', {
      type: 'city:start',
      data: { timestamp: Date.now() }
    });
  }

  public stop(): void {
    this.animationLoop.stop();

    this.eventManager.emit('city:stop', {
      type: 'city:stop',
      data: { timestamp: Date.now() }
    });
  }

  public pause(): void {
    this.animationLoop.pause();
  }

  public resume(): void {
    this.animationLoop.resume();
  }

  // Data management
  public async loadData(data: CityData): Promise<void> {
    this.stateManager.setLoading(true);

    try {
      this.data = data;
      await this.createDistricts(data.districts);
      this.stateManager.setLoading(false);

      this.eventManager.emit('city:data-loaded', {
        type: 'city:data-loaded',
        data: { districtsCount: data.districts.length }
      });

    } catch (error) {
      this.stateManager.setLoading(false);
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.stateManager.setError(errorMessage);
      throw error;
    }
  }

  private async createDistricts(districtsData: DistrictData[]): Promise<void> {
    // Clear existing districts
    this.districts.forEach(district => district.dispose());
    this.districts.clear();

    // Create new districts
    for (const districtData of districtsData) {
      const district = new District(districtData, {
        enableShadows: this.config.lighting.enableShadows,
        enableAnimations: this.config.effects.enableAnimations,
        quality: this.config.performance.quality,
        scale: this.config.city.districtScale
      });

      this.districts.set(districtData.id, district);
      this.scene.add(district.group);

      // Setup event listeners for district
      district.group.userData.onClick = () => {
        this.stateManager.selectDistrict(districtData.id);
      };
    }

    // Setup LOD management
    this.lodManager.addObjects(Array.from(this.districts.values()));
  }

  public addDistrict(districtData: DistrictData): void {
    if (this.districts.has(districtData.id)) {
      throw new Error(`District with id '${districtData.id}' already exists`);
    }

    const district = new District(districtData, {
      enableShadows: this.config.lighting.enableShadows,
      enableAnimations: this.config.effects.enableAnimations,
      quality: this.config.performance.quality,
      scale: this.config.city.districtScale
    });

    this.districts.set(districtData.id, district);
    this.scene.add(district.group);

    this.eventManager.emit('city:district-added', {
      type: 'city:district-added',
      data: { districtId: districtData.id }
    });
  }

  public removeDistrict(districtId: DistrictId): void {
    const district = this.districts.get(districtId);
    if (!district) return;

    district.dispose();
    this.districts.delete(districtId);

    this.eventManager.emit('city:district-removed', {
      type: 'city:district-removed',
      data: { districtId }
    });
  }

  // View control
  public setViewMode(mode: ViewMode): void {
    this.stateManager.setViewMode(mode);
  }

  public resetView(): void {
    this.camera.reset();
    this.stateManager.selectDistrict(null);
    this.stateManager.selectNode(null);
  }

  public focusOnDistrict(districtId: DistrictId): void {
    this.stateManager.selectDistrict(districtId);
  }

  public focusOnNode(nodeId: NodeId): void {
    this.stateManager.selectNode(nodeId);
  }

  // Feature control
  public toggleFeature(feature: keyof CityConfig['features']): void {
    this.stateManager.toggleFeature(feature as any);
  }

  public setQuality(quality: 'low' | 'medium' | 'high'): void {
    this.stateManager.setState({
      performance: {
        ...this.stateManager.getStateProperty('performance'),
        quality
      }
    });
  }

  // Real-time data updates
  public updateNodeMetrics(nodeId: NodeId, metrics: NodeData['metrics']): void {
    this.districts.forEach(district => {
      const building = district.nodes.find(n => n.id === nodeId);
      if (building) {
        building.updateMetrics(metrics);
      }
    });

    this.eventManager.emit('data:node-updated', {
      type: 'data:node-updated',
      data: { nodeId, metrics }
    });
  }

  // Getters
  public get state(): Readonly<typeof this.stateManager.getState> {
    return this.stateManager.getState.bind(this.stateManager);
  }

  public get isRunning(): boolean {
    return this.animationLoop.running;
  }

  public get isPaused(): boolean {
    return this.animationLoop.paused;
  }

  public get frameStats(): typeof this.animationLoop.getFrameStats {
    return this.animationLoop.getFrameStats.bind(this.animationLoop);
  }

  // Debug
  public debug(): void {
    console.group('🏙️ CompanyCity Debug');
    console.log('Initialized:', this.isInitialized);
    console.log('Running:', this.isRunning);
    console.log('Districts:', this.districts.size);
    console.log('Container:', this.container);
    
    this.stateManager.debug();
    this.eventManager.debug();
    this.animationLoop.debug();
    
    console.groupEnd();
  }

  // Cleanup
  public dispose(): void {
    if (this.isDisposed) return;

    this.stop();

    // Dispose districts
    this.districts.forEach(district => district.dispose());
    this.districts.clear();

    // Dispose systems
    this.particleSystem?.dispose();
    this.lodManager?.dispose();
    this.inputManager?.dispose();
    this.animationLoop?.dispose();
    this.stateManager?.dispose();
    this.eventManager?.dispose();

    // Dispose 3D engine
    this.renderer?.dispose();
    this.camera?.dispose();
    this.scene?.dispose();

    this.isDisposed = true;

    this.eventManager.emit('city:disposed', {
      type: 'city:disposed',
      data: { timestamp: Date.now() }
    });
  }
}

// Export for convenience
export default CompanyCity;
