package com.rodovialanches;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/**
 * Ponto de entrada da aplicação Rodovia Lanches.
 * O Spring Boot inicia o servidor embarcado (Tomcat) e registra todos os
 * @RestController, @Service e @Repository automaticamente.
 */
@SpringBootApplication
public class RodoviaLanchesAplicacao {
    public static void main(String[] args) {
        SpringApplication.run(RodoviaLanchesAplicacao.class, args);
    }
}
