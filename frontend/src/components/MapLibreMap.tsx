import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import { Protocol } from "pmtiles";
import "maplibre-gl/dist/maplibre-gl.css";
import { basemapStyles, type BasemapStyleId } from "../styles/basemap-style";

// pmtiles:// 프로토콜은 전역에 1회만 등록한다.
let protocolRegistered = false;
function registerPmtilesProtocol() {
  if (protocolRegistered) return;
  const protocol = new Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tile);
  protocolRegistered = true;
}

interface Props {
  styleId: BasemapStyleId;
}

/** MapLibre GL JS 로 공유 스타일을 렌더링한다. */
export default function MapLibreMap({ styleId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    registerPmtilesProtocol();

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: basemapStyles[styleId],
      center: [127.5, 36],
      zoom: 7,
      attributionControl: { compact: true },
    });
    map.addControl(new maplibregl.NavigationControl(), "top-left");

    return () => map.remove();
  }, [styleId]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
