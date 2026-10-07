package com.rodovialanches.controlador;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ControllerAdvice;
import org.springframework.web.bind.annotation.ExceptionHandler;

/**
 * Tratador global de erros da API.
 * Converte exceções de validação (IllegalArgumentException) em HTTP 400
 * com a mensagem em texto puro, para que o frontend mostre direto ao usuário.
 */
@ControllerAdvice
public class TratadorDeErrosApi {

    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> tratarArgumentoInvalido(IllegalArgumentException ex) {
        return ResponseEntity.status(HttpStatus.BAD_REQUEST)
                .contentType(MediaType.parseMediaType("text/plain; charset=UTF-8"))
                .body(ex.getMessage());
    }
}
