import { createStorageAdapterTests } from './adapters.test-utils';
import { createMemoryAdapter } from './memory-adapter';

const memoryAdapter = createMemoryAdapter();
createStorageAdapterTests('Memory', memoryAdapter);
