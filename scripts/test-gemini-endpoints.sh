#!/usr/bin/env bash
set -euo pipefail

# Simple real-service smoke test for Gemini AI endpoints.
# Prerequisites:
# 1. AIService and SubscriptionService are running and reachable.
# 2. Gemini API key configured for AIService (env var Gemini__ApiKey or appsettings).
# 3. The test user has (or will be assigned) a trial subscription.
#
# Environment variables you can override:
#   AI_BASE (default: http://localhost:5005)            -> AIService base URL
#   SUB_BASE (default: http://localhost:5002)           -> SubscriptionService base URL
#   USER_ID (default: test-user-1)
#   USER_EMAIL (default: test@example.com)
#
# Usage:
#   chmod +x scripts/test-gemini-endpoints.sh
#   ./scripts/test-gemini-endpoints.sh
#
# Any non-zero exit indicates a failure. Output is concise; use VERBOSE=1 for raw bodies.

AI_BASE=${AI_BASE:-http://localhost:5005}
SUB_BASE=${SUB_BASE:-http://localhost:5002}
USER_ID=${USER_ID:-test-user-1}
USER_EMAIL=${USER_EMAIL:-test@example.com}
VERBOSE=${VERBOSE:-0}

echo "[INFO] Using AI_BASE=$AI_BASE SUB_BASE=$SUB_BASE USER_ID=$USER_ID"

curl_json() { # method url data_json
  local method=$1 url=$2 data=$3
  if [ "${VERBOSE}" = "1" ]; then
    echo "[CURL] $method $url :: $data" >&2
  fi
  curl -sS -X "$method" -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" -d "$data" "$url"
}

# 1. Get JWT via AIService /api/gemini/test-token (no auth required)
echo "[STEP] Generating test token"
TOKEN=$(curl -sS -X POST -H 'Content-Type: application/json' \
  -d "{\"userId\":\"$USER_ID\",\"email\":\"$USER_EMAIL\"}" \
  "$AI_BASE/api/gemini/test-token" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
  echo "[ERROR] Could not obtain test token" >&2
  exit 1
fi
echo "[OK] Token acquired (truncated): ${TOKEN:0:24}..."

# 2. Assign trial subscription (idempotent behavior acceptable if already exists)
echo "[STEP] Assigning trial subscription (if not existing)"
curl -sS -X POST -H 'Content-Type: application/json' -H "Authorization: Bearer $TOKEN" \
  -d "{\"UserId\":\"$USER_ID\"}" "$SUB_BASE/api/subscription/assign-trial" >/dev/null || true
echo "[OK] Trial assignment attempted"

# 3. Check usage
echo "[STEP] Checking usage"
USAGE=$(curl -sS -H "Authorization: Bearer $TOKEN" "$SUB_BASE/api/subscription/usage")
echo "$USAGE" | jq . >/dev/null 2>&1 || { echo "[ERROR] Usage response not JSON"; echo "$USAGE"; exit 1; }
echo "[OK] Usage: $(echo "$USAGE" | jq -c '{kw:.keywordExtractionRemaining, an:.caseAnalysisRemaining, srch:.searchRemaining, pet:.petitionRemaining}')"

CASE_TEXT="Basit kira sözleşmesi uyuşmazlığı nedeniyle tahliye ve alacak talebi"

# 4. Extract Keywords
echo "[STEP] extract-keywords"
KW_RESP=$(curl_json POST "$AI_BASE/api/gemini/extract-keywords" "{\"caseText\":\"$CASE_TEXT\"}") || { echo "[ERROR] Keyword extraction call failed"; exit 1; }
if [ "$VERBOSE" = "1" ]; then echo "$KW_RESP"; fi
KW_COUNT=$(echo "$KW_RESP" | jq 'length' 2>/dev/null || echo 0)
echo "[OK] Keywords count: $KW_COUNT"

# 5. analyze-case
echo "[STEP] analyze-case"
AN_RESP=$(curl_json POST "$AI_BASE/api/gemini/analyze-case" "{\"caseText\":\"$CASE_TEXT\"}") || { echo "[ERROR] Analyze case call failed"; exit 1; }
AN_TEXT=$(echo "$AN_RESP" | jq -r '.analysisResult // .AnalysisResult // empty')
if [ -z "$AN_TEXT" ]; then echo "[WARN] No analysisResult field"; else echo "[OK] Analysis length: ${#AN_TEXT}"; fi

# 6. analyze-relevance
echo "[STEP] analyze-relevance"
REL_RESP=$(curl_json POST "$AI_BASE/api/gemini/analyze-relevance" "{\"caseText\":\"$CASE_TEXT\",\"decisionText\":\"Örnek Yargıtay kararı metni...\"}") || { echo "[ERROR] Relevance call failed"; exit 1; }
REL_SCORE=$(echo "$REL_RESP" | jq -r '.score // .Score // empty')
echo "[OK] Relevance score: ${REL_SCORE:-N/A}"

# 7. generate-petition
echo "[STEP] generate-petition"
PET_RESP=$(curl_json POST "$AI_BASE/api/gemini/generate-petition" "{\"caseText\":\"$CASE_TEXT\",\"relevantDecisions\":[]}") || { echo "[ERROR] Petition call failed"; exit 1; }
PET_LEN=$(echo "$PET_RESP" | wc -c | tr -d ' ')
echo "[OK] Petition text length: $PET_LEN"

echo "[SUCCESS] All Gemini endpoints invoked successfully (check counts & lengths above)."