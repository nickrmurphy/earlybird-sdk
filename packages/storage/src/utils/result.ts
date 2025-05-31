type Result<T, E> = { success: true; value: T } | { success: false; error: E };
type Ok<T> = Result<T, never>;
type Err<E> = Result<never, E>;

const ok = <T>(value?: T): Ok<T> => ({ success: true, value: value as T });
const err = <E>(error?: E): Err<E> => ({ success: false, error: error as E });

export { err, ok, type Result };
