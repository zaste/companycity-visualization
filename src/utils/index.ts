/**
 * Utilities module exports
 */

export { GeometryFactory, geometryFactory } from './GeometryFactory';
export { MaterialFactory, materialFactory } from './MaterialFactory';
export { ObjectPool, ThreeObjectPool, PoolManager, poolManager } from './ObjectPool';

export type {
  GeometryCache,
  HexagonOptions,
  BuildingOptions,
} from './GeometryFactory';

export type {
  MaterialCache,
  MaterialOptions,
  DistrictMaterialOptions,
  BuildingMaterialOptions,
  ParticleMaterialOptions,
} from './MaterialFactory';

export type {
  Poolable,
  PoolConfig,
  PoolStats,
} from './ObjectPool';
