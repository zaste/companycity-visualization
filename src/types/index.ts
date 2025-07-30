/**
 * Core type definitions for CompanyCity Visualization
 */

import * as THREE from 'three';

// Branded types for better type safety
export type DistrictId = string & { readonly __brand: 'DistrictId' };
export type NodeId = string & { readonly __brand: 'NodeId' };
export type ThemeId = string & { readonly __brand: 'ThemeId' };

// Vector types for position data
export interface Vector2 {
  x: number;
  z: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

// Configuration interfaces
export interface CityConfig {
  container: string | HTMLElement;
  data: CityData;
  theme?: ThemeId | ThemeConfig;
  performance?: PerformanceMode | PerformanceConfig;
  enableRealtimeData?: boolean;
  plugins?: PluginConfig[];
}

export interface CityData {
  districts: DistrictData[];
  connections?: ConnectionData[];
  metadata?: CityMetadata;
}

export interface DistrictData {
  id: DistrictId;
  name: string;
  position: Vector2;
  color: number;
  scale?: number;
  nodes: NodeData[];
  metadata?: DistrictMetadata;
}

export interface NodeData {
  id: NodeId;
  name: string;
  relPos: Vector2;
  type?: NodeType;
  metrics?: NodeMetrics;
  metadata?: NodeMetadata;
}

export interface ConnectionData {
  from: NodeId;
  to: NodeId;
  type?: ConnectionType;
  weight?: number;
  bidirectional?: boolean;
}

// Metadata interfaces
export interface CityMetadata {
  name?: string;
  description?: string;
  version?: string;
  lastUpdated?: Date;
}

export interface DistrictMetadata {
  description?: string;
  owner?: string;
  status?: DistrictStatus;
  tags?: string[];
}

export interface NodeMetadata {
  description?: string;
  version?: string;
  uptime?: number;
  dependencies?: NodeId[];
}

// Enums and literal types
export type ViewMode = 'city' | 'network' | 'transition';
export type PerformanceMode = 'low' | 'medium' | 'high' | 'adaptive';
export type NodeType = 'service' | 'database' | 'api' | 'queue' | 'cache' | 'monitor';
export type ConnectionType = 'data' | 'api' | 'event' | 'dependency';
export type DistrictStatus = 'active' | 'warning' | 'error' | 'maintenance';

// Performance configuration
export interface PerformanceConfig {
  targetFPS?: number;
  maxParticles?: number;
  shadowQuality?: 'low' | 'medium' | 'high';
  lodDistances?: [number, number, number]; // [high, medium, low]
  postProcessing?: boolean;
  adaptiveQuality?: boolean;
}

// Theme configuration
export interface ThemeConfig {
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  textColor: string;
  fontFamily: string;
  borderRadius: number;
  shadows: boolean;
}

// Real-time metrics
export interface NodeMetrics {
  throughput: number;
  latency: number;
  errorRate: number;
  cpu?: number;
  memory?: number;
  connections?: number;
  timestamp: number;
}

// Camera state
export interface CameraState {
  distance: number;
  angle: number;
  elevation: number;
  target: Vector3;
  fov: number;
}

// Input state
export interface InputState {
  mouse: {
    x: number;
    y: number;
    down: boolean;
    button: number;
  };
  keyboard: {
    pressed: Set<string>;
  };
  touch: {
    touches: TouchInfo[];
    scale: number;
  };
}

export interface TouchInfo {
  id: number;
  x: number;
  y: number;
  force?: number;
}

// Animation and effects
export interface AnimationState {
  time: number;
  deltaTime: number;
  frameCount: number;
  fps: number;
}

export interface ParticleConfig {
  maxCount: number;
  spawnRate: number;
  lifetime: number;
  speed: [number, number]; // [min, max]
  size: [number, number]; // [min, max]
  color: number | number[];
  trail: boolean;
}

// Plugin system
export interface PluginConfig {
  name: string;
  enabled: boolean;
  options?: Record<string, any>;
}

export interface PluginAPI {
  registerComponent(name: string, component: any): void;
  registerSystem(name: string, system: any): void;
  on(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  getState(): any;
  setState(updates: any): void;
}

// Event system
export interface EventMap {
  'city:loaded': [CityData];
  'district:selected': [DistrictData];
  'district:deselected': [DistrictId];
  'node:selected': [NodeData];
  'node:deselected': [NodeId];
  'view:changed': [ViewMode, ViewMode]; // [new, old]
  'camera:moved': [CameraState];
  'performance:warning': [PerformanceWarning];
  'data:updated': [NodeId, NodeMetrics];
  'error': [Error];
}

export interface PerformanceWarning {
  type: 'fps' | 'memory' | 'rendering';
  value: number;
  threshold: number;
  timestamp: number;
}

// Utility types
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredKeys<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

// Three.js extensions
export interface ExtendedMesh extends THREE.Mesh {
  userData: {
    id?: string;
    type?: string;
    component?: any;
    [key: string]: any;
  };
}

export interface ExtendedGroup extends THREE.Group {
  userData: {
    id?: string;
    type?: string;
    component?: any;
    [key: string]: any;
  };
}

// Type guards
export function isDistrictId(value: any): value is DistrictId {
  return typeof value === 'string' && value.length > 0;
}

export function isNodeId(value: any): value is NodeId {
  return typeof value === 'string' && value.length > 0;
}

export function isVector2(value: any): value is Vector2 {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.x === 'number' &&
    typeof value.z === 'number'
  );
}

export function isVector3(value: any): value is Vector3 {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof value.x === 'number' &&
    typeof value.y === 'number' &&
    typeof value.z === 'number'
  );
}

// Utility functions
export function createDistrictId(id: string): DistrictId {
  return id as DistrictId;
}

export function createNodeId(id: string): NodeId {
  return id as NodeId;
}

export function createThemeId(id: string): ThemeId {
  return id as ThemeId;
}

// Constants
export const DEFAULT_PERFORMANCE_CONFIG: PerformanceConfig = {
  targetFPS: 60,
  maxParticles: 1000,
  shadowQuality: 'medium',
  lodDistances: [50, 100, 200],
  postProcessing: true,
  adaptiveQuality: true,
};

export const DEFAULT_THEME_CONFIG: ThemeConfig = {
  primaryColor: '#8b5cf6',
  backgroundColor: '#050510',
  accentColor: '#00ff88',
  textColor: '#ffffff',
  fontFamily: '-apple-system, "SF Pro Display", sans-serif',
  borderRadius: 8,
  shadows: true,
};

export const HEX_SIZE = 25;
export const HEX_RADIUS = HEX_SIZE * 3;
export const MAX_DISTRICTS = 12;
export const MIN_CAMERA_DISTANCE = 30;
export const MAX_CAMERA_DISTANCE = 300;
