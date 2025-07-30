/**
 * InputManager - Unified input handling for mouse, keyboard, and touch
 */

import * as THREE from 'three';
import { EventManager } from './EventManager';
import { StateManager } from './StateManager';
import { Vector3 } from '@/types';

export interface InputConfig {
  enableMouse: boolean;
  enableKeyboard: boolean;
  enableTouch: boolean;
  mouseSensitivity: number;
  touchSensitivity: number;
  keyboardSpeed: number;
  enableGestures: boolean;
}

export interface TouchGesture {
  type: 'pinch' | 'pan' | 'tap' | 'long-press';
  startTime: number;
  startPosition: Vector3;
  currentPosition: Vector3;
  scale?: number;
  rotation?: number;
}

export class InputManager {
  private container: HTMLElement;
  private eventManager: EventManager;
  private stateManager: StateManager;
  private config: InputConfig;

  // Mouse state
  private mouse = {
    position: new THREE.Vector2(),
    previousPosition: new THREE.Vector2(),
    isDown: false,
    button: -1,
    startPosition: new THREE.Vector2(),
    hasMoved: false
  };

  // Touch state
  private touches: Map<number, Touch> = new Map();
  private gestureState: TouchGesture | null = null;
  private lastTouchTime: number = 0;

  // Keyboard state
  private keys: Set<string> = new Set();
  private keyboardEnabled: boolean = true;

  // Raycasting
  private raycaster: THREE.Raycaster;
  private intersectedObjects: THREE.Object3D[] = [];

  // Event listeners cleanup
  private cleanupFunctions: (() => void)[] = [];

  constructor(
    container: HTMLElement,
    eventManager: EventManager,
    stateManager: StateManager,
    config: Partial<InputConfig> = {}
  ) {
    this.container = container;
    this.eventManager = eventManager;
    this.stateManager = stateManager;
    
    this.config = {
      enableMouse: true,
      enableKeyboard: true,
      enableTouch: true,
      mouseSensitivity: 1.0,
      touchSensitivity: 1.0,
      keyboardSpeed: 1.0,
      enableGestures: true,
      ...config
    };

    this.raycaster = new THREE.Raycaster();

    this.setupEventListeners();
    this.setupKeyboardShortcuts();
  }

  private setupEventListeners(): void {
    // Mouse events
    if (this.config.enableMouse) {
      this.setupMouseEvents();
    }

    // Touch events  
    if (this.config.enableTouch) {
      this.setupTouchEvents();
    }

    // Keyboard events
    if (this.config.enableKeyboard) {
      this.setupKeyboardEvents();
    }

    // Prevent context menu
    const preventContextMenu = (e: Event) => e.preventDefault();
    this.container.addEventListener('contextmenu', preventContextMenu);
    this.cleanupFunctions.push(() => {
      this.container.removeEventListener('contextmenu', preventContextMenu);
    });
  }

  private setupMouseEvents(): void {
    // Mouse down
    const onMouseDown = (event: MouseEvent) => {
      this.mouse.isDown = true;
      this.mouse.button = event.button;
      this.mouse.startPosition.set(event.clientX, event.clientY);
      this.mouse.previousPosition.copy(this.mouse.startPosition);
      this.mouse.hasMoved = false;

      this.updateMousePosition(event);
      this.container.style.cursor = 'grabbing';

      this.eventManager.emit('input:mouse-down', {
        type: 'input:mouse-down',
        data: {
          button: event.button,
          position: this.mouse.position.clone(),
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey
        }
      });
    };

    // Mouse move
    const onMouseMove = (event: MouseEvent) => {
      this.updateMousePosition(event);

      if (this.mouse.isDown) {
        const deltaX = event.clientX - this.mouse.previousPosition.x;
        const deltaY = event.clientY - this.mouse.previousPosition.y;
        
        this.mouse.hasMoved = true;

        // Emit camera rotation event
        this.eventManager.emit('input:camera-rotate', {
          type: 'input:camera-rotate',
          data: {
            deltaX: deltaX * this.config.mouseSensitivity,
            deltaY: deltaY * this.config.mouseSensitivity
          }
        });

        this.mouse.previousPosition.set(event.clientX, event.clientY);
      } else {
        // Handle hover
        this.handleHover();
      }
    };

    // Mouse up
    const onMouseUp = (event: MouseEvent) => {
      this.mouse.isDown = false;
      this.container.style.cursor = 'grab';

      // If mouse didn't move much, treat as click
      if (!this.mouse.hasMoved) {
        this.handleClick(event);
      }

      this.eventManager.emit('input:mouse-up', {
        type: 'input:mouse-up',
        data: {
          button: event.button,
          position: this.mouse.position.clone()
        }
      });
    };

    // Mouse wheel
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      
      const delta = event.deltaY > 0 ? 1.1 : 0.9;
      
      this.eventManager.emit('input:camera-zoom', {
        type: 'input:camera-zoom',
        data: { delta, position: this.mouse.position.clone() }
      });
    };

    // Add event listeners
    this.container.addEventListener('mousedown', onMouseDown);
    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
    this.container.addEventListener('wheel', onWheel, { passive: false });

    // Cleanup
    this.cleanupFunctions.push(() => {
      this.container.removeEventListener('mousedown', onMouseDown);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      this.container.removeEventListener('wheel', onWheel);
    });
  }

  private setupTouchEvents(): void {
    let lastTouchDistance = 0;
    let lastTouchCenter = new THREE.Vector2();

    // Touch start
    const onTouchStart = (event: TouchEvent) => {
      event.preventDefault();

      const touches = Array.from(event.touches);
      this.lastTouchTime = Date.now();

      if (touches.length === 1) {
        // Single touch - start pan or tap
        const touch = touches[0];
        this.gestureState = {
          type: 'tap',
          startTime: Date.now(),
          startPosition: { x: touch.clientX, y: touch.clientY, z: 0 },
          currentPosition: { x: touch.clientX, y: touch.clientY, z: 0 }
        };

        this.updateMousePosition(touch);
      } else if (touches.length === 2) {
        // Two touches - pinch/zoom
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        lastTouchDistance = this.getTouchDistance(touch1, touch2);
        lastTouchCenter = this.getTouchCenter(touch1, touch2);
        
        this.gestureState = {
          type: 'pinch',
          startTime: Date.now(),
          startPosition: { x: lastTouchCenter.x, y: lastTouchCenter.y, z: 0 },
          currentPosition: { x: lastTouchCenter.x, y: lastTouchCenter.y, z: 0 },
          scale: 1
        };
      }
    };

    // Touch move
    const onTouchMove = (event: TouchEvent) => {
      event.preventDefault();

      const touches = Array.from(event.touches);

      if (touches.length === 1 && this.gestureState?.type === 'tap') {
        // Single touch move - pan
        const touch = touches[0];
        const deltaX = touch.clientX - this.gestureState.currentPosition.x;
        const deltaY = touch.clientY - this.gestureState.currentPosition.y;

        this.gestureState.type = 'pan';
        this.gestureState.currentPosition = { x: touch.clientX, y: touch.clientY, z: 0 };

        this.eventManager.emit('input:camera-rotate', {
          type: 'input:camera-rotate',
          data: {
            deltaX: deltaX * this.config.touchSensitivity,
            deltaY: deltaY * this.config.touchSensitivity
          }
        });

      } else if (touches.length === 2 && this.gestureState?.type === 'pinch') {
        // Two touch move - pinch/zoom
        const touch1 = touches[0];
        const touch2 = touches[1];
        
        const currentDistance = this.getTouchDistance(touch1, touch2);
        const currentCenter = this.getTouchCenter(touch1, touch2);
        
        // Handle zoom
        const scale = currentDistance / lastTouchDistance;
        this.eventManager.emit('input:camera-zoom', {
          type: 'input:camera-zoom',
          data: { delta: 1 / scale, position: currentCenter }
        });

        // Handle pan
        const deltaX = currentCenter.x - lastTouchCenter.x;
        const deltaY = currentCenter.y - lastTouchCenter.y;
        
        if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
          this.eventManager.emit('input:camera-rotate', {
            type: 'input:camera-rotate',
            data: {
              deltaX: deltaX * this.config.touchSensitivity * 0.5,
              deltaY: deltaY * this.config.touchSensitivity * 0.5
            }
          });
        }

        lastTouchDistance = currentDistance;
        lastTouchCenter = currentCenter;
      }
    };

    // Touch end
    const onTouchEnd = (event: TouchEvent) => {
      event.preventDefault();

      if (this.gestureState?.type === 'tap') {
        const duration = Date.now() - this.gestureState.startTime;
        const distance = Math.sqrt(
          Math.pow(this.gestureState.currentPosition.x - this.gestureState.startPosition.x, 2) +
          Math.pow(this.gestureState.currentPosition.y - this.gestureState.startPosition.y, 2)
        );

        if (duration < 300 && distance < 10) {
          // Handle tap
          this.updateMousePosition(this.gestureState.currentPosition);
          this.handleClick();
        }
      }

      this.gestureState = null;
    };

    // Add touch event listeners
    this.container.addEventListener('touchstart', onTouchStart, { passive: false });
    this.container.addEventListener('touchmove', onTouchMove, { passive: false });
    this.container.addEventListener('touchend', onTouchEnd, { passive: false });

    // Cleanup
    this.cleanupFunctions.push(() => {
      this.container.removeEventListener('touchstart', onTouchStart);
      this.container.removeEventListener('touchmove', onTouchMove);
      this.container.removeEventListener('touchend', onTouchEnd);
    });
  }

  private setupKeyboardEvents(): void {
    // Key down
    const onKeyDown = (event: KeyboardEvent) => {
      if (!this.keyboardEnabled) return;

      const key = event.code;
      this.keys.add(key);

      // Handle immediate actions
      this.handleKeyboardShortcut(event);

      this.eventManager.emit('input:key-down', {
        type: 'input:key-down',
        data: {
          key: event.key,
          code: event.code,
          altKey: event.altKey,
          ctrlKey: event.ctrlKey,
          shiftKey: event.shiftKey
        }
      });
    };

    // Key up
    const onKeyUp = (event: KeyboardEvent) => {
      const key = event.code;
      this.keys.delete(key);

      this.eventManager.emit('input:key-up', {
        type: 'input:key-up',
        data: {
          key: event.key,
          code: event.code
        }
      });
    };

    // Add keyboard event listeners
    document.addEventListener('keydown', onKeyDown);
    document.addEventListener('keyup', onKeyUp);

    // Cleanup
    this.cleanupFunctions.push(() => {
      document.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('keyup', onKeyUp);
    });
  }

  private setupKeyboardShortcuts(): void {
    const shortcuts = {
      'Escape': () => this.stateManager.selectDistrict(null),
      'Space': () => this.eventManager.emit('input:toggle-pause', { type: 'input:toggle-pause', data: {} }),
      'KeyR': () => this.eventManager.emit('input:reset-view', { type: 'input:reset-view', data: {} }),
      'KeyF': () => this.toggleFullscreen(),
      'Digit1': () => this.stateManager.setViewMode('city'),
      'Digit2': () => this.stateManager.setViewMode('network'),
      'KeyH': () => this.eventManager.emit('input:toggle-help', { type: 'input:toggle-help', data: {} }),
      'ArrowUp': () => this.handleCameraMovement('forward'),
      'ArrowDown': () => this.handleCameraMovement('backward'),
      'ArrowLeft': () => this.handleCameraMovement('left'),
      'ArrowRight': () => this.handleCameraMovement('right')
    };

    this.eventManager.on('input:key-down', (event) => {
      const shortcut = shortcuts[event.data.code as keyof typeof shortcuts];
      if (shortcut) {
        event.data.preventDefault?.();
        shortcut();
      }
    });
  }

  private updateMousePosition(event: MouseEvent | Touch | Vector3): void {
    let clientX: number, clientY: number;

    if ('clientX' in event) {
      clientX = event.clientX;
      clientY = event.clientY;
    } else {
      clientX = event.x;
      clientY = event.y;
    }

    const rect = this.container.getBoundingClientRect();
    this.mouse.position.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.position.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  private getTouchDistance(touch1: Touch, touch2: Touch): number {
    const dx = touch1.clientX - touch2.clientX;
    const dy = touch1.clientY - touch2.clientY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  private getTouchCenter(touch1: Touch, touch2: Touch): THREE.Vector2 {
    return new THREE.Vector2(
      (touch1.clientX + touch2.clientX) / 2,
      (touch1.clientY + touch2.clientY) / 2
    );
  }

  private handleClick(event?: MouseEvent): void {
    // Emit click event with raycast results
    this.eventManager.emit('input:click', {
      type: 'input:click',
      data: {
        position: this.mouse.position.clone(),
        button: event?.button || 0,
        intersections: [] // Would be populated by actual raycast
      }
    });
  }

  private handleHover(): void {
    // Emit hover event
    this.eventManager.emit('input:hover', {
      type: 'input:hover',
      data: {
        position: this.mouse.position.clone(),
        intersections: [] // Would be populated by actual raycast
      }
    });
  }

  private handleKeyboardShortcut(event: KeyboardEvent): void {
    // Prevent default for handled shortcuts
    const handledKeys = [
      'Space', 'KeyR', 'KeyF', 'Digit1', 'Digit2', 'KeyH',
      'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'
    ];

    if (handledKeys.includes(event.code)) {
      event.preventDefault();
    }
  }

  private handleCameraMovement(direction: 'forward' | 'backward' | 'left' | 'right'): void {
    const moveSpeed = this.config.keyboardSpeed * 5;
    
    this.eventManager.emit('input:camera-move', {
      type: 'input:camera-move',
      data: { direction, speed: moveSpeed }
    });
  }

  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch(err => {
        console.warn('Failed to enter fullscreen:', err);
      });
    } else {
      document.exitFullscreen().catch(err => {
        console.warn('Failed to exit fullscreen:', err);
      });
    }
  }

  // Public API
  public setMouseSensitivity(sensitivity: number): void {
    this.config.mouseSensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
  }

  public setTouchSensitivity(sensitivity: number): void {
    this.config.touchSensitivity = Math.max(0.1, Math.min(5.0, sensitivity));
  }

  public setKeyboardSpeed(speed: number): void {
    this.config.keyboardSpeed = Math.max(0.1, Math.min(5.0, speed));
  }

  public enableKeyboard(enabled: boolean): void {
    this.keyboardEnabled = enabled;
  }

  public isKeyPressed(key: string): boolean {
    return this.keys.has(key);
  }

  public getMousePosition(): THREE.Vector2 {
    return this.mouse.position.clone();
  }

  public isMouseDown(): boolean {
    return this.mouse.isDown;
  }

  public getConfig(): InputConfig {
    return { ...this.config };
  }

  // Raycasting utilities (would be used by the main app)
  public performRaycast(
    camera: THREE.Camera,
    objects: THREE.Object3D[]
  ): THREE.Intersection[] {
    this.raycaster.setFromCamera(this.mouse.position, camera);
    return this.raycaster.intersectObjects(objects, true);
  }

  // Debug
  public debug(): void {
    console.group('🎯 InputManager Debug');
    console.log('Mouse Position:', this.mouse.position);
    console.log('Mouse Down:', this.mouse.isDown);
    console.log('Active Keys:', Array.from(this.keys));
    console.log('Gesture State:', this.gestureState);
    console.log('Config:', this.config);
    console.groupEnd();
  }

  // Cleanup
  public dispose(): void {
    // Remove all event listeners
    this.cleanupFunctions.forEach(cleanup => cleanup());
    this.cleanupFunctions.length = 0;

    // Clear state
    this.keys.clear();
    this.touches.clear();
    this.gestureState = null;
    this.intersectedObjects.length = 0;
  }
}
