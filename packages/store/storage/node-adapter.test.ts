// @vitest-environment node
//
import { createStorageAdapterTests } from './adapters.test-utils';
import { createNodeFsAdapter } from './node-adapter';

const nodeFsAdapter = createNodeFsAdapter();
createStorageAdapterTests('NodeFS', nodeFsAdapter);
