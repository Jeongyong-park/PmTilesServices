package kr.pe.jypark.example.controller;

import java.io.IOException;
import java.io.InputStream;
import java.io.RandomAccessFile;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * PMTiles 배경지도 서빙 API.
 *
 * <p>classpath 리소스 {@code data/south-korea.pmtiles} 를 HTTP Range Request 로 서빙한다.
 * MapLibre GL JS + pmtiles 프로토콜 및 OpenLayers + ol-pmtiles 가 필요한 바이트 구간만 요청한다.
 *
 * <p>오프라인 라벨 표시를 위해 글리프(폰트) PBF 도 classpath 에서 함께 서빙한다.
 */
@Slf4j
@RestController
@RequestMapping("/api/tiles")
public class TileApiController {

    private static final MediaType APPLICATION_PROTOBUF =
            MediaType.parseMediaType("application/x-protobuf");

    private static final String PMTILES_RESOURCE = "data/south-korea.pmtiles";

    /** 단일 Range 요청 최대 크기 (100MB) — 악의적 대용량 요청 방지 */
    private static final long MAX_RANGE_SIZE = 100L * 1024 * 1024;

    /**
     * 외부 파일시스템 PMTiles 경로 (Docker 볼륨 매핑용). 비어 있으면 classpath 리소스로 폴백.
     * 예: {@code PMTILES_PATH=/data/south-korea.pmtiles}
     */
    @org.springframework.beans.factory.annotation.Value("${pmtiles.path:}")
    private String configuredPmtilesPath;

    /** classpath 리소스를 실제 파일 경로로 1회 해석한 결과 (jar 실행 시 임시 파일). */
    private volatile Path cachedPmtilesPath;

    /**
     * PMTiles 파일 서빙 (HTTP Range Request 지원).
     *
     * @param rangeHeader HTTP Range 헤더 (예: "bytes=0-1023")
     */
    @GetMapping("/south-korea.pmtiles")
    public ResponseEntity<byte[]> servePmtiles(
            @RequestHeader(value = "Range", required = false) String rangeHeader) {
        try {
            Path pmtilesPath = resolvePmtilesPath();
            if (pmtilesPath == null || !Files.exists(pmtilesPath)) {
                return ResponseEntity.notFound().build();
            }
            return servePmtilesFile(pmtilesPath, rangeHeader);
        } catch (IOException e) {
            // 클라이언트 연결 끊김 등 — Content-Type(application/x-protobuf) 충돌 방지를 위해 여기서 처리
            log.debug("PMTiles 서빙 중 I/O 오류: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * 글리프(폰트) PBF 파일 서빙 — 오프라인 환경에서도 지명 라벨을 표시하기 위해 로컬에서 제공한다.
     *
     * @param fontstack 폰트명 (예: "Noto Sans Regular")
     * @param range 유니코드 범위 (예: "0-255")
     */
    @GetMapping("/fonts/{fontstack}/{range}.pbf")
    public ResponseEntity<byte[]> serveGlyphs(
            @PathVariable String fontstack, @PathVariable String range) {
        // Path Traversal 방지 — ".." 또는 "/" 포함 시 400 반환
        if (containsTraversal(fontstack) || containsTraversal(range)) {
            return ResponseEntity.badRequest().build();
        }

        try {
            // MapLibre 는 text-font 스택을 콤마로 이어("A,B") 요청한다. 단순 서버이므로
            // 콤마로 분리해 존재하는 첫 폰트 폴더의 글리프를 서빙한다(클라이언트 합성 대신).
            ClassPathResource resource = null;
            for (String font : fontstack.split(",")) {
                String name = font.trim();
                if (name.isEmpty()) {
                    continue;
                }
                ClassPathResource candidate =
                        new ClassPathResource("data/fonts/" + name + "/" + range + ".pbf");
                if (candidate.exists()) {
                    resource = candidate;
                    break;
                }
            }
            if (resource == null) {
                return ResponseEntity.notFound().build();
            }

            byte[] data;
            try (InputStream is = resource.getInputStream()) {
                data = is.readAllBytes();
            }

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(APPLICATION_PROTOBUF);
            headers.setCacheControl(CacheControl.maxAge(Duration.ofDays(30)).cachePublic());
            headers.setContentLength(data.length);
            return new ResponseEntity<>(data, headers, HttpStatus.OK);
        } catch (IOException e) {
            log.debug("글리프 서빙 중 I/O 오류: {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    private boolean containsTraversal(String value) {
        return value.contains("..") || value.contains("/") || value.contains("\\");
    }

    /**
     * classpath 리소스를 실제 파일 경로로 해석한다. 1회 계산 후 캐시한다.
     *
     * <p>exploded classpath(개발/IDE) 에서는 리소스를 그대로 파일로 접근하고, jar 패키징 실행 시에는
     * 임시 파일로 복사하여 {@link RandomAccessFile} 의 효율적인 seek 를 가능하게 한다.
     */
    private Path resolvePmtilesPath() throws IOException {
        // 1순위: 설정된 외부 경로(볼륨). 파일시스템 직접 접근이라 RandomAccessFile seek 효율적.
        if (configuredPmtilesPath != null && !configuredPmtilesPath.isBlank()) {
            return Paths.get(configuredPmtilesPath);
        }
        // 2순위: classpath 리소스 폴백 (1회 해석 후 캐시)
        Path local = cachedPmtilesPath;
        if (local != null) {
            return local;
        }
        synchronized (this) {
            if (cachedPmtilesPath != null) {
                return cachedPmtilesPath;
            }
            ClassPathResource resource = new ClassPathResource(PMTILES_RESOURCE);
            if (!resource.exists()) {
                log.warn("PMTiles 리소스를 찾을 수 없음: classpath:{}", PMTILES_RESOURCE);
                return null;
            }
            Path resolved;
            try {
                // exploded classpath 에서는 실제 파일 접근 가능
                resolved = resource.getFile().toPath();
            } catch (IOException notAFile) {
                // jar 내부 리소스 — 임시 파일로 복사 (seek 효율을 위해)
                Path temp = Files.createTempFile("south-korea-", ".pmtiles");
                temp.toFile().deleteOnExit();
                try (InputStream is = resource.getInputStream()) {
                    Files.copy(is, temp, java.nio.file.StandardCopyOption.REPLACE_EXISTING);
                }
                resolved = temp;
                log.info("PMTiles 리소스를 임시 파일로 복사: {}", temp);
            }
            cachedPmtilesPath = resolved;
            return resolved;
        }
    }

    private ResponseEntity<byte[]> servePmtilesFile(Path pmtilesPath, String rangeHeader)
            throws IOException {
        long fileSize = Files.size(pmtilesPath);

        HttpHeaders headers = new HttpHeaders();
        headers.set("Accept-Ranges", "bytes");
        headers.setCacheControl(CacheControl.maxAge(Duration.ofDays(1)).cachePublic());
        headers.setContentType(APPLICATION_PROTOBUF);

        if (rangeHeader != null && rangeHeader.startsWith("bytes=")) {
            return handleRangeRequest(pmtilesPath, rangeHeader, fileSize, headers);
        }

        // 비-Range 요청: 전체 본문 반환 (보일러플레이트 — 파일 크기 무관하게 단순 처리)
        byte[] data = Files.readAllBytes(pmtilesPath);
        headers.setContentLength(data.length);
        return new ResponseEntity<>(data, headers, HttpStatus.OK);
    }

    private ResponseEntity<byte[]> handleRangeRequest(
            Path pmtilesPath, String rangeHeader, long fileSize, HttpHeaders headers)
            throws IOException {

        String rangeValue = rangeHeader.substring("bytes=".length());
        String[] parts = rangeValue.split("-");

        long start;
        long end;
        try {
            boolean hasStart = parts.length > 0 && !parts[0].isEmpty();
            boolean hasEnd = parts.length > 1 && !parts[1].isEmpty();

            if (!hasStart && !hasEnd) {
                return rangeNotSatisfiable(headers, fileSize);
            }

            if (hasStart) {
                start = Long.parseLong(parts[0]);
                end = hasEnd ? Long.parseLong(parts[1]) : fileSize - 1;
            } else {
                long suffixLength = Long.parseLong(parts[1]);
                if (suffixLength <= 0) {
                    return rangeNotSatisfiable(headers, fileSize);
                }
                start = (suffixLength >= fileSize) ? 0 : fileSize - suffixLength;
                end = fileSize - 1;
            }
        } catch (NumberFormatException e) {
            return rangeNotSatisfiable(headers, fileSize);
        }

        if (start >= fileSize) {
            return rangeNotSatisfiable(headers, fileSize);
        }

        // RFC 9110: 마지막 바이트를 넘긴 end 값은 파일 끝으로 보정한다.
        end = Math.min(end, fileSize - 1);

        if (start > end) {
            return rangeNotSatisfiable(headers, fileSize);
        }

        long rangeSize = end - start + 1;
        if (rangeSize <= 0 || rangeSize > MAX_RANGE_SIZE) {
            return rangeNotSatisfiable(headers, fileSize);
        }

        int length = (int) rangeSize;
        byte[] data = new byte[length];

        try (RandomAccessFile raf = new RandomAccessFile(pmtilesPath.toFile(), "r")) {
            raf.seek(start);
            raf.readFully(data);
        }

        headers.set("Content-Range", String.format("bytes %d-%d/%d", start, end, fileSize));
        headers.setContentLength(length);
        return new ResponseEntity<>(data, headers, HttpStatus.PARTIAL_CONTENT);
    }

    private ResponseEntity<byte[]> rangeNotSatisfiable(HttpHeaders headers, long fileSize) {
        headers.set("Content-Range", "bytes */" + fileSize);
        return new ResponseEntity<>(headers, HttpStatus.REQUESTED_RANGE_NOT_SATISFIABLE);
    }
}
