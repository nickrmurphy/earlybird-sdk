/**
 * Hybrid Logical Clock Implementation
 *
 * Provides conflict-free timestamp generation using hybrid logical clocks
 * with random nonces for uniqueness instead of device tracking.
 */

/**
 * Hybrid Logical Clock structure with random nonce for uniqueness
 */
export interface HybridLogicalClock {
	/** Logical counter for ordering concurrent events */
	logical: number;
	/** Physical timestamp (milliseconds since epoch) */
	physical: number;
	/** Random string for uniqueness (replaces nodeId) */
	nonce: string;
}

/**
 * CRDT field metadata containing value and HLC timestamp
 */
export interface CRDTFieldMetadata {
	/** The actual field value */
	// biome-ignore lint/suspicious/noExplicitAny: Using any for flexibility in CRDT values
	value: any;
	/** Hybrid logical clock for conflict resolution */
	hlc: HybridLogicalClock;
}

/**
 * Complete CRDT document structure
 */
export interface CRDTDocument {
	/** Document identifier */
	id: string;
	/** Fields with CRDT metadata */
	fields: Record<string, CRDTFieldMetadata>;
	/** Document version counter */
	_version: number;
	/** Creation timestamp */
	_createdAt: number;
	/** Last update timestamp */
	_updatedAt: number;
}

/**
 * State for tracking local HLC counter
 */
class HLCState {
	private _logical = 0;
	private _lastPhysical = 0;

	/**
	 * Generate a new HLC timestamp
	 */
	now(): HybridLogicalClock {
		const physical = Date.now();

		if (physical > this._lastPhysical) {
			// Physical time advanced, reset logical counter
			this._logical = 0;
			this._lastPhysical = physical;
		} else if (physical === this._lastPhysical) {
			// Same physical time, increment logical counter
			this._logical++;
		} else {
			// Physical time went backwards (clock adjustment), keep logical counter
			this._logical++;
		}

		return {
			logical: this._logical,
			physical: this._lastPhysical,
			nonce: generateNonce(),
		};
	}

	/**
	 * Update local HLC state when receiving remote timestamp
	 */
	update(remoteHLC: HybridLogicalClock): HybridLogicalClock {
		const physical = Date.now();

		// Take maximum of local and remote logical clocks
		this._logical = Math.max(this._logical, remoteHLC.logical) + 1;

		// Take maximum of local and remote physical times
		this._lastPhysical = Math.max(physical, remoteHLC.physical);

		return {
			logical: this._logical,
			physical: this._lastPhysical,
			nonce: generateNonce(),
		};
	}
}

/**
 * Global HLC state instance
 */
const hlcState = new HLCState();

/**
 * Generate a random nonce for timestamp uniqueness
 * Uses base36 encoding for compact, URL-safe strings
 */
function generateNonce(): string {
	// Generate 6 random characters using base36
	return Math.random().toString(36).substring(2, 8);
}

/**
 * Generate a new HLC timestamp for local operations
 */
export function generateHLC(): HybridLogicalClock {
	return hlcState.now();
}

/**
 * Update local HLC state when receiving remote timestamp
 * Use this when merging documents from other devices
 */
export function updateHLC(remoteHLC: HybridLogicalClock): HybridLogicalClock {
	return hlcState.update(remoteHLC);
}

/**
 * Compare two HLC timestamps for ordering
 * Returns:
 * - positive number if a > b (a is newer)
 * - negative number if a < b (b is newer)
 * - zero if a === b (concurrent, use nonce for tie-breaking)
 */
export function compareHLC(
	a: HybridLogicalClock,
	b: HybridLogicalClock,
): number {
	// First compare physical timestamps
	if (a.physical !== b.physical) {
		return a.physical - b.physical;
	}

	// Then compare logical timestamps
	if (a.logical !== b.logical) {
		return a.logical - b.logical;
	}

	// Finally compare nonces for deterministic tie-breaking
	return a.nonce.localeCompare(b.nonce);
}

/**
 * Check if HLC timestamp a is newer than b
 */
export function isNewerHLC(
	a: HybridLogicalClock,
	b: HybridLogicalClock,
): boolean {
	return compareHLC(a, b) > 0;
}

/**
 * Check if two HLC timestamps are concurrent (same physical and logical time)
 */
export function isConcurrentHLC(
	a: HybridLogicalClock,
	b: HybridLogicalClock,
): boolean {
	return a.physical === b.physical && a.logical === b.logical;
}

/**
 * Create field metadata with current HLC timestamp
 */
export function createFieldMetadata(value: any): CRDTFieldMetadata {
	return {
		value,
		hlc: generateHLC(),
	};
}

/**
 * Merge two CRDT field metadata objects, keeping the newer one
 */
export function mergeFieldMetadata(
	local: CRDTFieldMetadata,
	remote: CRDTFieldMetadata,
): CRDTFieldMetadata {
	// Update local HLC state with remote timestamp
	updateHLC(remote.hlc);

	// Keep the field with newer timestamp
	return isNewerHLC(remote.hlc, local.hlc) ? remote : local;
}

/**
 * Merge CRDT document fields, resolving conflicts with HLC ordering
 */
export function mergeDocumentFields(
	localFields: Record<string, CRDTFieldMetadata>,
	remoteFields: Record<string, CRDTFieldMetadata>,
): Record<string, CRDTFieldMetadata> {
	const mergedFields: Record<string, CRDTFieldMetadata> = { ...localFields };

	// Merge each remote field
	for (const [fieldName, remoteField] of Object.entries(remoteFields)) {
		const localField = mergedFields[fieldName];

		if (!localField) {
			// New field from remote
			mergedFields[fieldName] = remoteField;
			updateHLC(remoteField.hlc);
		} else {
			// Merge conflicting fields
			mergedFields[fieldName] = mergeFieldMetadata(localField, remoteField);
		}
	}

	return mergedFields;
}

/**
 * Create a new CRDT document
 */
export function createCRDTDocument(
	id: string,
	fields: Record<string, any>,
): CRDTDocument {
	const now = Date.now();
	const crdtFields: Record<string, CRDTFieldMetadata> = {};

	// Convert plain fields to CRDT fields
	for (const [fieldName, value] of Object.entries(fields)) {
		crdtFields[fieldName] = createFieldMetadata(value);
	}

	return {
		id,
		fields: crdtFields,
		_version: 1,
		_createdAt: now,
		_updatedAt: now,
	};
}

/**
 * Extract plain object from CRDT document (removing metadata)
 */
export function extractPlainObject<T = any>(doc: CRDTDocument): T {
	const plainObject: any = { id: doc.id };

	// Extract values from CRDT fields
	for (const [fieldName, fieldMetadata] of Object.entries(doc.fields)) {
		plainObject[fieldName] = fieldMetadata.value;
	}

	return plainObject as T;
}

/**
 * Get fields that have been updated since a specific HLC timestamp
 * Useful for extracting sync deltas
 */
export function getFieldsSince(
	fields: Record<string, CRDTFieldMetadata>,
	sinceHLC: HybridLogicalClock,
): Record<string, CRDTFieldMetadata> {
	const result: Record<string, CRDTFieldMetadata> = {};

	for (const [fieldName, fieldMetadata] of Object.entries(fields)) {
		if (isNewerHLC(fieldMetadata.hlc, sinceHLC)) {
			result[fieldName] = fieldMetadata;
		}
	}

	return result;
}
