import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

interface BreadcrumbContextValue {
  crumb: string | null;
  setCrumb: (value: string | null) => void;
}

const BreadcrumbContext = createContext<BreadcrumbContextValue>({
  crumb: null,
  setCrumb: () => undefined,
});

export function BreadcrumbProvider({ children }: { children: ReactNode }) {
  const [crumb, setCrumb] = useState<string | null>(null);
  return (
    <BreadcrumbContext.Provider value={{ crumb, setCrumb }}>
      {children}
    </BreadcrumbContext.Provider>
  );
}

export function useBreadcrumbContext(): BreadcrumbContextValue {
  return useContext(BreadcrumbContext);
}

export function useBreadcrumb(crumb: string | null): void {
  const { setCrumb } = useContext(BreadcrumbContext);
  const stableSet = useCallback(setCrumb, [setCrumb]);
  useEffect(() => {
    stableSet(crumb);
    return () => stableSet(null);
  }, [crumb, stableSet]);
}