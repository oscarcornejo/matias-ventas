import { useCallback, useEffect, useState } from 'react';

type AsyncState<T> =
  | { status: 'loading'; data?: undefined; error?: undefined }
  | { status: 'success'; data: T; error?: undefined }
  | { status: 'error'; data?: undefined; error: string };

/** Ejecuta una carga asíncrona al montar y permite reintentarla. */
export function useAsync<T>(load: () => Promise<T>, deps: readonly unknown[]) {
  const [state, setState] = useState<AsyncState<T>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: 'loading' });
    load()
      .then((data) => active && setState({ status: 'success', data }))
      .catch((error: unknown) =>
        active && setState({ status: 'error', error: error instanceof Error ? error.message : 'Error inesperado.' }),
      );
    return () => {
      active = false;
    };
  }, [...deps, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  return { ...state, retry };
}
