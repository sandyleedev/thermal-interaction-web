import { useEffect, useRef, useState, type DependencyList } from "react";

/**
 * Runs expensive Area-view work after paint so a loading overlay can appear first.
 */
export function useDeferredAreaViewResult<T>(
  enabled: boolean,
  compute: () => T,
  deps: DependencyList,
): { result: T | null; isComputing: boolean } {
  const [result, setResult] = useState<T | null>(null);
  const [isComputing, setIsComputing] = useState(false);
  const computeRef = useRef(compute);
  computeRef.current = compute;
  const generationRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      setResult(null);
      setIsComputing(false);
      return;
    }

    const generation = ++generationRef.current;
    setIsComputing(true);
    setResult(null);

    let raf1 = 0;
    let raf2 = 0;

    raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => {
        if (generationRef.current !== generation) return;
        const value = computeRef.current();
        if (generationRef.current !== generation) return;
        setResult(value);
        setIsComputing(false);
      });
    });

    return () => {
      generationRef.current += 1;
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- caller supplies full dependency list
  }, [enabled, ...deps]);

  return {
    result: enabled ? result : null,
    isComputing: enabled && isComputing,
  };
}
