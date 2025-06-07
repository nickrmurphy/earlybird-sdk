import type { HLC } from "../hlc/types";

export type Entity = {
  id: string;
};

export type Data = Entity & {
  [key: string]: JSONValue;
};

export type JSONValue =
  | string
  | number
  | boolean
  | null
  | JSONValue[]
  | { [key: string]: JSONValue };

export type Field<T extends JSONValue> = {
  _hlc: HLC;
  _value: T;
};

export type Document<T extends Data> = {
  id: string;
  _fields: { [K in keyof T]: Field<T[K]> };
  _hash: string;
};
