import { useState } from "react";
import MapLibreMap from "./components/MapLibreMap";
import OpenLayersMap from "./components/OpenLayersMap";
import { BASEMAP_STYLES, type BasemapStyleId } from "./styles/basemap-style";

type Engine = "maplibre" | "openlayers";

const ENGINES: { id: Engine; label: string }[] = [
  { id: "maplibre", label: "MapLibre GL" },
  { id: "openlayers", label: "OpenLayers" },
];

const groupStyle: React.CSSProperties = {
  display: "flex",
  gap: 4,
  padding: 4,
  background: "rgba(255,255,255,0.92)",
  borderRadius: 8,
  boxShadow: "0 1px 4px rgba(0,0,0,0.25)",
};

function btnStyle(active: boolean): React.CSSProperties {
  return {
    border: "none",
    cursor: "pointer",
    padding: "6px 12px",
    borderRadius: 6,
    fontSize: 13,
    fontWeight: active ? 700 : 500,
    color: active ? "#fff" : "#333",
    background: active ? "#2563eb" : "transparent",
  };
}

export default function App() {
  const [engine, setEngine] = useState<Engine>("maplibre");
  const [styleId, setStyleId] = useState<BasemapStyleId>("light");

  return (
    <div style={{ position: "relative", height: "100%", width: "100%" }}>
      {/* key 에 엔진+스타일을 넣어 전환 시 컴포넌트를 재마운트하여 이전 렌더러를 깨끗이 정리 */}
      {engine === "maplibre" ? (
        <MapLibreMap key={`ml-${styleId}`} styleId={styleId} />
      ) : (
        <OpenLayersMap key={`ol-${styleId}`} styleId={styleId} />
      )}

      <div
        style={{
          position: "absolute",
          top: 12,
          right: 12,
          zIndex: 10,
          display: "flex",
          flexDirection: "column",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        {/* 렌더링 엔진 토글 */}
        <div style={groupStyle}>
          {ENGINES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setEngine(id)}
              style={btnStyle(engine === id)}
            >
              {label}
            </button>
          ))}
        </div>

        {/* 테마(스타일) 셀렉터 */}
        <div style={groupStyle}>
          {BASEMAP_STYLES.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => setStyleId(id)}
              style={btnStyle(styleId === id)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
