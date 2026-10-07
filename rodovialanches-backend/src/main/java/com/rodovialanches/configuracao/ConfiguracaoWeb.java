package com.rodovialanches.configuracao;

import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Permite que o frontend rodando em http://localhost:5173 chame os endpoints /api/**.
 * Sem isso, o navegador bloquearia as requisições por política de mesma origem.
 *
 * IMPORTANTE: Não usar @EnableWebMvc aqui. Essa anotação desativa toda a
 * autoconfiguração MVC do Spring Boot, incluindo o registro do JavaTimeModule
 * do Jackson — o que faria LocalDateTime ser serializado como array de inteiros
 * em vez de string ISO. Implementar apenas WebMvcConfigurer é suficiente para
 * adicionar regras de CORS sem perder o resto da configuração automática.
 */
@Configuration
public class ConfiguracaoWeb implements WebMvcConfigurer {
    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins("http://localhost:5173")
                .allowedMethods("GET", "POST", "PUT", "DELETE", "OPTIONS")
                .allowedHeaders("*")
                .allowCredentials(true);
    }
}
