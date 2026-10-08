package com.rodovialanches.util;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;

/**
 * Hash de senha para os acessos ao sistema.
 *
 * - SHA-256 com salt aleatório de 16 bytes por usuário (impede rainbow tables
 *   e faz que duas senhas iguais gerem hashes diferentes).
 * - Formato gravado no banco: "saltEmHex$hashEmHex".
 * - A senha em texto puro NUNCA é persistida nem devolvida pela API.
 */
public final class SenhaUtil {

    private SenhaUtil() {
        // classe de método estático: não instanciável
    }

    /** Gera o hash completo (salt + digest) para gravar no banco. */
    public static String criar(String senhaPura) {
        byte[] salt = new byte[16];
        new SecureRandom().nextBytes(salt);
        String saltHex = paraHex(salt);
        return saltHex + "$" + hash(saltHex, senhaPura);
    }

    /** Confere se a senha digitada corresponde ao hash armazenado. */
    public static boolean confere(String senhaArmazenada, String senhaPura) {
        if (senhaArmazenada == null || senhaPura == null) return false;
        String[] partes = senhaArmazenada.split("\\$", 2);
        if (partes.length != 2) return false;
        return partes[1].equals(hash(partes[0], senhaPura));
    }

    /** true se o usuário já tem uma senha cadastrada. */
    public static boolean temSenha(String senhaArmazenada) {
        return senhaArmazenada != null && !senhaArmazenada.isBlank();
    }

    private static String hash(String saltHex, String senhaPura) {
        try {
            MessageDigest md = MessageDigest.getInstance("SHA-256");
            md.update(saltHex.getBytes(StandardCharsets.UTF_8));
            return paraHex(md.digest(senhaPura.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 indisponível na JVM", e);
        }
    }

    private static String paraHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder(bytes.length * 2);
        for (byte b : bytes) sb.append(String.format("%02x", b));
        return sb.toString();
    }
}
