import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

type BodyMapAreaViewLoadingContextValue = {
  setLoading: (key: string, loading: boolean) => void;
};

const BodyMapAreaViewLoadingContext =
  createContext<BodyMapAreaViewLoadingContextValue | null>(null);

type BodyMapAreaViewLoadingScopeProps = {
  className?: string;
  label?: string;
  children: ReactNode;
};

/** One loading overlay for all Area-view renderers inside this scope. */
export function BodyMapAreaViewLoadingScope({
  className,
  label = "Rendering area view…",
  children,
}: BodyMapAreaViewLoadingScopeProps) {
  const loadingKeysRef = useRef(new Set<string>());
  const [visible, setVisible] = useState(false);

  const syncVisible = useCallback(() => {
    setVisible(loadingKeysRef.current.size > 0);
  }, []);

  const setLoading = useCallback(
    (key: string, loading: boolean) => {
      const keys = loadingKeysRef.current;
      if (loading) {
        if (keys.has(key)) return;
        keys.add(key);
      } else {
        if (!keys.delete(key)) return;
      }
      syncVisible();
    },
    [syncVisible],
  );

  const scopeClassName = className
    ? `body-map-area-view-scope ${className}`
    : "body-map-area-view-scope";

  return (
    <BodyMapAreaViewLoadingContext.Provider value={{ setLoading }}>
      <div className={scopeClassName}>
        {children}
        {visible ? (
          <div
            className="body-map-area-view-loading"
            role="status"
            aria-live="polite"
            aria-busy="true"
          >
            <span className="body-map-area-view-spinner" aria-hidden />
            <span className="body-map-area-view-loading-label">{label}</span>
          </div>
        ) : null}
      </div>
    </BodyMapAreaViewLoadingContext.Provider>
  );
}

/** Register a child renderer's Area-view loading state with the nearest scope. */
export function useBodyMapAreaViewLoadingReporter(key: string, loading: boolean) {
  const ctx = useContext(BodyMapAreaViewLoadingContext);

  useEffect(() => {
    if (!ctx) return;
    ctx.setLoading(key, loading);
    return () => ctx.setLoading(key, false);
  }, [ctx, key, loading]);
}
