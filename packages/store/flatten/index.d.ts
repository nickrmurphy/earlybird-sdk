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

export function flatten<T, R>(target: T, options?: FlattenOptions): R;

export interface UnflattenOptions {
	delimiter?: string;
	object?: boolean;
	overwrite?: boolean;
	transformKey?: (key: string) => string;
}

export function unflatten<T, R>(target: T, options?: UnflattenOptions): R;
