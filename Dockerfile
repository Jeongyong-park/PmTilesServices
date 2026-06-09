# syntax=docker/dockerfile:1

# ── Stage 1: 프론트엔드 빌드 (Vite) ──────────────────────────────
FROM node:20-alpine AS frontend
WORKDIR /fe
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build
# 산출물: /fe/dist (Pretendard woff2 포함 — 완전 오프라인)

# ── Stage 2: 백엔드 빌드 (Maven) ─────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS backend
WORKDIR /be
# 의존성 레이어 캐싱
COPY backend/pom.xml ./
RUN mvn -q -B dependency:go-offline
# 소스 + 프론트엔드 dist 를 Spring 정적 리소스로 복사
COPY backend/ ./
COPY --from=frontend /fe/dist/ ./src/main/resources/static/
RUN mvn -q -B -DskipTests package
# 산출물: /be/target/*.jar (글리프 PBF 는 classpath 에 포함, pmtiles 는 볼륨)

# ── Stage 3: 런타임 (JRE) ────────────────────────────────────────
FROM eclipse-temurin:17-jre AS runtime
WORKDIR /app
COPY --from=backend /be/target/*.jar app.jar
EXPOSE 8080
# pmtiles 는 볼륨으로 마운트하고 이 경로로 지정 (compose 참고)
ENV PMTILES_PATH=/data/south-korea.pmtiles
ENTRYPOINT ["java", "-jar", "app.jar"]
