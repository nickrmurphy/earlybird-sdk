/*
 * Original code copyright (c) 2014, Hugh Kennedy
 * Licensed under BSD-3-Clause
 *
 * Modified by Nicholas Murphy for earlybird-sdk
 */

export interface FlattenOptions {
	delimiter?: string;
	maxDepth?: number;
	safe?: boolean;
	transformKey?: (key: string) => string;
}

export interface UnflattenOptions {
	delimiter?: string;
	object?: boolean;
	overwrite?: boolean;
	transformKey?: (key: string) => string;
}

function isBuffer(obj: any): obj is Buffer {
	return (
		obj?.constructor &&
		typeof obj.constructor.isBuffer === 'function' &&
		obj.constructor.isBuffer(obj)
	);
}

function keyIdentity(key: string): string {
	return key;
}

export function flatten<T = any, R = Record<string, any>>(target: T, opts?: FlattenOptions): R {
	const options = opts || {};

	const delimiter = options.delimiter || '.';
	const maxDepth = options.maxDepth;
	const transformKey = options.transformKey || keyIdentity;
	const output: Record<string, any> = {};

	function step(object: any, prev?: string, currentDepth?: number): void {
		currentDepth = currentDepth || 1;
		Object.keys(object).forEach((key) => {
			const value = object[key];
			const isarray = options.safe && Array.isArray(value);
			const type = Object.prototype.toString.call(value);
			const isbuffer = isBuffer(value);
			const isobject = type === '[object Object]' || type === '[object Array]';

			const newKey = prev
				? prev + delimiter + transformKey(key)
				: transformKey(key);

			if (
				!isarray &&
				!isbuffer &&
				isobject &&
				Object.keys(value).length &&
				(!maxDepth || currentDepth < maxDepth)
			) {
				return step(value, newKey, currentDepth + 1);
			}

			output[newKey] = value;
		});
	}

	step(target);

	return output as R;
}

export function unflatten<T = any, R = any>(target: T, opts?: UnflattenOptions): R {
	const options = opts || {};

	const delimiter = options.delimiter || '.';
	const overwrite = options.overwrite || false;
	const transformKey = options.transformKey || keyIdentity;
	const result: any = {};

	const isbuffer = isBuffer(target);
	if (
		isbuffer ||
		Object.prototype.toString.call(target) !== '[object Object]'
	) {
		return target as unknown as R;
	}

	// safely ensure that the key is
	// an integer.
	function getkey(key: string): string | number {
		const parsedKey = Number(key);

		return Number.isNaN(parsedKey) || key.indexOf('.') !== -1 || options.object
			? key
			: parsedKey;
	}

	function addKeys(keyPrefix: string, recipient: Record<string, any>, target: Record<string, any>): Record<string, any> {
		return Object.keys(target).reduce((result, key) => {
			result[keyPrefix + delimiter + key] = target[key];

			return result;
		}, recipient);
	}

	function isEmpty(val: any): boolean {
		const type = Object.prototype.toString.call(val);
		const isArray = type === '[object Array]';
		const isObject = type === '[object Object]';

		if (!val) {
			return true;
		}
		if (isArray) {
			return !val.length;
		}
		if (isObject) {
			return !Object.keys(val).length;
		}
		return false;
	}

	const processedTarget = Object.keys(target as Record<string, any>).reduce((result, key) => {
		const value = (target as Record<string, any>)[key];
		const type = Object.prototype.toString.call(value);
		const isObject = type === '[object Object]' || type === '[object Array]';
		if (!isObject || isEmpty(value)) {
			result[key] = value;
			return result;
		}
		return addKeys(key, result, flatten(value, options));
	}, {} as Record<string, any>);

	Object.keys(processedTarget).forEach((key) => {
		const split = key.split(delimiter).map(transformKey);
		let key1: string | number = getkey(split.shift()!);
		let key2: string | number | undefined = split[0] ? getkey(split[0]) : undefined;
		let recipient: any = result;

		while (key2 !== undefined) {
			if (key1 === '__proto__') {
				return;
			}

			const type = Object.prototype.toString.call(recipient[key1]);
			const isobject = type === '[object Object]' || type === '[object Array]';

			// do not write over falsey, non-undefined values if overwrite is false
			if (!overwrite && !isobject && typeof recipient[key1] !== 'undefined') {
				return;
			}

			if ((overwrite && !isobject) || (!overwrite && recipient[key1] == null)) {
				recipient[key1] = typeof key2 === 'number' && !options.object ? [] : {};
			}

			recipient = recipient[key1];
			if (split.length > 0) {
				key1 = getkey(split.shift()!);
				key2 = split[0] ? getkey(split[0]) : undefined;
			}
		}

		// unflatten again for 'messy objects'
		recipient[key1] = unflatten(processedTarget[key], options);
	});

	return result as R;
}