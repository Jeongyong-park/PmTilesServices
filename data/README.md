# Docker 볼륨 데이터 (host)

`docker compose` 실행 시 이 디렉터리의 PMTiles 파일을 컨테이너에 읽기전용 마운트한다.

```
data/south-korea.pmtiles   # 여기 파일을 두면 이미지 재빌드 없이 교체 가능
```

compose 매핑: `./data/south-korea.pmtiles → /data/south-korea.pmtiles (ro)`,
컨테이너는 `PMTILES_PATH=/data/south-korea.pmtiles` 로 이 파일을 읽는다.

글리프(Pretendard PBF)는 이미지에 포함(classpath)되므로 볼륨 불필요. PMTiles 만 외부.
