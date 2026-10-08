import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { adminLogout, adminSession, currentCustomer, logoutCustomer } from "./api";
import type { Customer } from "./types";

const CUSTOMER_KEY = "bw_customer_token";
const ADMIN_KEY = "bw_admin_token";

type SessionValue = {
  ready: boolean;
  customer: Customer | null;
  admin: boolean;
  token: () => string | null;
  adminToken: () => string | null;
  signIn: (token: string, customer: Customer) => void;
  updateCustomer: (customer: Customer) => void;
  signOut: () => Promise<void>;
  adminIn: (token: string) => void;
  adminOut: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [admin, setAdmin] = useState(false);

  useEffect(() => {
    let cancel = false;
    const token = localStorage.getItem(CUSTOMER_KEY);
    const adminToken = localStorage.getItem(ADMIN_KEY);
    Promise.all([
      token ? currentCustomer({ data: { token } }) : Promise.resolve(null),
      adminToken ? adminSession({ data: { token: adminToken } }) : Promise.resolve({ ok: false }),
    ])
      .then(([nextCustomer, nextAdmin]) => {
        if (cancel) return;
        if (!nextCustomer && token) localStorage.removeItem(CUSTOMER_KEY);
        if (!nextAdmin.ok && adminToken) localStorage.removeItem(ADMIN_KEY);
        setCustomer(nextCustomer);
        setAdmin(nextAdmin.ok);
        setReady(true);
      })
      .catch(() => {
        if (!cancel) setReady(true);
      });
    return () => {
      cancel = true;
    };
  }, []);

  const signIn = useCallback((token: string, next: Customer) => {
    localStorage.setItem(CUSTOMER_KEY, token);
    setCustomer(next);
  }, []);

  const updateCustomer = useCallback((next: Customer) => setCustomer(next), []);

  const signOut = useCallback(async () => {
    const token = localStorage.getItem(CUSTOMER_KEY);
    localStorage.removeItem(CUSTOMER_KEY);
    setCustomer(null);
    if (token) await logoutCustomer({ data: { token } }).catch(() => undefined);
  }, []);

  const adminIn = useCallback((token: string) => {
    localStorage.setItem(ADMIN_KEY, token);
    setAdmin(true);
  }, []);

  const adminOut = useCallback(async () => {
    const token = localStorage.getItem(ADMIN_KEY);
    localStorage.removeItem(ADMIN_KEY);
    setAdmin(false);
    if (token) await adminLogout({ data: { token } }).catch(() => undefined);
  }, []);

  const value: SessionValue = {
    ready,
    customer,
    admin,
    token: () => (typeof window === "undefined" ? null : localStorage.getItem(CUSTOMER_KEY)),
    adminToken: () => (typeof window === "undefined" ? null : localStorage.getItem(ADMIN_KEY)),
    signIn,
    updateCustomer,
    signOut,
    adminIn,
    adminOut,
  };

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession() {
  const value = useContext(SessionContext);
  if (!value) throw new Error("Session missing");
  return value;
}
