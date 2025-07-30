/**
 * StateManager - Centralized state management with reactive updates
 */

import { EventManager } from './EventManager';
import { 
  CityState, 
  ViewMode, 
  CameraState, 
  UIState, 
  PerformanceState,
  DistrictId,
  NodeId,
  StateChangeEvent
} from '@/types';

export interface StateConfig {
  enableReactivity: boolean;
  enablePersistence: boolean;
  enableHistory: boolean;
  maxHistorySize: number;
}

export type StateListener<T = any> = (newValue: T, oldValue: T, path: string) => void;

export class StateManager {
  private state: CityState;
  private listeners: Map<string, StateListener[]> = new Map();
  private history: CityState[] = [];
  private config: StateConfig;
  private eventManager: EventManager;

  constructor(
    initialState: Partial<CityState> = {},
    config: StateConfig,
    eventManager: EventManager
  ) {
    this.config = config;
    this.eventManager = eventManager;
    
    // Initialize with default state
    this.state = {
      // View state
      viewMode: 'city',
      zoomLevel: 1,
      targetZoom: 1,
      isTransitioning: false,
      
      // Camera state
      camera: {
        distance: 140,
        targetDistance: 140,
        angle: 0,
        elevation: Math.PI * 0.35,
        isAnimating: false,
        animationDuration: 0
      },
      
      // Selection state
      selectedDistrict: null,
      selectedNode: null,
      hoveredDistrict: null,
      hoveredNode: null,
      
      // UI state
      ui: {
        showHUD: true,
        showInspector: false,
        showControls: true,
        showLabels: true,
        hudOpacity: 1,
        inspectorData: null
      },
      
      // Performance state
      performance: {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        activeParticles: 0,
        renderCalls: 0,
        quality: 'high',
        adaptiveQuality: true
      },
      
      // Features state
      features: {
        showFlow: true,
        showHeatmap: false,
        showConnections: true,
        enableAnimations: true,
        enableShadows: true,
        enablePostProcessing: false
      },
      
      // Data state
      lastUpdate: Date.now(),
      isLoading: false,
      hasError: false,
      errorMessage: null,
      
      ...initialState
    };

    // Save initial state to history
    if (this.config.enableHistory) {
      this.saveToHistory();
    }

    // Load from persistence if enabled
    if (this.config.enablePersistence) {
      this.loadFromPersistence();
    }
  }

  // Core state access
  public getState(): Readonly<CityState> {
    return { ...this.state };
  }

  public getStateProperty<K extends keyof CityState>(key: K): CityState[K] {
    return this.state[key];
  }

  public setState(updates: Partial<CityState>): void {
    const oldState = { ...this.state };
    this.state = { ...this.state, ...updates };

    // Save to history
    if (this.config.enableHistory) {
      this.saveToHistory();
    }

    // Persist if enabled
    if (this.config.enablePersistence) {
      this.saveToPeristence();
    }

    // Notify listeners
    if (this.config.enableReactivity) {
      this.notifyListeners(updates, oldState);
    }

    // Emit global state change event
    this.eventManager.emit('state:change', {
      type: 'state:change',
      data: { updates, oldState, newState: this.state }
    } as StateChangeEvent);
  }

  // View mode management
  public setViewMode(mode: ViewMode): void {
    if (this.state.viewMode === mode) return;

    const oldMode = this.state.viewMode;
    this.setState({ 
      viewMode: mode,
      isTransitioning: true
    });

    this.eventManager.emit('view:mode-change', {
      type: 'view:mode-change',
      data: { from: oldMode, to: mode }
    });

    // Clear transition flag after delay
    setTimeout(() => {
      this.setState({ isTransitioning: false });
    }, 300);
  }

  public getViewMode(): ViewMode {
    return this.state.viewMode;
  }

  // Camera state management
  public setCameraState(cameraState: Partial<CameraState>): void {
    this.setState({
      camera: { ...this.state.camera, ...cameraState }
    });
  }

  public getCameraState(): CameraState {
    return this.state.camera;
  }

  public setCameraDistance(distance: number, animate: boolean = true): void {
    if (animate) {
      this.setCameraState({
        targetDistance: distance,
        isAnimating: true,
        animationDuration: 500
      });
    } else {
      this.setCameraState({
        distance,
        targetDistance: distance,
        isAnimating: false
      });
    }
  }

  // Selection management
  public selectDistrict(districtId: DistrictId | null): void {
    if (this.state.selectedDistrict === districtId) return;

    const oldSelection = this.state.selectedDistrict;
    this.setState({ 
      selectedDistrict: districtId,
      selectedNode: null // Clear node selection when district changes
    });

    this.eventManager.emit('selection:district-change', {
      type: 'selection:district-change',
      data: { from: oldSelection, to: districtId }
    });
  }

  public selectNode(nodeId: NodeId | null): void {
    if (this.state.selectedNode === nodeId) return;

    const oldSelection = this.state.selectedNode;
    this.setState({ selectedNode: nodeId });

    this.eventManager.emit('selection:node-change', {
      type: 'selection:node-change',
      data: { from: oldSelection, to: nodeId }
    });
  }

  public setHoveredDistrict(districtId: DistrictId | null): void {
    if (this.state.hoveredDistrict === districtId) return;
    this.setState({ hoveredDistrict: districtId });
  }

  public setHoveredNode(nodeId: NodeId | null): void {
    if (this.state.hoveredNode === nodeId) return;
    this.setState({ hoveredNode: nodeId });
  }

  // UI state management
  public setUIState(uiState: Partial<UIState>): void {
    this.setState({
      ui: { ...this.state.ui, ...uiState }
    });
  }

  public showInspector(data: any): void {
    this.setUIState({
      showInspector: true,
      inspectorData: data
    });
  }

  public hideInspector(): void {
    this.setUIState({
      showInspector: false,
      inspectorData: null
    });
  }

  // Performance state management
  public updatePerformance(performanceData: Partial<PerformanceState>): void {
    this.setState({
      performance: { ...this.state.performance, ...performanceData }
    });

    // Auto-adjust quality if adaptive quality is enabled
    if (this.state.performance.adaptiveQuality && performanceData.fps !== undefined) {
      this.autoAdjustQuality(performanceData.fps);
    }
  }

  private autoAdjustQuality(currentFPS: number): void {
    const targetFPS = 55;
    const currentQuality = this.state.performance.quality;

    if (currentFPS < targetFPS && currentQuality !== 'low') {
      const newQuality = currentQuality === 'high' ? 'medium' : 'low';
      this.setState({
        performance: { ...this.state.performance, quality: newQuality }
      });

      this.eventManager.emit('performance:quality-change', {
        type: 'performance:quality-change',
        data: { from: currentQuality, to: newQuality, reason: 'performance' }
      });
    } else if (currentFPS > targetFPS + 10 && currentQuality !== 'high') {
      const newQuality = currentQuality === 'low' ? 'medium' : 'high';
      this.setState({
        performance: { ...this.state.performance, quality: newQuality }
      });

      this.eventManager.emit('performance:quality-change', {
        type: 'performance:quality-change',
        data: { from: currentQuality, to: newQuality, reason: 'performance' }
      });
    }
  }

  // Feature toggles
  public toggleFeature(feature: keyof CityState['features']): void {
    const currentValue = this.state.features[feature];
    this.setState({
      features: {
        ...this.state.features,
        [feature]: !currentValue
      }
    });

    this.eventManager.emit('feature:toggle', {
      type: 'feature:toggle',
      data: { feature, enabled: !currentValue }
    });
  }

  public setFeature(feature: keyof CityState['features'], enabled: boolean): void {
    if (this.state.features[feature] === enabled) return;

    this.setState({
      features: {
        ...this.state.features,
        [feature]: enabled
      }
    });

    this.eventManager.emit('feature:toggle', {
      type: 'feature:toggle',
      data: { feature, enabled }
    });
  }

  // Loading and error states
  public setLoading(isLoading: boolean): void {
    this.setState({ isLoading });
  }

  public setError(error: string | null): void {
    this.setState({
      hasError: error !== null,
      errorMessage: error
    });
  }

  // Reactive listeners
  public subscribe<K extends keyof CityState>(
    path: K,
    listener: StateListener<CityState[K]>
  ): () => void;
  public subscribe(path: string, listener: StateListener): () => void;
  public subscribe(path: string, listener: StateListener): () => void {
    if (!this.listeners.has(path)) {
      this.listeners.set(path, []);
    }
    
    this.listeners.get(path)!.push(listener);
    
    // Return unsubscribe function
    return () => {
      const pathListeners = this.listeners.get(path);
      if (pathListeners) {
        const index = pathListeners.indexOf(listener);
        if (index > -1) {
          pathListeners.splice(index, 1);
        }
      }
    };
  }

  private notifyListeners(updates: Partial<CityState>, oldState: CityState): void {
    for (const [key, newValue] of Object.entries(updates)) {
      const pathListeners = this.listeners.get(key);
      if (pathListeners) {
        const oldValue = oldState[key as keyof CityState];
        pathListeners.forEach(listener => {
          try {
            listener(newValue, oldValue, key);
          } catch (error) {
            console.error(`Error in state listener for ${key}:`, error);
          }
        });
      }
    }
  }

  // History management
  public saveToHistory(): void {
    if (!this.config.enableHistory) return;

    this.history.push({ ...this.state });
    
    // Limit history size
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  public undo(): boolean {
    if (!this.config.enableHistory || this.history.length < 2) return false;

    // Remove current state
    this.history.pop();
    
    // Get previous state
    const previousState = this.history[this.history.length - 1];
    if (previousState) {
      this.state = { ...previousState };
      this.notifyListeners(this.state, this.state);
      return true;
    }
    
    return false;
  }

  public getHistory(): readonly CityState[] {
    return [...this.history];
  }

  // Persistence
  private saveToPeristence(): void {
    if (!this.config.enablePersistence) return;

    try {
      const stateToSave = {
        camera: this.state.camera,
        features: this.state.features,
        ui: this.state.ui,
        performance: { quality: this.state.performance.quality }
      };
      
      localStorage.setItem('companycity-state', JSON.stringify(stateToSave));
    } catch (error) {
      console.warn('Failed to save state to localStorage:', error);
    }
  }

  private loadFromPersistence(): void {
    if (!this.config.enablePersistence) return;

    try {
      const saved = localStorage.getItem('companycity-state');
      if (saved) {
        const parsedState = JSON.parse(saved);
        this.setState(parsedState);
      }
    } catch (error) {
      console.warn('Failed to load state from localStorage:', error);
    }
  }

  // Utility methods
  public reset(): void {
    const initialState: CityState = {
      viewMode: 'city',
      zoomLevel: 1,
      targetZoom: 1,
      isTransitioning: false,
      camera: {
        distance: 140,
        targetDistance: 140,
        angle: 0,
        elevation: Math.PI * 0.35,
        isAnimating: false,
        animationDuration: 0
      },
      selectedDistrict: null,
      selectedNode: null,
      hoveredDistrict: null,
      hoveredNode: null,
      ui: {
        showHUD: true,
        showInspector: false,
        showControls: true,
        showLabels: true,
        hudOpacity: 1,
        inspectorData: null
      },
      performance: {
        fps: 60,
        frameTime: 16.67,
        memoryUsage: 0,
        activeParticles: 0,
        renderCalls: 0,
        quality: 'high',
        adaptiveQuality: true
      },
      features: {
        showFlow: true,
        showHeatmap: false,
        showConnections: true,
        enableAnimations: true,
        enableShadows: true,
        enablePostProcessing: false
      },
      lastUpdate: Date.now(),
      isLoading: false,
      hasError: false,
      errorMessage: null
    };

    this.setState(initialState);
  }

  public dispose(): void {
    this.listeners.clear();
    this.history.length = 0;
    
    if (this.config.enablePersistence) {
      this.saveToPeristence();
    }
  }

  // Debug helpers
  public debug(): void {
    console.group('🏙️ CompanyCity State');
    console.log('Current State:', this.state);
    console.log('Listeners:', this.listeners.size);
    console.log('History Size:', this.history.length);
    console.groupEnd();
  }
}
