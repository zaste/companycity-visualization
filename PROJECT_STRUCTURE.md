# 📁 Project Structure

This document outlines the complete file structure for the CompanyCity Visualization project.

```
companycity-visualization/
│
├── 📁 src/                          # Source code
│   ├── 📁 core/                     # Core engine components
│   │   ├── Scene.ts                 # Three.js scene management
│   │   ├── Camera.ts                # Camera controller with smooth movements
│   │   ├── Renderer.ts              # WebGL renderer with optimizations
│   │   └── index.ts                 # Core barrel exports
│   │
│   ├── 📁 components/               # 3D visual components
│   │   ├── District.ts              # Hexagonal district with buildings
│   │   ├── Building.ts              # Individual building geometry
│   │   ├── ParticleSystem.ts        # Data flow particle effects
│   │   ├── Grid.ts                  # Hexagonal grid foundation
│   │   └── index.ts                 # Components barrel exports
│   │
│   ├── 📁 systems/                  # Game-like systems architecture
│   │   ├── StateManager.ts          # Global state management
│   │   ├── AnimationLoop.ts         # Main render loop
│   │   ├── EventManager.ts          # Event system (pub/sub)
│   │   ├── InputManager.ts          # Mouse, keyboard, touch input
│   │   ├── LODManager.ts            # Level-of-detail system
│   │   └── index.ts                 # Systems barrel exports
│   │
│   ├── 📁 ui/                       # Web Components UI layer
│   │   ├── HUD.ts                   # Real-time metrics display
│   │   ├── Inspector.ts             # Detail panel for selections
│   │   ├── Navigation.ts            # Breadcrumb navigation
│   │   ├── Controls.ts              # View mode controls
│   │   ├── base/                    # Base UI components
│   │   │   ├── BaseComponent.ts     # Web Component base class
│   │   │   ├── Modal.ts             # Modal dialog base
│   │   │   └── Tooltip.ts           # Smart tooltip system
│   │   └── index.ts                 # UI barrel exports
│   │
│   ├── 📁 data/                     # Data models and validation
│   │   ├── schemas/                 # JSON schema definitions
│   │   │   ├── city.schema.json     # City data structure
│   │   │   ├── district.schema.json # District configuration
│   │   │   └── node.schema.json     # Node definition
│   │   ├── models/                  # TypeScript data models
│   │   │   ├── CityData.ts          # City data interface
│   │   │   ├── DistrictData.ts      # District data interface
│   │   │   └── NodeData.ts          # Node data interface
│   │   ├── validators/              # Data validation utilities
│   │   │   ├── CityValidator.ts     # Validate city data
│   │   │   └── SchemaValidator.ts   # JSON schema validator
│   │   ├── adapters/                # Data source adapters
│   │   │   ├── RestAdapter.ts       # REST API data source
│   │   │   ├── WebSocketAdapter.ts  # Real-time data source
│   │   │   └── StaticAdapter.ts     # Static JSON data
│   │   └── index.ts                 # Data barrel exports
│   │
│   ├── 📁 utils/                    # Utilities and helpers
│   │   ├── GeometryFactory.ts       # Reusable geometry creation
│   │   ├── MaterialFactory.ts       # Material management
│   │   ├── MathUtils.ts             # Vector math helpers
│   │   ├── ColorUtils.ts            # Color manipulation
│   │   ├── ObjectPool.ts            # Object pooling for performance
│   │   ├── MemoryManager.ts         # Memory management utilities
│   │   ├── PerformanceMonitor.ts    # FPS and performance tracking
│   │   └── index.ts                 # Utils barrel exports
│   │
│   ├── 📁 plugins/                  # Plugin system
│   │   ├── PluginManager.ts         # Plugin lifecycle management
│   │   ├── BasePlugin.ts            # Plugin base class
│   │   ├── examples/                # Example plugins
│   │   │   ├── MetricsPlugin.ts     # Real-time metrics overlay
│   │   │   ├── ExportPlugin.ts      # Screenshot/data export
│   │   │   └── ThemePlugin.ts       # Custom theming
│   │   └── index.ts                 # Plugins barrel exports
│   │
│   ├── 📁 types/                    # TypeScript type definitions
│   │   ├── three.d.ts               # Three.js extensions
│   │   ├── global.d.ts              # Global type augmentations
│   │   ├── config.ts                # Configuration interfaces
│   │   ├── events.ts                # Event type definitions
│   │   └── index.ts                 # Types barrel exports
│   │
│   ├── 📁 styles/                   # CSS and styling
│   │   ├── main.css                 # Main stylesheet
│   │   ├── components.css           # UI component styles
│   │   ├── themes/                  # Theme definitions
│   │   │   ├── dark.css             # Dark theme
│   │   │   ├── light.css            # Light theme
│   │   │   └── cyberpunk.css        # Cyberpunk theme
│   │   └── animations.css           # Animation keyframes
│   │
│   ├── CompanyCity.ts               # Main application class
│   ├── index.ts                     # Library entry point
│   └── config.ts                    # Default configuration
│
├── 📁 demo/                         # Live demo application
│   ├── index.html                   # Demo HTML page
│   ├── main.ts                      # Demo initialization
│   ├── data/                        # Demo data files
│   │   ├── sample-city.json         # Sample city configuration
│   │   └── mock-metrics.json        # Mock real-time data  
│   ├── assets/                      # Demo assets
│   │   ├── logo.svg                 # CompanyCity logo
│   │   ├── demo.gif                 # Animated demo
│   │   └── screenshots/             # Feature screenshots
│   └── styles/                      # Demo-specific styles
│       └── demo.css                 # Demo page styling
│
├── 📁 tests/                        # Test suites
│   ├── 📁 unit/                     # Unit tests
│   │   ├── components/              # Component tests
│   │   │   ├── District.test.ts     # District unit tests
│   │   │   ├── Building.test.ts     # Building unit tests
│   │   │   └── ParticleSystem.test.ts # Particle system tests
│   │   ├── systems/                 # System tests
│   │   │   ├── StateManager.test.ts # State management tests
│   │   │   └── EventManager.test.ts # Event system tests
│   │   └── utils/                   # Utility tests
│   │       ├── GeometryFactory.test.ts # Geometry creation tests
│   │       └── ObjectPool.test.ts   # Object pooling tests
│   │
│   ├── 📁 integration/              # Integration tests
│   │   ├── CityInteraction.test.ts  # Full city interaction tests
│   │   ├── DataLoading.test.ts      # Data loading and validation
│   │   └── PerformanceTests.test.ts # Performance benchmarks
│   │
│   ├── 📁 e2e/                      # End-to-end tests (Playwright)
│   │   ├── basic-interaction.spec.ts # Basic user interactions
│   │   ├── view-transitions.spec.ts # View mode transitions
│   │   ├── accessibility.spec.ts    # Accessibility compliance
│   │   └── performance.spec.ts      # Performance measurements
│   │
│   ├── 📁 fixtures/                 # Test data and fixtures
│   │   ├── mock-city-data.ts        # Mock city configurations
│   │   ├── mock-scene.ts            # Mock Three.js scene
│   │   └── test-utils.ts            # Testing utilities
│   │
│   ├── setup.ts                     # Test environment setup
│   └── teardown.ts                  # Test cleanup
│
├── 📁 docs/                         # Documentation
│   ├── 📁 api/                      # API documentation (generated)
│   ├── 📁 guides/                   # User guides
│   │   ├── getting-started.md       # Getting started guide
│   │   ├── advanced-usage.md        # Advanced features
│   │   ├── performance-tuning.md    # Performance optimization
│   │   └── plugin-development.md    # Plugin development guide
│   ├── 📁 examples/                 # Code examples
│   │   ├── basic-setup.ts           # Basic setup example
│   │   ├── real-time-data.ts        # Real-time data integration
│   │   ├── custom-theme.ts          # Custom theming example
│   │   └── plugin-example.ts        # Plugin development example
│   └── assets/                      # Documentation assets
│       ├── architecture-diagram.svg # Architecture overview
│       └── component-diagram.svg    # Component relationships
│
├── 📁 scripts/                      # Build and utility scripts
│   ├── build.js                     # Custom build script
│   ├── benchmark.js                 # Performance benchmarks
│   ├── generate-types.js            # Type generation script
│   └── release.js                   # Release automation
│
├── 📁 .github/                      # GitHub configuration
│   ├── workflows/                   # GitHub Actions
│   │   ├── ci.yml                   # CI/CD pipeline
│   │   ├── release.yml              # Release automation
│   │   └── docs.yml                 # Documentation deployment
│   ├── ISSUE_TEMPLATE/              # Issue templates
│   │   ├── bug_report.md            # Bug report template
│   │   ├── feature_request.md       # Feature request template
│   │   └── question.md              # Question template
│   └── pull_request_template.md     # PR template
│
├── 📁 dist/                         # Built distribution files (generated)
│   ├── index.js                     # UMD build
│   ├── index.esm.js                 # ES module build
│   ├── index.d.ts                   # TypeScript declarations
│   ├── styles.css                   # Bundled styles
│   └── assets/                      # Static assets
│
├── 📁 coverage/                     # Test coverage reports (generated)
│   ├── lcov.info                    # LCOV coverage data
│   ├── coverage-summary.json        # Coverage summary
│   └── html/                        # HTML coverage report
│
├── 📁 node_modules/                 # Dependencies (generated)
├── 📁 .vscode/                      # VS Code configuration
│   ├── settings.json                # Editor settings
│   ├── extensions.json              # Recommended extensions
│   └── launch.json                  # Debug configuration
│
├── 📄 package.json                  # Project configuration
├── 📄 package-lock.json             # Dependency lock file
├── 📄 tsconfig.json                 # TypeScript configuration
├── 📄 vite.config.ts                # Vite build configuration
├── 📄 vitest.config.ts              # Vitest test configuration
├── 📄 prettier.config.json          # Prettier formatting config
├── 📄 eslint.config.js              # ESLint configuration
├── 📄 README.md                     # Project documentation
├── 📄 CONTRIBUTING.md               # Contribution guidelines
├── 📄 CHANGELOG.md                  # Version history
├── 📄 LICENSE                       # MIT license
├── 📄 .gitignore                    # Git ignore rules
└── 📄 .npmignore                    # NPM publish ignore rules
```

## 🏗️ Architecture Overview

### Core Architecture Principles

1. **Modular Design**: Each module has a single responsibility
2. **Barrel Exports**: Clean import paths using index.ts files
3. **Type Safety**: Strict TypeScript with no `any` types
4. **Performance First**: Optimizations built-in from the start
5. **Plugin System**: Extensible architecture for custom features

### Data Flow

```
User Input → InputManager → EventManager → StateManager → Components → Renderer
     ↑                                                          ↓
UI Components ←── Systems ←── AnimationLoop ←── Three.js Scene
```

### Module Responsibilities

| Module | Responsibility | Key Files |
|--------|----------------|-----------|
| **core** | Scene management, rendering | Scene.ts, Camera.ts, Renderer.ts |
| **components** | 3D visual elements | District.ts, Building.ts, ParticleSystem.ts |
| **systems** | Application logic | StateManager.ts, AnimationLoop.ts |
| **ui** | User interface | HUD.ts, Inspector.ts, Navigation.ts |
| **data** | Data models, validation | models/, validators/, adapters/ |
| **utils** | Shared utilities | GeometryFactory.ts, ObjectPool.ts |
| **plugins** | Extensibility system | PluginManager.ts, BasePlugin.ts |

### Build Output Structure

```
dist/
├── index.js              # UMD bundle (for <script> tags)
├── index.esm.js          # ES modules (for import statements)
├── index.d.ts            # TypeScript definitions
├── styles.css            # Compiled CSS
└── assets/
    ├── textures/         # Optimized textures
    └── fonts/            # Web fonts
```

This structure ensures:
- 📦 **Clean separation** of concerns
- 🔄 **Easy testing** with clear module boundaries  
- 🚀 **Optimal bundling** for different use cases
- 📚 **Clear documentation** path for new contributors
- ⚡ **Fast development** with hot module replacement

The structure follows modern JavaScript/TypeScript best practices and can scale from small demos to enterprise applications.
