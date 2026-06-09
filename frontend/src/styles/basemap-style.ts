import type { StyleSpecification } from "maplibre-gl";

/**
 * OpenMapTiles 스키마 기반 OSM 배경지도 경량 스타일.
 * PMTiles 소스를 로컬 백엔드(Spring Boot)에서 서빙한다.
 *
 * 단일 레이어 구조를 색상 팔레트로 파라미터화하여 Light / Dark / Positron 3종 테마를 생성한다.
 * 동일한 스타일 객체를 MapLibre GL JS 와 OpenLayers(ol-mapbox-style) 양쪽에서 공유한다.
 */

export type BasemapStyleId = "light" | "dark" | "positron" | "korean";

interface Palette {
  background: string;
  water: string;
  residential: string;
  park: string;
  building: string;
  buildingOutline: string;
  roadMotorway: string;
  roadPrimary: string;
  roadSecondary: string;
  roadMinor: string;
  boundary: string;
  cityText: string;
  villageText: string;
  roadLabelText: string;
  textHalo: string;
}

const PALETTES: Record<BasemapStyleId, Palette> = {
  // 밝은 OSM 풍 (기본)
  light: {
    background: "#f8f4f0",
    water: "#aad3df",
    residential: "#f0e6d4",
    park: "#c8e6c0",
    building: "#d9d0c9",
    buildingOutline: "#c0b8af",
    roadMotorway: "#e8c88a",
    roadPrimary: "#f0d9a0",
    roadSecondary: "#ffffff",
    roadMinor: "#ffffff",
    boundary: "#9e9cab",
    cityText: "#333333",
    villageText: "#666666",
    roadLabelText: "#555555",
    textHalo: "#ffffff",
  },
  // CARTO Dark Matter 풍 (어두운 테마)
  dark: {
    background: "#121212",
    water: "#16222e",
    residential: "#1e1e1e",
    park: "#18241a",
    building: "#262626",
    buildingOutline: "#343434",
    roadMotorway: "#57503f",
    roadPrimary: "#46433a",
    roadSecondary: "#3a3a3c",
    roadMinor: "#313133",
    boundary: "#46505a",
    cityText: "#d6d6d6",
    villageText: "#a0a0a0",
    roadLabelText: "#9a9a9a",
    textHalo: "#000000",
  },
  // korean Map 풍 (실제 네이버 타일 아님 — 색상 에뮬레이션). 노란 고속도로 + 흰 도로 + 부드러운 파란 수계.
  korean: {
    background: "#f8f8f6",
    water: "#c3ddef",
    residential: "#f0efe9",
    park: "#d3e8c8",
    building: "#e9e7e0",
    buildingOutline: "#d9d6cd",
    roadMotorway: "#ffd97d",
    roadPrimary: "#ffe7bd",
    roadSecondary: "#ffffff",
    roadMinor: "#ffffff",
    boundary: "#b0b6c0",
    cityText: "#3a4250",
    villageText: "#6a7280",
    roadLabelText: "#5a6470",
    textHalo: "#ffffff",
  },
  // CARTO Positron 풍 (밝은 회색 미니멀)
  positron: {
    background: "#efefed",
    water: "#c6d2d6",
    residential: "#e7e7e7",
    park: "#dde8d5",
    building: "#e4e4e4",
    buildingOutline: "#d6d6d6",
    roadMotorway: "#ffffff",
    roadPrimary: "#ffffff",
    roadSecondary: "#ffffff",
    roadMinor: "#ffffff",
    boundary: "#cdcdcd",
    cityText: "#5a5a5a",
    villageText: "#7a7a7a",
    roadLabelText: "#888888",
    textHalo: "#ffffff",
  },
};

function buildBasemapStyle(p: Palette): StyleSpecification {
  return {
    version: 8,
    name: "OSM Basemap",
    sources: {
      openmaptiles: {
        type: "vector",
        url: "pmtiles:///api/tiles/south-korea.pmtiles",
      },
    },
    // 오프라인 환경에서도 지명 라벨을 표시하기 위해 로컬 백엔드에서 글리프를 서빙한다.
    glyphs: "/api/tiles/fonts/{fontstack}/{range}.pbf",
    layers: [
      // 배경
      {
        id: "background",
        type: "background",
        paint: { "background-color": p.background },
      },
      // 수계 (호수, 강, 바다)
      {
        id: "water",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "water",
        paint: { "fill-color": p.water },
      },
      // 토지이용 - 주거지역
      {
        id: "landuse-residential",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        filter: ["in", "class", "residential", "suburb", "neighbourhood"],
        paint: { "fill-color": p.residential, "fill-opacity": 0.5 },
      },
      // 토지이용 - 공원/녹지
      {
        id: "landuse-park",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "landuse",
        filter: ["in", "class", "park", "cemetery", "grass"],
        paint: { "fill-color": p.park, "fill-opacity": 0.5 },
      },
      // 건물
      {
        id: "building",
        type: "fill",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 13,
        paint: {
          "fill-color": p.building,
          "fill-opacity": [
            "interpolate",
            ["linear"],
            ["zoom"],
            13,
            0.3,
            16,
            0.7,
          ],
        },
      },
      // 건물 외곽선
      {
        id: "building-outline",
        type: "line",
        source: "openmaptiles",
        "source-layer": "building",
        minzoom: 14,
        paint: {
          "line-color": p.buildingOutline,
          "line-width": 0.5,
        },
      },
      // 도로 - 고속도로/간선도로
      {
        id: "road-motorway",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "motorway", "trunk"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": p.roadMotorway,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            5,
            0.5,
            12,
            3,
            16,
            8,
          ],
        },
      },
      // 도로 - 주요도로
      {
        id: "road-primary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["==", "class", "primary"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": p.roadPrimary,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            8,
            0.5,
            12,
            2,
            16,
            6,
          ],
        },
      },
      // 도로 - 보조도로
      {
        id: "road-secondary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "secondary", "tertiary"],
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": p.roadSecondary,
          "line-width": [
            "interpolate",
            ["linear"],
            ["zoom"],
            10,
            0.5,
            14,
            2,
            16,
            4,
          ],
        },
      },
      // 도로 - 일반도로
      {
        id: "road-minor",
        type: "line",
        source: "openmaptiles",
        "source-layer": "transportation",
        filter: ["in", "class", "minor", "service"],
        minzoom: 12,
        layout: { "line-cap": "round", "line-join": "round" },
        paint: {
          "line-color": p.roadMinor,
          "line-width": ["interpolate", ["linear"], ["zoom"], 12, 0.3, 16, 2],
        },
      },
      // 행정경계
      {
        id: "boundary",
        type: "line",
        source: "openmaptiles",
        "source-layer": "boundary",
        paint: {
          "line-color": p.boundary,
          "line-width": 1,
          "line-dasharray": [3, 2],
        },
      },
      // 지명 라벨 (한국어 우선)
      {
        id: "place-city",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["in", "class", "city", "town"],
        layout: {
          "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 8, 10, 12, 16],
          "text-font": ["Pretendard SemiBold", "Pretendard Regular"],
          "text-max-width": 8,
        },
        paint: {
          "text-color": p.cityText,
          "text-halo-color": p.textHalo,
          "text-halo-width": 1.5,
        },
      },
      // 동/마을 라벨
      {
        id: "place-village",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "place",
        filter: ["in", "class", "village", "hamlet", "suburb"],
        minzoom: 12,
        layout: {
          "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
          "text-size": ["interpolate", ["linear"], ["zoom"], 12, 10, 16, 13],
          "text-font": ["Pretendard Regular"],
          "text-max-width": 6,
        },
        paint: {
          "text-color": p.villageText,
          "text-halo-color": p.textHalo,
          "text-halo-width": 1,
        },
      },
      // 도로명 라벨
      {
        id: "road-label",
        type: "symbol",
        source: "openmaptiles",
        "source-layer": "transportation_name",
        minzoom: 14,
        layout: {
          "text-field": ["coalesce", ["get", "name:ko"], ["get", "name"]],
          "text-size": 10,
          "text-font": ["Pretendard Regular"],
          "symbol-placement": "line",
          "text-rotation-alignment": "map",
        },
        paint: {
          "text-color": p.roadLabelText,
          "text-halo-color": p.textHalo,
          "text-halo-width": 1,
        },
      },
    ],
  };
}

/** 테마별 스타일 객체 (Light / Dark / Positron). */
export const basemapStyles: Record<BasemapStyleId, StyleSpecification> = {
  light: buildBasemapStyle(PALETTES.light),
  dark: buildBasemapStyle(PALETTES.dark),
  positron: buildBasemapStyle(PALETTES.positron),
  korean: buildBasemapStyle(PALETTES.korean),
};

/** UI 셀렉터용 테마 목록. */
export const BASEMAP_STYLES: { id: BasemapStyleId; label: string }[] = [
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },    
  { id: "positron", label: "Positron" },
  { id: "korean", label: "Korean" },
];

/** 하위 호환용 기본(Light) 스타일. */
export const basemapStyle = basemapStyles.light;
