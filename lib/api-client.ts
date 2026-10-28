import { useAuthStore } from "./auth-store";
import { AUTH_VIA_COOKIE } from "./auth-config";

const API_URL = process.env.NEXT_PUBLIC_API_URL;

type PersistedAuth = {
  state?: {
    token?: string | null;
    tenantId?: string | null;
  };
};

type PrintingApiMetric = {
  page: string;
  method: string;
  endpoint: string;
  durationMs: number;
  status: number;
  attempt: number;
};

type PrintingApiMetricSummary = {
  page: string;
  method: string;
  endpoint: string;
  requests: number;
  failures: number;
  averageMs: number;
};

type PrintingApiMetrics = {
  requests: PrintingApiMetric[];
  totalRequests: number;
  droppedRequests: number;
  reset: () => void;
  report: () => { totalRequests: number; recordedRequests: number; droppedRequests: number; routes: PrintingApiMetricSummary[] };
};

declare global {
  interface Window {
    __ollPrintingApiMetrics?: PrintingApiMetrics;
  }
}

const PRINTING_API_METRICS_LIMIT = 2000;

function recordPrintingApiMetric(metric: PrintingApiMetric) {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;

  const metrics = window.__ollPrintingApiMetrics ?? (window.__ollPrintingApiMetrics = {
    requests: [],
    totalRequests: 0,
    droppedRequests: 0,
    reset() {
      this.requests = [];
      this.totalRequests = 0;
      this.droppedRequests = 0;
    },
    report() {
      const grouped = new Map<string, PrintingApiMetricSummary & { durationTotal: number }>();
      for (const request of this.requests) {
        const key = `${request.page}\n${request.method}\n${request.endpoint}`;
        const summary = grouped.get(key) ?? {
          page: request.page,
          method: request.method,
          endpoint: request.endpoint,
          requests: 0,
          failures: 0,
          averageMs: 0,
          durationTotal: 0,
        };
        summary.requests += 1;
        summary.durationTotal += request.durationMs;
        if (request.status === 0 || request.status >= 400) summary.failures += 1;
        grouped.set(key, summary);
      }

      const routes = [...grouped.values()].map(({ durationTotal, ...summary }) => ({
        ...summary,
        averageMs: Number((durationTotal / summary.requests).toFixed(1)),
      }));
      console.info(`[Printing API] ${this.totalRequests} solicitudes HTTP registradas; ${this.droppedRequests} detalles descartados por límite.`);
      console.table(routes);
      return {
        totalRequests: this.totalRequests,
        recordedRequests: this.requests.length,
        droppedRequests: this.droppedRequests,
        routes,
      };
    },
  });

  metrics.totalRequests += 1;
  if (metrics.requests.length === PRINTING_API_METRICS_LIMIT) {
    metrics.requests.shift();
    metrics.droppedRequests += 1;
  }
  metrics.requests.push(metric);
}

function getAuthSnapshot() {
  const memory = useAuthStore.getState();
  if (memory.token || typeof window === "undefined") return memory;

  try {
    const raw = window.localStorage.getItem("auth-storage");
    const persisted = raw ? (JSON.parse(raw) as PersistedAuth) : null;
    const token = persisted?.state?.token?.replace(/^Bearer\s+/i, "").trim() || null;
    const tenantId = persisted?.state?.tenantId ?? null;
    if (token || tenantId) return { ...memory, token, tenantId };
  } catch {
    // Ignore malformed or unavailable storage; the request will fail normally.
  }

  return memory;
}

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface RequestConfig extends RequestInit {
  retries?: number;
  retryDelay?: number;
  timeout?: number;
  idempotencyKey?: string;
}

async function request<T>(
  endpoint: string,
  config: RequestConfig = {}
): Promise<T> {
  const {
    retries = 1,
    retryDelay = 1000,
    timeout = 30000,
    idempotencyKey,
    ...fetchConfig
  } = config;
  const method = (fetchConfig.method || "GET").toUpperCase();
  // Reads are safe to retry. Writes need a stable idempotency key so a
  // timeout after the server commits cannot create a duplicate operation.
  const retryable = method === "GET" || Boolean(idempotencyKey);

  // Use getAuthSnapshot to read from localStorage if store hasn"t hydrated yet
  // This fixes session persistence on F5/back navigation
  const authStore = getAuthSnapshot();

  // En modo cookie NO enviamos Authorization: el token viaja en la cookie
  // HttpOnly que el navegador incluye automaticamente. credentials: "include"
  // es obligatorio en fetch cross-origin para que el cookie viaje.
  // En modo header seguimos mandando Bearer como antes.
  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(!AUTH_VIA_COOKIE && authStore.token && { Authorization: `Bearer ${authStore.token}` }),
    ...(authStore.tenantId && { "x-tenant-id": authStore.tenantId }),
    ...(idempotencyKey && { "Idempotency-Key": idempotencyKey }),
    ...fetchConfig.headers,
  };

  const fetchInit: RequestInit = {
    ...fetchConfig,
    headers,
    // credentials: "include" en same-origin es un no-op, en cross-origin
    // es necesario para que el navegador envie/reciba cookies. Lo seteamos
    // siempre que el flag este activo para no depender del entorno.
    ...(AUTH_VIA_COOKIE ? { credentials: "include" as RequestCredentials } : {}),
  };

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    const startedAt = performance.now();
    let metricRecorded = false;
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        ...fetchInit,
        signal: controller.signal,
      });
      if (endpoint.startsWith("/printing/")) {
        recordPrintingApiMetric({
          page: typeof window === "undefined" ? "server" : window.location.pathname,
          method,
          endpoint,
          durationMs: Number((performance.now() - startedAt).toFixed(1)),
          status: response.status,
          attempt: attempt + 1,
        });
        metricRecorded = true;
      }

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new ApiError(
          errorData.code || "UNKNOWN_ERROR",
          errorData.message || errorData.error || response.statusText,
          response.status
        );
      }

      if (response.status === 204) {
        return undefined as T;
      }

      return await response.json();
    } catch (error) {
      clearTimeout(timeoutId);
      if (!metricRecorded && endpoint.startsWith("/printing/")) {
        recordPrintingApiMetric({
          page: typeof window === "undefined" ? "server" : window.location.pathname,
          method,
          endpoint,
          durationMs: Number((performance.now() - startedAt).toFixed(1)),
          status: 0,
          attempt: attempt + 1,
        });
      }
      lastError = error as Error;

      if (error instanceof ApiError) {
        if (error.status === 401) {
          useAuthStore.getState().logout();
          throw error;
        }
        if (error.status === 500 || error.status >= 503) {
          if (retryable && attempt < retries) {
            await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
            continue;
          }
        }
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("TIMEOUT", "La solicitud tardó demasiado", 408);
      }

      if (retryable && attempt < retries) {
        await new Promise((r) => setTimeout(r, retryDelay * Math.pow(2, attempt)));
      } else {
        clearTimeout(timeoutId);
        throw new ApiError("NETWORK_ERROR", lastError?.message || "Error de red", 0);
      }
    }
  }

  throw new ApiError("UNKNOWN_ERROR", lastError?.message || "Error inesperado", 0);
}

export async function get<T>(endpoint: string, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: "GET" });
}

export async function post<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: "POST",
    body: JSON.stringify(data),
  });
}

export async function put<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function patch<T>(endpoint: string, data?: unknown, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, {
    ...config,
    method: "PATCH",
    body: JSON.stringify(data),
  });
}

export async function del<T>(endpoint: string, config?: RequestConfig): Promise<T> {
  return request<T>(endpoint, { ...config, method: "DELETE" });
}
