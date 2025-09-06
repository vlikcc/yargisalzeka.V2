#!/usr/bin/env bash
# Quick manual test for AIService endpoints via ApiGateway
# Usage: JWT="<token>" ./scripts/test-ai-endpoints.sh "OLAY METNI"
set -euo pipefail
OLAY_TEXT=${1:-"Basit bir tazminat davası olayı. Sözleşme ihlali ve maddi zarar iddiaları var."}
: "${JWT?JWT environment variable (bearer token) gerekli}"
BASE=${BASE_URL:-"https://yargisalzeka.com"}
common_headers=(-H "Authorization: Bearer $JWT" -H 'Content-Type: application/json')

build_payload() { # $1=alan adı (caseText / CaseText), $2=metin
	jq -n --arg t "$2" '{($ENV.KEY):$t}' KEY="$1" 2>/dev/null || echo "{\"$1\":\"$2\"}"
}

echo "[1] analyze-case" >&2
curl -sS -X POST "${BASE}/api/gemini/analyze-case" "${common_headers[@]}" \
	-d "$(build_payload caseText "$OLAY_TEXT")" | jq . || echo FAIL

echo "[2] extract-keywords" >&2
curl -sS -X POST "${BASE}/api/gemini/extract-keywords" "${common_headers[@]}" \
	-d "$(build_payload caseText "$OLAY_TEXT")" | jq . || echo FAIL

echo "[3] full search" >&2
curl -sS -X POST "${BASE}/api/search" "${common_headers[@]}" \
	-d "$(build_payload CaseText "$OLAY_TEXT")" | jq '{analysis, keywords, totalResults, decisionsCount:(.decisions|length)}' || echo FAIL
