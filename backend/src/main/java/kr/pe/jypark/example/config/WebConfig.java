package kr.pe.jypark.example.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * 개발 환경 CORS 설정.
 *
 * <p>Vite dev 서버(:5173)는 {@code /api} 요청을 백엔드(:8080)로 프록시한다. 프록시를 거치면 동일 출처이지만,
 * 직접 호출 시나리오를 위해 dev origin 을 허용한다. 운영에서 프론트엔드를 동일 출처로 번들링하면 이 설정은 무해하다.
 */
@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "HEAD", "OPTIONS")
                .allowedHeaders("*")
                .exposedHeaders("Accept-Ranges", "Content-Range", "Content-Length")
                .maxAge(3600);
    }
}
