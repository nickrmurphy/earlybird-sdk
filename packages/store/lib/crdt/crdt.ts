import type { Data, Document, Field, JSONValue } from "./types";
import type { HLC } from "../hlc/types";

import { computeHash } from "./crdt.utils";

export const mergeFields = <T extends JSONValue>(
  currentField: Field<T>,
  newField: Field<T>,
): Field<T> => {
  const currentIsNewer = currentField._hlc > newField._hlc;

  if (currentIsNewer) {
    return { ...currentField };
  }

  return { ...newField };
};

export const makeDocument = <T extends Data>(
  hlc: HLC,
  id: string,
  value: T,
): Document<T> => {
  const fields = {} as {
    [K in keyof T]: Field<T[K]>;
  };

  for (const key in value) {
    fields[key] = {
      _hlc: hlc,
      _value: value[key],
    };
  }

  const document: Document<T> = {
    id,
    _fields: fields,
    _hash: computeHash(JSON.stringify(fields)), // Compute hash from fields
  };

  return document;
};

export const readDocument = <T extends Data>(document: Document<T>): T => {
  const result = {} as {
    [K in keyof T]: T[K];
  };

  for (const key in document._fields) {
    result[key] = document._fields[key]._value;
  }

  return result;
};

export const mergeDocument = <T extends Data>(
  currentDocument: Document<T>,
  newDocument: Document<T>,
): Document<T> => {
  const fields = {} as {
    [K in keyof T]: Field<T[K]>;
  };

  for (const key in newDocument._fields) {
    const currentField = currentDocument._fields[key];
    const newField = newDocument._fields[key];

    if (!currentField) {
      fields[key] = newField; // If current field doesn't exist, use new field
      continue;
    }

    fields[key] = mergeFields(currentField, newField);
  }

  const document: Document<T> = {
    id: currentDocument.id,
    _fields: { ...currentDocument._fields, ...fields },
    _hash: computeHash(JSON.stringify(fields)), // Compute hash from merged fields
  };

  return document;
};
