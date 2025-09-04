#!/usr/bin/env bash

# Build and push all microservice images to Azure Container Registry (ACR)
# Usage examples (zsh/bash):
#   ./scripts/build-and-push-acr.sh --acr <ACR_NAME> --tag prod --platform linux/amd64
#   ./scripts/build-and-push-acr.sh --registry myacr.azurecr.io --tag v1.0.0

set -euo pipefail

SCRIPT_DIR=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" &>/dev/null && pwd)
REPO_ROOT=$(cd "$SCRIPT_DIR/.." && pwd)
cd "$REPO_ROOT"

ACR_NAME=""
ACR_LOGIN_SERVER=""
TAG="prod"
PUSH=1
PLATFORM=""

red() { printf "\033[31m%s\033[0m\n" "$*"; }
green() { printf "\033[32m%s\033[0m\n" "$*"; }
yellow() { printf "\033[33m%s\033[0m\n" "$*"; }

usage() {
  cat <<EOF
Build and push images to Azure Container Registry

Options:
  --acr <name>           Azure Container Registry name (e.g., myacr)
  --registry <server>    Registry login server (e.g., myacr.azurecr.io). Overrides --acr
  --tag <tag>            Image tag (default: prod)
  --platform <p>         Build platform (e.g., linux/amd64). Optional.
  --no-push              Build only, do not push
  -h, --help             Show this help

Examples:
  $0 --acr myacr --tag prod --platform linux/amd64
  $0 --registry myacr.azurecr.io --tag v1.2.3
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --acr)
      ACR_NAME=${2:-}; shift 2;;
    --registry)
      ACR_LOGIN_SERVER=${2:-}; shift 2;;
    --tag)
      TAG=${2:-}; shift 2;;
    --platform)
      PLATFORM=${2:-}; shift 2;;
    --no-push)
      PUSH=0; shift;;
    -h|--help)
      usage; exit 0;;
    *)
      red "Unknown option: $1"; usage; exit 2;;
  esac
done

# Dependencies
command -v docker >/dev/null 2>&1 || { red "docker not found"; exit 1; }
if [[ -z "$ACR_LOGIN_SERVER" ]]; then
  command -v az >/dev/null 2>&1 || { red "az CLI not found; install Azure CLI or pass --registry"; exit 1; }
fi

# Resolve registry login server
if [[ -z "$ACR_LOGIN_SERVER" ]]; then
  if [[ -z "$ACR_NAME" ]]; then
    red "Either --registry or --acr must be provided"; exit 1
  fi
  yellow "Resolving ACR login server for: $ACR_NAME"
  ACR_LOGIN_SERVER=$(az acr show -n "$ACR_NAME" --query loginServer -o tsv || true)
  if [[ -z "$ACR_LOGIN_SERVER" ]]; then
    red "Failed to resolve ACR login server. Check ACR name and az login."; exit 1
  fi
  yellow "Logging into ACR: $ACR_NAME"
  az acr login -n "$ACR_NAME" 1>/dev/null
fi

# Basic validation
if [[ "$ACR_LOGIN_SERVER" != *.* ]]; then
  red "Invalid registry login server: '$ACR_LOGIN_SERVER'"; exit 1
fi
if [[ -z "$TAG" ]]; then
  red "Tag cannot be empty"; exit 1
fi

green "Using registry: $ACR_LOGIN_SERVER"
green "Using tag: $TAG"
if [[ -n "$PLATFORM" ]]; then
  green "Using platform: $PLATFORM"
fi
if [[ $PUSH -eq 0 ]]; then
  yellow "Push disabled (--no-push)"
fi

# Services matrix: name context dockerfile
services=(
  "apigateway . ApiGateway/Dockerfile"
  "identityservice . IdentityService/Dockerfile"
  "subscriptionservice . SubscriptionService/Dockerfile"
  "documentservice . DocumentService/Dockerfile"
  "searchservice . SearchService/Dockerfile"
  "aiservice . AIService/Dockerfile"
  "frontend frontend frontend/Dockerfile"
)

build_image() {
  local name=$1 ctx=$2 df=$3
  local image="${ACR_LOGIN_SERVER}/${name}:${TAG}"
  yellow "\n==> Building: ${image}"
  local platform_args=()
  if [[ -n "$PLATFORM" ]]; then platform_args=(--platform "$PLATFORM"); fi
  docker build "${platform_args[@]}" -t "$image" -f "$df" "$ctx"
  if [[ $PUSH -eq 1 ]]; then
    yellow "Pushing: ${image}"
    docker push "$image"
  fi
  green "Done: ${image}"
}

START_TS=$(date +%s)

for row in "${services[@]}"; do
  # shellcheck disable=SC2086
  build_image $row
done

END_TS=$(date +%s)
green "\nAll images processed in $((END_TS-START_TS))s"
