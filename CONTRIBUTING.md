# 🤝 Contributing to CompanyCity Visualization

We're thrilled you're interested in contributing to CompanyCity! This guide will help you get started and ensure a smooth contribution process.

## 🚀 Quick Start

1. **Fork the repository**
2. **Clone your fork**: `git clone https://github.com/YOUR_USERNAME/companycity-visualization.git`
3. **Install dependencies**: `npm install`
4. **Start development**: `npm run dev`
5. **Make your changes**
6. **Test everything**: `npm run test:all`
7. **Submit a pull request**

## 📋 Development Workflow

### Setting Up Your Environment

```bash
# Clone the repository
git clone https://github.com/zaste/companycity-visualization.git
cd companycity-visualization

# Install dependencies
npm install

# Start development server
npm run dev

# Run tests in watch mode
npm run test
```

### Before You Start

- **Check existing issues** and pull requests to avoid duplication
- **Create an issue** for new features or substantial changes
- **Follow the coding standards** outlined below
- **Write tests** for new functionality

## 🎯 Types of Contributions

### 🐛 Bug Reports

When reporting bugs, please include:

- **Clear description** of the issue
- **Steps to reproduce** the problem
- **Expected vs actual behavior**
- **Screenshots or videos** if applicable
- **Browser/OS information**
- **Console errors** if any

**Use our bug report template:**

```markdown
## Bug Description
[Clear, concise description]

## Steps to Reproduce
1. Go to...
2. Click on...
3. See error...

## Expected Behavior
[What should happen]

## Actual Behavior
[What actually happens]

## Environment
- Browser: [Chrome 119.0]
- OS: [macOS 14.1]
- CompanyCity Version: [1.0.0]

## Additional Context
[Any other relevant information]
```

### ✨ Feature Requests

For new features:

- **Describe the problem** you're trying to solve
- **Propose a solution** with implementation details
- **Consider the impact** on existing functionality
- **Include mockups** or diagrams if helpful

### 🔧 Code Contributions

#### Coding Standards

We use strict TypeScript and automated formatting:

```typescript
// ✅ Good - Clear naming and types
interface DistrictConfig {
  id: string;
  name: string;
  position: Vector3;
  color: number;
  nodes: NodeData[];
}

class District {
  private readonly config: DistrictConfig;
  
  constructor(scene: THREE.Scene, config: DistrictConfig) {
    this.config = config;
    this.initialize();
  }
  
  private initialize(): void {
    // Implementation...
  }
}

// ❌ Bad - Unclear naming and any types
class D {
  constructor(s: any, c: any) {
    this.s = s;
    this.c = c;
  }
}
```

#### Architecture Guidelines

**1. Modular Design**
```typescript
// Each component should be self-contained
export class ParticleSystem {
  constructor(
    private scene: THREE.Scene,
    private config: ParticleConfig
  ) {}
  
  public update(deltaTime: number): void {
    // Update logic here
  }
  
  public destroy(): void {
    // Cleanup logic here
  }
}
```

**2. Performance First**
```typescript
// Use object pooling for frequently created objects
class ObjectPool<T> {
  private available: T[] = [];
  private active: T[] = [];
  
  acquire(): T {
    return this.available.pop() ?? this.createNew();
  }
  
  release(obj: T): void {
    this.active.splice(this.active.indexOf(obj), 1);
    this.reset(obj);
    this.available.push(obj);
  }
}
```

**3. Type Safety**
```typescript
// Strict typing with no any
interface CameraState {
  distance: number;
  angle: number;
  elevation: number;
  target: Vector3;
}

// Use branded types for better type safety
type DistrictId = string & { readonly brand: unique symbol };
type NodeId = string & { readonly brand: unique symbol };
```

#### Testing Requirements

**Unit Tests** (Required for all new code):
```typescript
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { District } from '@/components/District';

describe('District', () => {
  let scene: THREE.Scene;
  let district: District;
  
  beforeEach(() => {
    scene = new THREE.Scene();
    district = new District(scene, mockDistrictConfig());
  });
  
  afterEach(() => {
    district.destroy();
  });
  
  it('should create hexagonal platform', () => {
    expect(district.platform).toBeDefined();
    expect(district.platform.geometry.type).toBe('ExtrudeGeometry');
  });
  
  it('should position buildings correctly', () => {
    const buildings = district.buildings;
    expect(buildings).toHaveLength(3);
    // Add specific position assertions...
  });
});
```

**Integration Tests**:
```typescript
describe('City Integration', () => {
  it('should transition between view modes smoothly', async () => {
    const city = new CompanyCity(mockConfig());
    
    city.camera.setDistance(200);
    await city.waitForTransition();
    expect(city.state.viewMode).toBe('city');
    
    city.camera.setDistance(80);
    await city.waitForTransition();
    expect(city.state.viewMode).toBe('network');
  });
});
```

#### Performance Guidelines

**1. Bundle Size**
- Keep additions under 10KB gzipped
- Use dynamic imports for large features
- Avoid external dependencies when possible

**2. Runtime Performance**
- Target 60fps on mid-range devices
- Use `performance.mark()` for measuring
- Implement proper cleanup in `destroy()` methods

**3. Memory Management**
```typescript
class MemoryAwareComponent {
  private disposables: Disposable[] = [];
  
  constructor() {
    const geometry = new THREE.BoxGeometry(1, 1, 1);
    this.disposables.push(geometry);
  }
  
  destroy(): void {
    this.disposables.forEach(d => d.dispose());
    this.disposables.length = 0;
  }
}
```

## 🔄 Pull Request Process

### Before Submitting

- [ ] **All tests pass**: `npm run test`
- [ ] **Code is formatted**: `npm run format`
- [ ] **No linting errors**: `npm run lint`
- [ ] **TypeScript compiles**: `npm run typecheck`
- [ ] **Build succeeds**: `npm run build`
- [ ] **Documentation updated** if needed

### PR Description Template

```markdown
## Description
[Brief description of changes]

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that causes existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Performance Impact
- [ ] No performance impact
- [ ] Performance improved
- [ ] Performance impact documented and justified

## Screenshots/Videos
[If applicable, add screenshots or videos]

## Checklist
- [ ] Code follows the project's coding standards
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added/updated and passing
```

### Review Process

1. **Automated checks** must pass (CI/CD)
2. **Code review** by at least one maintainer
3. **Manual testing** for UI/UX changes
4. **Performance validation** for optimization PRs

## 🎨 Design Guidelines

### Visual Consistency

- **Colors**: Use the established color palette
- **Typography**: Consistent font sizes and weights
- **Spacing**: Follow the 8px grid system
- **Animations**: Smooth, purposeful, 60fps

### Accessibility

- **WCAG AA compliance** required
- **Keyboard navigation** support
- **Screen reader** compatibility
- **Color contrast** ratios met

## 📖 Documentation

### Code Documentation

```typescript
/**
 * Creates and manages a 3D district visualization
 * 
 * @example
 * ```typescript
 * const district = new District(scene, {
 *   id: 'ai-services',
 *   name: 'AI Services',
 *   position: { x: 0, z: 0 },
 *   color: 0x8b5cf6,
 *   nodes: [...]
 * });
 * ```
 */
class District {
  /**
   * Updates district animations
   * @param deltaTime - Time since last frame in seconds
   * @param elapsedTime - Total elapsed time in seconds
   */
  update(deltaTime: number, elapsedTime: number): void {
    // Implementation...
  }
}
```

### README Updates

When adding new features, update:
- **Feature list** in README
- **API documentation** section
- **Examples** with new functionality

## 🏆 Recognition

Contributors are recognized in:
- **README contributors section**
- **GitHub contributors page**
- **Release notes** for significant contributions
- **Discord community** (link pending)

## 📞 Getting Help

- **GitHub Issues**: For bugs and feature requests
- **GitHub Discussions**: For general questions
- **Discord**: For real-time chat (link pending)
- **Email**: For private matters

## 📚 Resources

- [Three.js Documentation](https://threejs.org/docs/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Guide](https://vitejs.dev/guide/)
- [Vitest Documentation](https://vitest.dev/)

---

**Thank you for contributing to CompanyCity! 🎉**

Every contribution, no matter how small, helps make this project better for everyone.
