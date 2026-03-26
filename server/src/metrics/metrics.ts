type CounterKey =
  | "auth_requests_total"
  | "auth_errors_total"
  | "storage_requests_total"
  | "storage_errors_total"
  | "cleanup_runs_total"
  | "cleanup_changes_total"
  | "lock_ttl_expirations_total"
  | "lock_heartbeat_renewed_total"
  | "lock_heartbeat_rejected_total";

const counters: Record<CounterKey, number> = {
  auth_requests_total: 0,
  auth_errors_total: 0,
  storage_requests_total: 0,
  storage_errors_total: 0,
  cleanup_runs_total: 0,
  cleanup_changes_total: 0,
  lock_ttl_expirations_total: 0,
  lock_heartbeat_renewed_total: 0,
  lock_heartbeat_rejected_total: 0,
};

const startedAtMs = Date.now();

export function incCounter(key: CounterKey, value = 1): void {
  counters[key] += value;
}

export function getMetricsText(): string {
  const uptimeSeconds = Math.floor((Date.now() - startedAtMs) / 1000);

  return [
    "# HELP syncnest_uptime_seconds Server uptime in seconds",
    "# TYPE syncnest_uptime_seconds gauge",
    `syncnest_uptime_seconds ${uptimeSeconds}`,
    "# HELP syncnest_auth_requests_total Total auth endpoint requests",
    "# TYPE syncnest_auth_requests_total counter",
    `syncnest_auth_requests_total ${counters.auth_requests_total}`,
    "# HELP syncnest_auth_errors_total Total auth endpoint errors",
    "# TYPE syncnest_auth_errors_total counter",
    `syncnest_auth_errors_total ${counters.auth_errors_total}`,
    "# HELP syncnest_storage_requests_total Total storage/file-lock endpoint requests",
    "# TYPE syncnest_storage_requests_total counter",
    `syncnest_storage_requests_total ${counters.storage_requests_total}`,
    "# HELP syncnest_storage_errors_total Total storage/file-lock endpoint errors",
    "# TYPE syncnest_storage_errors_total counter",
    `syncnest_storage_errors_total ${counters.storage_errors_total}`,
    "# HELP syncnest_cleanup_runs_total Total cleanup job runs",
    "# TYPE syncnest_cleanup_runs_total counter",
    `syncnest_cleanup_runs_total ${counters.cleanup_runs_total}`,
    "# HELP syncnest_cleanup_changes_total Total records changed by cleanup job",
    "# TYPE syncnest_cleanup_changes_total counter",
    `syncnest_cleanup_changes_total ${counters.cleanup_changes_total}`,
    "# HELP syncnest_lock_ttl_expirations_total Total file locks auto-expired by TTL on access checks",
    "# TYPE syncnest_lock_ttl_expirations_total counter",
    `syncnest_lock_ttl_expirations_total ${counters.lock_ttl_expirations_total}`,
    "# HELP syncnest_lock_heartbeat_renewed_total Total successful file lock heartbeat renewals",
    "# TYPE syncnest_lock_heartbeat_renewed_total counter",
    `syncnest_lock_heartbeat_renewed_total ${counters.lock_heartbeat_renewed_total}`,
    "# HELP syncnest_lock_heartbeat_rejected_total Total rejected file lock heartbeat attempts",
    "# TYPE syncnest_lock_heartbeat_rejected_total counter",
    `syncnest_lock_heartbeat_rejected_total ${counters.lock_heartbeat_rejected_total}`,
    "",
  ].join("\n");
}
