'use client';

import { useParams, usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type AnchorHTMLAttributes,
  type ReactNode,
} from 'react';

const PortalNavContext = createContext<{ path: string; navigate: (href: string) => void } | null>(null);

export function usePortalPath() {
  const pathname = usePathname();
  return useContext(PortalNavContext)?.path ?? pathname;
}

export function usePortalNavigate() {
  const ctx = useContext(PortalNavContext);
  return ctx?.navigate ?? ((href: string) => {
    window.history.pushState({ portal: true }, '', href);
  });
}

export function usePortalId() {
  const path = usePortalPath();
  const params = useParams<{ id?: string }>();
  const parts = path.split('/').filter(Boolean);
  if (parts[0] === 'user-management' && parts[1] === 'roles' && parts[3] === 'permissions') {
    return parts[2] ?? params.id ?? '';
  }
  return parts.at(-1) ?? params.id ?? '';
}

export function PortalNavProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [path, setPath] = useState(pathname);

  const navigate = useCallback((href: string) => {
    const url = new URL(href, window.location.origin);
    const nextPath = url.pathname;
    const next = `${url.pathname}${url.search}`;
    if (next === `${window.location.pathname}${window.location.search}`) {
      setPath(nextPath);
      return;
    }
    window.history.pushState({ portal: true }, '', next);
    setPath(nextPath);
  }, []);

  useEffect(() => {
    function onPop() {
      setPath(window.location.pathname);
    }
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      const anchor = (event.target as HTMLElement | null)?.closest('a');
      if (!anchor || anchor.target === '_blank' || anchor.hasAttribute('download')) {
        return;
      }
      const href = anchor.getAttribute('href');
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        return;
      }
      const url = new URL(href, window.location.origin);
      if (url.origin !== window.location.origin) {
        return;
      }
      if (url.pathname.startsWith('/login') || url.pathname.startsWith('/register') || url.pathname.startsWith('/api')) {
        return;
      }
      event.preventDefault();
      event.stopPropagation();
      navigate(`${url.pathname}${url.search}`);
    }
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [navigate]);

  return <PortalNavContext.Provider value={{ path, navigate }}>{children}</PortalNavContext.Provider>;
}

export function PortalLink({
  href,
  children,
  onClick,
  ...props
}: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const navigate = usePortalNavigate();
  return (
    <a
      href={href}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        if (
          event.defaultPrevented ||
          event.metaKey ||
          event.ctrlKey ||
          event.shiftKey ||
          event.altKey ||
          event.button !== 0
        ) {
          return;
        }
        event.preventDefault();
        navigate?.(href);
      }}
    >
      {children}
    </a>
  );
}
