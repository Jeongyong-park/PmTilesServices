# PMTiles Services — 보일러플레이트

Spring Boot 3 백엔드가 **PMTiles** 벡터 타일을 서빙하고, 브라우저에서
**MapLibre GL JS** 와 **OpenLayers** 두 렌더링 엔진을 토글하며 같은 지도를
조회하는 보일러플레이트. 두 엔진은 **하나의 공유 스타일**(`basemap-style.ts`)을 사용한다.

- Java 17 / Spring Boot 3
- Vite + React 19 + TypeScript
- 지도 엔진 2종 토글 (MapLibre ↔ OpenLayers)
- 배경 테마 4종 (Light / Dark / Positron / Korean)
- 라벨 폰트: **Pretendard** (서버 SDF 글리프 + 웹폰트)
- **완전 오프라인 동작** (런타임에 외부 CDN 미사용)

```
PmTilesServices/
├── backend/                                  # Spring Boot 3 (Java 17, Maven)
│   └── src/main/java/kr/pe/jypark/example/
│       ├── PmtilesApplication.java
│       ├── controller/TileApiController.java # PMTiles Range 서빙 + 글리프
│       └── config/WebConfig.java             # 개발용 CORS
│   └── src/main/resources/
│       ├── application.yml
│       └── data/
│           ├── south-korea.pmtiles           # 사용자 제공 (gitignore)
│           └── fonts/Pretendard {Weight}/    # 글리프 PBF (생성물)
├── frontend/                                 # Vite + React 19
│   └── src/
│       ├── App.tsx                           # 엔진 토글 + 테마 셀렉터
│       ├── styles/basemap-style.ts           # 공유 스타일 (4 테마 팔레트)
│       ├── main.tsx                          # Pretendard 웹폰트 로드
│       └── components/
│           ├── MapLibreMap.tsx
│           └── OpenLayersMap.tsx
├── Dockerfile                                # 멀티스테이지 (단일 이미지)
├── docker-compose.yml                        # PMTiles 볼륨 매핑
└── data/                                     # Docker 볼륨용 host 디렉터리
```

## 동작 방식

- **백엔드**: `south-korea.pmtiles` 를 `GET /api/tiles/south-korea.pmtiles` 로
  **HTTP Range Request**(`Accept-Ranges: bytes`, `206 Partial Content`) 서빙.
  PMTiles 클라이언트(MapLibre `pmtiles://` 프로토콜, OpenLayers `ol-pmtiles`)가
  필요한 바이트 구간만 가져간다. 글리프는 `GET /api/tiles/fonts/{fontstack}/{range}.pbf`.
  - PMTiles 경로 우선순위: `PMTILES_PATH`(볼륨, `RandomAccessFile` seek 효율적) →
    없으면 classpath 리소스 폴백(개발 시; jar 실행 시 임시 파일로 1회 복사).
  - 글리프: MapLibre 가 콤마로 이어 요청하는 폰트 스택(`A,B`)을 분리해 존재하는 첫
    폰트 폴더를 서빙.
- **프론트엔드**: 두 맵 컴포넌트가 동일한 `basemapStyle` 사용.
  - **MapLibre**: 스타일을 직접 사용(`pmtiles` 프로토콜 등록). 라벨은 서버 SDF 글리프.
  - **OpenLayers**: `PMTilesVectorSource`(`ol-pmtiles`) + `applyStyle`(`ol-mapbox-style`)
    로 같은 스타일 적용. 라벨은 번들된 Pretendard 웹폰트(캔버스)로 렌더링.

> 두 엔진은 **같은 데이터·같은 스타일**을 쓰지만 렌더러가 달라 픽셀 단위로 동일하진
> 않다(ol-mapbox-style 은 MapLibre 의 근사 변환). 라벨 글꼴 굵기·안티에일리어싱 등에
> 미세 차이가 있을 수 있다.

## 사전 준비물

- JDK 17, Maven 3.9+
- Node.js 18+ (20+ 권장), npm
- **`south-korea.pmtiles`** (OpenMapTiles 스키마) — 사용자 제공.
  `backend/src/main/resources/data/` 참고
  ([데이터 README](backend/src/main/resources/data/README.md)).
- 글리프 PBF(`data/fonts/Pretendard *`)는 리포에 포함(커밋)되어 별도 준비 불필요.

## 개발 실행 (2 프로세스)

**1) 백엔드**

```bash
cd backend
mvn spring-boot:run
# → http://localhost:8080
```

**2) 프론트엔드** — Vite dev 서버가 `/api` 를 백엔드(:8080)로 프록시

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

http://localhost:5173 접속. 기본은 MapLibre 렌더링. 우상단 토글로 OpenLayers 전환,
그 아래 셀렉터로 테마(Light/Dark/Positron/Korean) 전환.

## 백엔드 엔드포인트 직접 확인

```bash
# Range 요청 → 206
curl -sI -H "Range: bytes=0-99" http://localhost:8080/api/tiles/south-korea.pmtiles
#   → 206, Content-Range: bytes 0-99/<size>, Content-Length: 100

# 글리프 (Pretendard SemiBold, 한글 범위)
curl -sI "http://localhost:8080/api/tiles/fonts/Pretendard%20SemiBold/44032-44287.pbf"
#   → 200, Content-Type: application/x-protobuf
```

## Docker (단일 이미지, 운영)

멀티스테이지 빌드: Vite `dist` → Spring 정적 리소스 → fat jar. 컨테이너 하나가
SPA 와 `/api` 를 같은 출처(8080)로 서빙한다. **PMTiles 는 런타임 볼륨**(이미지에
굽지 않음), Pretendard 글리프 PBF 는 이미지에 포함(classpath).

```bash
# 1) PMTiles 를 볼륨 디렉터리에 배치  (data/south-korea.pmtiles)
# 2) 빌드 + 실행
docker compose up --build
# → http://localhost:8080  (SPA + API, 동일 출처)
```

이미지 재빌드 없이 지도 교체: host 의 PMTiles 파일만 바꾸고 컨테이너 재시작.
컨테이너 내부 경로는 `PMTILES_PATH`(compose 기본값 `/data/south-korea.pmtiles`)로 지정.

### ⚠️ 드라이브 공유 (Windows / Docker Desktop WSL2)

Docker Desktop 의 WSL2 VM 은 마운트한 드라이브만 인식한다(보통 **C:**). 프로젝트가
공유되지 않는 다른 드라이브(예: **D:**)에 있으면 bind 마운트가 **컨테이너 안에서
비어 보여** `/api/tiles/...` 가 404/500 을 반환(지도 안 뜸)한다 — host 에 파일이
있어도 마찬가지.

해결: PMTiles 를 Docker 가 보는 드라이브에 두고 `.env` 의 `PMTILES_DATA_DIR` 로
host 데이터 디렉터리를 지정한다. compose 볼륨은 `${PMTILES_DATA_DIR:-./data}:/data:ro`.

```dotenv
# .env  (gitignore 됨)
PMTILES_DATA_DIR=C:/pmtiles-data
```

해당 디렉터리에 `south-korea.pmtiles` 배치. 프로젝트가 이미 공유 드라이브에 있으면
`.env` 없이 기본값 `./data` 로 동작. 글리프는 이미지에 포함되므로 PMTiles 만
공유 드라이브 볼륨이 필요하다.

## 폰트 (Pretendard) 재생성 (선택)

글리프 PBF 는 리포에 포함되어 있어 보통 재생성 불필요. 직접 만들려면 Pretendard
OTF/TTF 에서 SDF 글리프를 생성한다(예: [`build_pbf_glyphs`](https://github.com/stadiamaps/sdf_font_tools)).
출력 폴더명을 `text-font` 와 맞춘다: `Pretendard Regular` / `Pretendard SemiBold` /
`Pretendard Bold` → `backend/src/main/resources/data/fonts/` 아래 배치.

## 메모

- **완전 오프라인**: 프론트엔드가 Pretendard woff2 를 로컬 번들(Vite), 백엔드가
  PMTiles·글리프 PBF 를 디스크/classpath 에서 서빙. 런타임 CDN 의존 없음.
  (ol-mapbox-style 번들에 webfont CDN 폴백 문자열이 있으나, 로드 안 된 폰트
  family 참조 시에만 발동 — 스타일은 번들된 Pretendard 만 사용해 미발동.)
- 라벨은 글리프 PBF 가 있을 때만 렌더링되고, 지오메트리는 무관하게 렌더링된다.
- 비-Range 전체 GET 은 파일을 통째로 읽으므로(보일러플레이트 단순화), PMTiles
  클라이언트처럼 항상 Range 로 접근하는 사용이 정상 경로다.

