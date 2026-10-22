#!/usr/bin/env bash
# Starts the production stack locally (production settings, stand-in external services),
# checks that it serves the app and the API, then tears it down.
# Usage from the repository root: bash deploy/smoke-test.sh [--keep]
set -euo pipefail

compose=(docker compose -p car-rental-smoke -f deploy/docker-compose.prod.yml -f deploy/docker-compose.smoke.yml --env-file deploy/.env.smoke)
base=http://localhost:8080

cleanup() { [[ "${1:-}" == "--keep" ]] || "${compose[@]}" down -v --remove-orphans >/dev/null 2>&1 || true; }
trap 'cleanup "${KEEP:-}"' EXIT
[[ "${1:-}" == "--keep" ]] && KEEP=--keep

"${compose[@]}" up -d --wait --wait-timeout 180

check() { # name, expected status, curl args...
  local name=$1 expected=$2; shift 2
  local status; status=$(curl -s -o /tmp/smoke-body -w "%{http_code}" "$@")
  if [[ "$status" == "$expected" ]]; then echo "ok   $name ($status)"; else echo "FAIL $name: expected $expected, got $status"; cat /tmp/smoke-body; exit 1; fi
}

check "home page"            200 "$base/"
check "catalog page"         200 "$base/cars"
check "API readiness"        200 "$base/api/health/ready"
check "API docs hidden"      404 "$base/api/docs"
check "metrics need token"   401 "$base/api/metrics"
check "metrics with token"   200 -H "authorization: Bearer smoke-test-metrics-token-0123456789" "$base/api/metrics"
check "register"             201 -H "origin: $base" -H "content-type: application/json" \
  -d "{\"email\":\"smoke-$RANDOM@example.com\",\"password\":\"correct-horse-battery\",\"fullName\":\"Smoke Test\"}" "$base/api/v1/auth/register"
check "cross-site POST blocked" 403 -H "origin: https://evil.example" -H "content-type: application/json" -d '{}' "$base/api/v1/auth/logout"
grep -qi "set-cookie" < <(curl -s -D - -o /dev/null -H "origin: $base" -H "content-type: application/json" \
  -d "{\"email\":\"smoke2-$RANDOM@example.com\",\"password\":\"correct-horse-battery\",\"fullName\":\"Smoke Test\"}" "$base/api/v1/auth/register") \
  && echo "ok   session cookie issued"
echo "Production stack smoke test passed."
