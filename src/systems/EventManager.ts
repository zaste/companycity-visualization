/**
 * EventManager - Type-safe event system for component communication
 */

import { 
  EventType, 
  EventListener, 
  EventData, 
  EventContext,
  CityEvent,
  ViewEvent,
  SelectionEvent,
  StateChangeEvent,
  PerformanceEvent,
  InteractionEvent
} from '@/types';

export interface EventManagerConfig {
  enableDebug: boolean;
  enableHistory: boolean;
  maxHistorySize: number;
  enablePerformanceTracking: boolean;
}

export interface EventHistory {
  type: EventType;
  data: any;
  timestamp: number;
  context?: EventContext;
}

export class EventManager {
  private listeners: Map<EventType, EventListener[]> = new Map();
  private onceListeners: Map<EventType, EventListener[]> = new Map();
  private history: EventHistory[] = [];
  private config: EventManagerConfig;
  private eventCount: number = 0;
  private performanceMetrics: Map<EventType, { count: number; totalTime: number }> = new Map();

  constructor(config: EventManagerConfig = {
    enableDebug: false,
    enableHistory: true,
    maxHistorySize: 1000,
    enablePerformanceTracking: false
  }) {
    this.config = config;
  }

  // Core event methods
  public emit<T extends EventType>(
    type: T,
    event: CityEvent<T>,
    context?: EventContext
  ): void {
    const startTime = this.config.enablePerformanceTracking ? performance.now() : 0;

    // Add to history
    if (this.config.enableHistory) {
      this.addToHistory(type, event.data, context);
    }

    // Debug logging
    if (this.config.enableDebug) {
      console.log(`📡 Event: ${type}`, event.data, context);
    }

    // Execute regular listeners
    const regularListeners = this.listeners.get(type);
    if (regularListeners) {
      regularListeners.forEach(listener => {
        try {
          listener(event, context);
        } catch (error) {
          console.error(`Error in event listener for ${type}:`, error);
        }
      });
    }

    // Execute once listeners
    const onceListeners = this.onceListeners.get(type);
    if (onceListeners) {
      onceListeners.forEach(listener => {
        try {
          listener(event, context);
        } catch (error) {
          console.error(`Error in once event listener for ${type}:`, error);
        }
      });
      // Clear once listeners after execution
      this.onceListeners.delete(type);
    }

    // Track performance
    if (this.config.enablePerformanceTracking) {
      const endTime = performance.now();
      this.trackPerformance(type, endTime - startTime);
    }

    this.eventCount++;
  }

  public on<T extends EventType>(
    type: T,
    listener: EventListener<T>
  ): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, []);
    }

    this.listeners.get(type)!.push(listener as EventListener);

    // Return unsubscribe function
    return () => {
      this.off(type, listener);
    };
  }

  public once<T extends EventType>(
    type: T,
    listener: EventListener<T>
  ): void {
    if (!this.onceListeners.has(type)) {
      this.onceListeners.set(type, []);
    }

    this.onceListeners.get(type)!.push(listener as EventListener);
  }

  public off<T extends EventType>(
    type: T,
    listener: EventListener<T>
  ): void {
    const listeners = this.listeners.get(type);
    if (listeners) {
      const index = listeners.indexOf(listener as EventListener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }

    const onceListeners = this.onceListeners.get(type);
    if (onceListeners) {
      const index = onceListeners.indexOf(listener as EventListener);
      if (index > -1) {
        onceListeners.splice(index, 1);
      }
    }
  }

  // Typed event emitters for common events
  public emitViewChange(from: string, to: string): void {
    this.emit('view:mode-change', {
      type: 'view:mode-change',
      data: { from, to }
    } as ViewEvent);
  }

  public emitDistrictSelect(districtId: string | null): void {
    this.emit('selection:district-change', {
      type: 'selection:district-change',
      data: { districtId }
    } as SelectionEvent);
  }

  public emitNodeSelect(nodeId: string | null): void {
    this.emit('selection:node-change', {
      type: 'selection:node-change',
      data: { nodeId }
    } as SelectionEvent);
  }

  public emitCameraMove(position: { x: number; y: number; z: number }): void {
    this.emit('camera:move', {
      type: 'camera:move',
      data: { position }
    });
  }

  public emitPerformanceUpdate(fps: number, frameTime: number): void {
    this.emit('performance:update', {
      type: 'performance:update',
      data: { fps, frameTime }
    } as PerformanceEvent);
  }

  public emitInteraction(interactionType: string, data: any): void {
    this.emit('interaction:user', {
      type: 'interaction:user',
      data: { interactionType, ...data }
    } as InteractionEvent);
  }

  // Async event handling
  public async emitAsync<T extends EventType>(
    type: T,
    event: CityEvent<T>,
    context?: EventContext
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.emit(type, event, context);
        resolve();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Event composition and chaining
  public pipe<T extends EventType>(
    fromType: T,
    toType: EventType,
    transform?: (data: any) => any
  ): () => void {
    return this.on(fromType, (event) => {
      const newData = transform ? transform(event.data) : event.data;
      this.emit(toType as any, {
        type: toType,
        data: newData
      } as any);
    });
  }

  // Event filtering and middleware
  public filter<T extends EventType>(
    type: T,
    predicate: (event: CityEvent<T>) => boolean,
    listener: EventListener<T>
  ): () => void {
    return this.on(type, (event, context) => {
      if (predicate(event)) {
        listener(event, context);
      }
    });
  }

  public throttle<T extends EventType>(
    type: T,
    listener: EventListener<T>,
    delay: number
  ): () => void {
    let lastCall = 0;
    
    return this.on(type, (event, context) => {
      const now = Date.now();
      if (now - lastCall >= delay) {
        lastCall = now;
        listener(event, context);
      }
    });
  }

  public debounce<T extends EventType>(
    type: T,
    listener: EventListener<T>,
    delay: number
  ): () => void {
    let timeoutId: number | null = null;
    
    return this.on(type, (event, context) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      timeoutId = window.setTimeout(() => {
        listener(event, context);
        timeoutId = null;
      }, delay);
    });
  }

  // Event history management
  private addToHistory(type: EventType, data: any, context?: EventContext): void {
    if (!this.config.enableHistory) return;

    this.history.push({
      type,
      data,
      timestamp: Date.now(),
      context
    });

    // Limit history size
    if (this.history.length > this.config.maxHistorySize) {
      this.history.shift();
    }
  }

  public getHistory(): readonly EventHistory[] {
    return [...this.history];
  }

  public getHistoryForType(type: EventType): readonly EventHistory[] {
    return this.history.filter(entry => entry.type === type);
  }

  public clearHistory(): void {
    this.history.length = 0;
  }

  // Performance tracking
  private trackPerformance(type: EventType, executionTime: number): void {
    if (!this.performanceMetrics.has(type)) {
      this.performanceMetrics.set(type, { count: 0, totalTime: 0 });
    }

    const metrics = this.performanceMetrics.get(type)!;
    metrics.count++;
    metrics.totalTime += executionTime;
  }

  public getPerformanceMetrics(): Map<EventType, { count: number; averageTime: number }> {
    const result = new Map();
    
    this.performanceMetrics.forEach((metrics, type) => {
      result.set(type, {
        count: metrics.count,
        averageTime: metrics.totalTime / metrics.count
      });
    });

    return result;
  }

  // Utility methods
  public hasListeners(type: EventType): boolean {
    const regularListeners = this.listeners.get(type);
    const onceListeners = this.onceListeners.get(type);
    
    return (regularListeners && regularListeners.length > 0) ||
           (onceListeners && onceListeners.length > 0);
  }

  public getListenerCount(type?: EventType): number {
    if (type) {
      const regular = this.listeners.get(type)?.length || 0;
      const once = this.onceListeners.get(type)?.length || 0;
      return regular + once;
    }

    let total = 0;
    this.listeners.forEach(listeners => total += listeners.length);
    this.onceListeners.forEach(listeners => total += listeners.length);
    return total;
  }

  public removeAllListeners(type?: EventType): void {
    if (type) {
      this.listeners.delete(type);
      this.onceListeners.delete(type);
    } else {
      this.listeners.clear();
      this.onceListeners.clear();
    }
  }

  // Debug and monitoring
  public debug(): void {
    console.group('📡 EventManager Debug');
    console.log('Total Events Emitted:', this.eventCount);
    console.log('Active Listeners:', this.getListenerCount());
    console.log('History Size:', this.history.length);
    
    if (this.config.enablePerformanceTracking) {
      console.log('Performance Metrics:', Object.fromEntries(this.getPerformanceMetrics()));
    }
    
    const listenersByType = new Map();
    this.listeners.forEach((listeners, type) => {
      listenersByType.set(type, listeners.length);
    });
    console.log('Listeners by Type:', Object.fromEntries(listenersByType));
    
    console.groupEnd();
  }

  public getStats(): {
    totalEvents: number;
    activeListeners: number;
    historySize: number;
    listenersByType: Record<string, number>;
  } {
    const listenersByType: Record<string, number> = {};
    this.listeners.forEach((listeners, type) => {
      listenersByType[type] = listeners.length;
    });

    return {
      totalEvents: this.eventCount,
      activeListeners: this.getListenerCount(),
      historySize: this.history.length,
      listenersByType
    };
  }

  // Cleanup
  public dispose(): void {
    this.removeAllListeners();
    this.clearHistory();
    this.performanceMetrics.clear();
    this.eventCount = 0;
  }

  // Event patterns
  public waitFor<T extends EventType>(
    type: T,
    timeout?: number
  ): Promise<CityEvent<T>> {
    return new Promise((resolve, reject) => {
      let timeoutId: number | null = null;
      
      const cleanup = this.once(type, (event) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        resolve(event);
      });

      if (timeout) {
        timeoutId = window.setTimeout(() => {
          cleanup();
          reject(new Error(`Timeout waiting for event: ${type}`));
        }, timeout);
      }
    });
  }

  public when<T extends EventType>(
    condition: () => boolean,
    type: T
  ): Promise<CityEvent<T>> {
    return new Promise((resolve) => {
      const check = () => {
        if (condition()) {
          this.once(type, resolve);
        } else {
          requestAnimationFrame(check);
        }
      };
      check();
    });
  }
}
