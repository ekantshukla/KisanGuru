# KisanGuru — one container: the Angular website + the .NET API.
# Build:  docker build -t kisanguru .
# Run:    docker run -p 8080:8080 -e Advisory__ApiKey=... -e Mandi__ApiKey=... kisanguru
#         then open http://localhost:8080

# ---- 1. Angular website ----
FROM node:24-alpine AS web
WORKDIR /web
COPY frontend/kisanguru-web/package*.json ./
RUN npm install --no-audit --no-fund
COPY frontend/kisanguru-web/ ./
RUN npx ng build --configuration production

# ---- 2. .NET API ----
FROM mcr.microsoft.com/dotnet/sdk:10.0 AS api
WORKDIR /src
COPY backend/KisanGuru.Api/KisanGuru.Api.csproj backend/KisanGuru.Api/
RUN dotnet restore backend/KisanGuru.Api/KisanGuru.Api.csproj
COPY backend/ backend/
RUN dotnet publish backend/KisanGuru.Api/KisanGuru.Api.csproj -c Release -o /app --no-restore

# ---- 3. Runtime ----
FROM mcr.microsoft.com/dotnet/aspnet:10.0
WORKDIR /app
COPY --from=api /app ./
COPY --from=web /web/dist/kisanguru-web/browser ./wwwroot
# The translation cache is written at runtime (App_Data/translations); let the app user write it.
RUN mkdir -p App_Data/translations && chown -R $APP_UID App_Data/translations
USER $APP_UID
ENV ASPNETCORE_HTTP_PORTS=8080 \
    ASPNETCORE_ENVIRONMENT=Production
EXPOSE 8080
ENTRYPOINT ["dotnet", "KisanGuru.Api.dll"]
