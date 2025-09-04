# Production-ready Dockerfile for SubscriptionService
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS base
RUN apk add --no-cache curl
WORKDIR /app
EXPOSE 5002

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["SubscriptionService/SubscriptionService.csproj", "SubscriptionService/"]
RUN dotnet restore "SubscriptionService/SubscriptionService.csproj"
COPY . .
WORKDIR "/src/SubscriptionService"
RUN dotnet build "SubscriptionService.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "SubscriptionService.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Production stage
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5002/health || exit 1
ENTRYPOINT ["dotnet", "SubscriptionService.dll"]
