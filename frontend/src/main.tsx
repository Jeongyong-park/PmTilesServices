import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
// OpenLayers 라벨용 웹폰트 — MapLibre 는 서버 글리프(SDF)를 쓰지만 OL(ol-mapbox-style)은
// 브라우저 캔버스 폰트로 렌더링하므로 Pretendard 를 로드한다. dynamic-subset 은 unicode-range 별
// 작은 woff2 로 분할되어 Vite 가 로컬 번들 → 완전 오프라인 동작. family="Pretendard" (weight 100~900).
import "pretendard/dist/web/static/pretendard-dynamic-subset.css";
import "./index.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
