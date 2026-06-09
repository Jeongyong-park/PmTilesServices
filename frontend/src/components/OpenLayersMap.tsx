import { useEffect, useRef } from "react";
import Map from "ol/Map";
import View from "ol/View";
import VectorTileLayer from "ol/layer/VectorTile";
import { fromLonLat } from "ol/proj";
import { PMTilesVectorSource } from "ol-pmtiles";
import { applyStyle, applyBackground } from "ol-mapbox-style";
import "ol/ol.css";
import { basemapStyles, type BasemapStyleId } from "../styles/basemap-style";

interface Props {
  styleId: BasemapStyleId;
}

/**
 * OpenLayers 로 동일한 공유 스타일을 렌더링한다.
 *
 * ol-pmtiles 로 PMTiles 벡터 소스를 만들고, ol-mapbox-style 의 applyStyle 로 MapLibre
 * 스타일 스펙을 OpenLayers VectorTileLayer 에 적용한다. (글리프는 스타일의 glyphs URL 에서 로드)
 */
export default function OpenLayersMap({ styleId }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    let disposed = false;

    const olStyle = basemapStyles[styleId];

    const source = new PMTilesVectorSource({
      url: "/api/tiles/south-korea.pmtiles",
    });

    const layer = new VectorTileLayer({ declutter: true, source });

    const map = new Map({
      target: containerRef.current,
      layers: [layer],
      view: new View({
        center: fromLonLat([127.5, 36]),
        zoom: 7,
      }),
    });

    // 배경(background) 레이어 적용 — applyStyle 은 feature 레이어만 처리하므로 별도 호출 필요.
    // 누락 시 흰 페이지 위에 흰색 도로(#ffffff)가 보이지 않는다.
    applyBackground(map, olStyle as never).catch((err) => {
      if (!disposed) console.error("applyBackground 실패:", err);
    });

    // "openmaptiles" 소스 레이어들을 OL 레이어에 적용 (폰트 변환본 사용).
    // updateSource:false — 스타일의 source url 이 pmtiles:// 스킴이라 OL Fetch 로는 못 가져온다.
    // 이미 만든 PMTilesVectorSource 를 그대로 쓰도록 source 갱신을 막는다.
    applyStyle(layer, olStyle as never, {
      source: "openmaptiles",
      updateSource: false,
    }).catch((err) => {
      if (!disposed) console.error("applyStyle 실패:", err);
    });

    return () => {
      disposed = true;
      map.setTarget(undefined);
      map.dispose();
    };
  }, [styleId]);

  return <div ref={containerRef} style={{ position: "absolute", inset: 0 }} />;
}
