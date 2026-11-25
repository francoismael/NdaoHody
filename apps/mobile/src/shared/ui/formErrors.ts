import { createContext, useContext, useEffect, useRef, type RefObject } from 'react';
import type { ViewInstance } from 'react-native';

/** A field that shows an error, as FormScreen sees it. */
export type ErrorTarget = RefObject<ViewInstance | null>;

export type FormErrorRegistry = {
  /** Adds a field in error; returns how to remove it. */
  register: (target: ErrorTarget) => () => void;
};

export const FormErrorContext = createContext<FormErrorRegistry | null>(null);

/**
 * Put the returned ref on the field's outer View. While `hasError` is true, the
 * field is known to its FormScreen, which can scroll to it (`revealFirstError`).
 * Outside a FormScreen it does nothing.
 */
export function useFormErrorTarget(hasError: boolean): ErrorTarget {
  const registry = useContext(FormErrorContext);
  const target = useRef<ViewInstance>(null);

  useEffect(() => {
    if (!hasError || !registry) return undefined;
    return registry.register(target);
  }, [hasError, registry]);

  return target;
}
