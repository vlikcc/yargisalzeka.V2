# Dockerfile for SearchService
FROM mcr.microsoft.com/dotnet/aspnet:9.0-alpine AS base
RUN apk add --no-cache curl
WORKDIR /app
EXPOSE 5004

FROM mcr.microsoft.com/dotnet/sdk:9.0-alpine AS build
ARG BUILD_CONFIGURATION=Release
WORKDIR /src
COPY ["SearchService/SearchService.csproj", "SearchService/"]
RUN dotnet restore "SearchService/SearchService.csproj"
COPY . .
WORKDIR "/src/SearchService"
RUN dotnet build "SearchService.csproj" -c $BUILD_CONFIGURATION -o /app/build

FROM build AS publish
ARG BUILD_CONFIGURATION=Release
RUN dotnet publish "SearchService.csproj" -c $BUILD_CONFIGURATION -o /app/publish /p:UseAppHost=false

FROM base AS final
WORKDIR /app
COPY --from=publish /app/publish .
RUN addgroup -g 1001 -S appgroup \
  && adduser -u 1001 -S appuser -G appgroup
USER appuser
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
  CMD curl -f http://localhost:5004/health || exit 1
ENTRYPOINT ["dotnet", "SearchService.dll"]
