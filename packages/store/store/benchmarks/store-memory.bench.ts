import { createMemoryAdapter } from '../../storage/memory-adapter';
import { createStoreBenchmarks } from './store.bench-utils';

createStoreBenchmarks('Memory', createMemoryAdapter);
