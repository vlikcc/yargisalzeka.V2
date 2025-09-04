# Production-ready Dockerfile for AIService
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS base
RUN apk add --no-cache curl
WORKDIR /app
EXPOSE 5012

# Build stage
FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
WORKDIR /src
COPY ["AIService/AIService.csproj", "AIService/"]
RUN dotnet restore "AIService/AIService.csproj"
COPY . .
WORKDIR "/src/AIService"
RUN dotnet build "AIService.csproj" -c Release -o /app/build

# Publish stage
FROM build AS publish
RUN dotnet publish "AIService.csproj" -c Release -o /app/publish /p:UseAppHost=false

# Production stage
FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5012/health || exit 1
ENTRYPOINT ["dotnet", "AIService.dll"]
