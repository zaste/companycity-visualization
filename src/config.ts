/**
 * Default configuration for CompanyCity Visualization
 */

import {
  CityConfig,
  CityData,
  DistrictData,
  PerformanceConfig,
  ThemeConfig,
  DEFAULT_PERFORMANCE_CONFIG,
  DEFAULT_THEME_CONFIG,
  createDistrictId,
  createNodeId,
} from '@/types';

export const DEFAULT_CONFIG: Partial<CityConfig> = {
  theme: 'dark' as any,
  performance: 'adaptive',
  enableRealtimeData: false,
  plugins: [],
};

export const DEFAULT_CITY_DATA: CityData = {
  districts: [
    {
      id: createDistrictId('central-core'),
      name: 'Central Core',
      position: { x: 0, z: 0 },
      color: 0x8b5cf6,
      scale: 1.2,
      nodes: [
        {
          id: createNodeId('event-bus'),
          name: 'Event Bus',
          relPos: { x: 0, z: 0 },
          type: 'queue',
        },
        {
          id: createNodeId('cache-layer'),
          name: 'Cache Layer',
          relPos: { x: -10, z: -10 },
          type: 'cache',
        },
        {
          id: createNodeId('queue-manager'),
          name: 'Queue Manager',
          relPos: { x: 10, z: -10 },
          type: 'queue',
        },
        {
          id: createNodeId('monitor'),
          name: 'System Monitor',
          relPos: { x: 0, z: 10 },
          type: 'monitor',
        },
      ],
      metadata: {
        description: 'Core infrastructure services',
        status: 'active',
        tags: ['core', 'infrastructure'],
      },
    },
    {
      id: createDistrictId('customer-journey'),
      name: 'Customer Journey',
      position: { x: 75, z: 0 },
      color: 0x00ff88,
      scale: 1.0,
      nodes: [
        {
          id: createNodeId('lead-capture'),
          name: 'Lead Capture',
          relPos: { x: -10, z: -10 },
          type: 'api',
        },
        {
          id: createNodeId('validation'),
          name: 'Validation Engine',
          relPos: { x: 10, z: -10 },
          type: 'service',
        },
        {
          id: createNodeId('scoring'),
          name: 'Scoring System',
          relPos: { x: 0, z: 10 },
          type: 'service',
        },
        {
          id: createNodeId('routing'),
          name: 'Smart Router',
          relPos: { x: -10, z: 10 },
          type: 'service',
        },
      ],
      metadata: {
        description: 'Customer acquisition and processing pipeline',
        status: 'active',
        tags: ['customer', 'pipeline'],
      },
    },
    {
      id: createDistrictId('data-processing'),
      name: 'Data Processing',
      position: { x: 37.5, z: 65 },
      color: 0x00aaff,
      scale: 1.0,
      nodes: [
        {
          id: createNodeId('etl-pipeline'),
          name: 'ETL Pipeline',
          relPos: { x: 0, z: -10 },
          type: 'service',
        },
        {
          id: createNodeId('transform-1'),
          name: 'Transform Alpha',
          relPos: { x: -10, z: 10 },
          type: 'service',
        },
        {
          id: createNodeId('transform-2'),
          name: 'Transform Beta',
          relPos: { x: 10, z: 10 },
          type: 'service',
        },
        {
          id: createNodeId('data-lake'),
          name: 'Data Lake',
          relPos: { x: 0, z: 0 },
          type: 'database',
        },
      ],
      metadata: {
        description: 'Data transformation and storage',
        status: 'active',
        tags: ['data', 'etl'],
      },
    },
    {
      id: createDistrictId('ai-intelligence'),
      name: 'AI Intelligence',
      position: { x: -37.5, z: 65 },
      color: 0xff00aa,
      scale: 1.0,
      nodes: [
        {
          id: createNodeId('orchestrator'),
          name: 'AI Orchestrator',
          relPos: { x: 0, z: 0 },
          type: 'service',
        },
        {
          id: createNodeId('ml-model-1'),
          name: 'Prediction Model',
          relPos: { x: -15, z: -10 },
          type: 'service',
        },
        {
          id: createNodeId('ml-model-2'),
          name: 'Classification Model',
          relPos: { x: 15, z: -10 },
          type: 'service',
        },
        {
          id: createNodeId('decision-engine'),
          name: 'Decision Engine',
          relPos: { x: 0, z: 15 },
          type: 'service',
        },
      ],
      metadata: {
        description: 'Machine learning and AI services',
        status: 'active',
        tags: ['ai', 'ml'],
      },
    },
    {
      id: createDistrictId('integration-hub'),
      name: 'Integration Hub',
      position: { x: -75, z: 0 },
      color: 0xff6b00,
      scale: 1.0,
      nodes: [
        {
          id: createNodeId('api-gateway'),
          name: 'API Gateway',
          relPos: { x: 0, z: -10 },
          type: 'api',
        },
        {
          id: createNodeId('webhook-handler'),
          name: 'Webhook Handler',
          relPos: { x: -10, z: 10 },
          type: 'api',
        },
        {
          id: createNodeId('event-publisher'),
          name: 'Event Publisher',
          relPos: { x: 10, z: 10 },
          type: 'queue',
        },
      ],
      metadata: {
        description: 'External system integrations',
        status: 'active',
        tags: ['integration', 'api'],
      },
    },
    {
      id: createDistrictId('analytics-platform'),
      name: 'Analytics Platform',
      position: { x: -37.5, z: -65 },
      color: 0xffff00,
      scale: 1.0,
      nodes: [
        {
          id: createNodeId('metrics-collector'),
          name: 'Metrics Collector',
          relPos: { x: 0, z: -10 },
          type: 'monitor',
        },
        {
          id: createNodeId('aggregator'),
          name: 'Data Aggregator',
          relPos: { x: -10, z: 0 },
          type: 'service',
        },
        {
          id: createNodeId('visualizer'),
          name: 'Visualizer',
          relPos: { x: 10, z: 0 },
          type: 'service',
        },
        {
          id: createNodeId('alerting'),
          name: 'Alert Engine',
          relPos: { x: 0, z: 10 },
          type: 'monitor',
        },
      ],
      metadata: {
        description: 'Analytics and monitoring platform',
        status: 'active',
        tags: ['analytics', 'monitoring'],
      },
    },
    {
      id: createDistrictId('security-ops'),
      name: 'Security Operations',
      position: { x: 37.5, z: -65 },
      color: 0xff0066,
      scale: 1.0,
      nodes: [
        {
          id: createNodeId('auth-service'),
          name: 'Auth Service',
          relPos: { x: 0, z: -10 },
          type: 'service',
        },
        {
          id: createNodeId('encryption'),
          name: 'Encryption Layer',
          relPos: { x: -10, z: 10 },
          type: 'service',
        },
        {
          id: createNodeId('audit-log'),
          name: 'Audit Logger',
          relPos: { x: 10, z: 10 },
          type: 'monitor',
        },
        {
          id: createNodeId('threat-detect'),
          name: 'Threat Detection',
          relPos: { x: 0, z: 0 },
          type: 'monitor',
        },
      ],
      metadata: {
        description: 'Security and compliance services',
        status: 'active',
        tags: ['security', 'compliance'],
      },
    },
  ],
  connections: [
    // Central Core connections
    { from: createNodeId('event-bus'), to: createNodeId('lead-capture') },
    { from: createNodeId('event-bus'), to: createNodeId('validation') },
    { from: createNodeId('event-bus'), to: createNodeId('etl-pipeline') },
    { from: createNodeId('event-bus'), to: createNodeId('orchestrator') },
    
    // Customer Journey flow
    { from: createNodeId('lead-capture'), to: createNodeId('validation') },
    { from: createNodeId('validation'), to: createNodeId('scoring') },
    { from: createNodeId('scoring'), to: createNodeId('routing') },
    
    // Data Processing flow
    { from: createNodeId('etl-pipeline'), to: createNodeId('transform-1') },
    { from: createNodeId('etl-pipeline'), to: createNodeId('transform-2') },
    { from: createNodeId('transform-1'), to: createNodeId('data-lake') },
    { from: createNodeId('transform-2'), to: createNodeId('data-lake') },
    
    // AI Intelligence flow
    { from: createNodeId('orchestrator'), to: createNodeId('ml-model-1') },
    { from: createNodeId('orchestrator'), to: createNodeId('ml-model-2') },
    { from: createNodeId('ml-model-1'), to: createNodeId('decision-engine') },
    { from: createNodeId('ml-model-2'), to: createNodeId('decision-engine') },
    
    // Integration Hub
    { from: createNodeId('api-gateway'), to: createNodeId('webhook-handler') },
    { from: createNodeId('api-gateway'), to: createNodeId('event-publisher') },
    
    // Analytics Platform
    { from: createNodeId('metrics-collector'), to: createNodeId('aggregator') },
    { from: createNodeId('aggregator'), to: createNodeId('visualizer') },
    { from: createNodeId('aggregator'), to: createNodeId('alerting') },
    
    // Security Operations
    { from: createNodeId('auth-service'), to: createNodeId('encryption') },
    { from: createNodeId('auth-service'), to: createNodeId('audit-log') },
    { from: createNodeId('threat-detect'), to: createNodeId('audit-log') },
  ],
  metadata: {
    name: 'CompanyCity Demo Infrastructure',
    description: 'Demonstration of a complete enterprise infrastructure',
    version: '1.0.0',
    lastUpdated: new Date(),
  },
};

export const THEMES: Record<string, ThemeConfig> = {
  dark: {
    ...DEFAULT_THEME_CONFIG,
    primaryColor: '#8b5cf6',
    backgroundColor: '#050510',
    accentColor: '#00ff88',
    textColor: '#ffffff',
  },
  light: {
    ...DEFAULT_THEME_CONFIG,
    primaryColor: '#7c3aed',
    backgroundColor: '#f8fafc',
    accentColor: '#059669',
    textColor: '#1f2937',
  },
  cyberpunk: {
    ...DEFAULT_THEME_CONFIG,
    primaryColor: '#ff00ff',
    backgroundColor: '#0a0a0a',
    accentColor: '#00ffff',
    textColor: '#ffffff',
  },
};

export const PERFORMANCE_PRESETS: Record<string, PerformanceConfig> = {
  low: {
    targetFPS: 30,
    maxParticles: 100,
    shadowQuality: 'low',
    lodDistances: [30, 60, 120],
    postProcessing: false,
    adaptiveQuality: false,
  },
  medium: {
    targetFPS: 60,
    maxParticles: 500,
    shadowQuality: 'medium',
    lodDistances: [40, 80, 160],
    postProcessing: true,
    adaptiveQuality: true,
  },
  high: {
    targetFPS: 60,
    maxParticles: 1000,
    shadowQuality: 'high',
    lodDistances: [50, 100, 200],
    postProcessing: true,
    adaptiveQuality: false,
  },
  adaptive: {
    ...DEFAULT_PERFORMANCE_CONFIG,
    adaptiveQuality: true,
  },
};

// Node type configurations
export const NODE_TYPE_CONFIGS = {
  service: { color: 0x8b5cf6, shape: 'cylinder' },
  database: { color: 0x059669, shape: 'cylinder' },
  api: { color: 0xdc2626, shape: 'box' },
  queue: { color: 0xf59e0b, shape: 'box' },
  cache: { color: 0x0ea5e9, shape: 'sphere' },
  monitor: { color: 0x7c3aed, shape: 'octahedron' },
} as const;

// District color palette for auto-assignment
export const DISTRICT_COLORS = [
  0x8b5cf6, // Purple
  0x00ff88, // Green
  0x00aaff, // Blue
  0xff00aa, // Magenta
  0xff6b00, // Orange
  0xffff00, // Yellow
  0xff0066, // Red
  0x00ffff, // Cyan
  0xff8800, // Dark Orange
  0x88ff00, // Lime
  0x8800ff, // Violet
  0xff0088, // Pink
];

// Animation constants
export const ANIMATION_CONFIG = {
  cameraTransitionSpeed: 0.1,
  viewTransitionDuration: 1000,
  particleSpeed: 0.3,
  pulseSpeed: 1.5,
  rotationSpeed: 0.01,
  hoverAnimationSpeed: 0.2,
} as const;

// UI Constants
export const UI_CONFIG = {
  hudUpdateInterval: 100,
  tooltipDelay: 500,
  inspectorAnimationDuration: 300,
  breadcrumbMaxItems: 5,
  labelsMinDistance: 80,
} as const;

export function getDefaultConfig(): CityConfig {
  return {
    container: '#companycity',
    data: DEFAULT_CITY_DATA,
    theme: THEMES.dark,
    performance: PERFORMANCE_PRESETS.adaptive,
    enableRealtimeData: false,
    plugins: [],
  };
}

export function mergeConfig(userConfig: Partial<CityConfig>): CityConfig {
  const defaultConfig = getDefaultConfig();
  
  return {
    ...defaultConfig,
    ...userConfig,
    data: userConfig.data ?? defaultConfig.data,
    theme: typeof userConfig.theme === 'string' 
      ? THEMES[userConfig.theme] ?? THEMES.dark
      : { ...THEMES.dark, ...userConfig.theme },
    performance: typeof userConfig.performance === 'string'
      ? PERFORMANCE_PRESETS[userConfig.performance] ?? PERFORMANCE_PRESETS.adaptive
      : { ...PERFORMANCE_PRESETS.adaptive, ...userConfig.performance },
  };
}
