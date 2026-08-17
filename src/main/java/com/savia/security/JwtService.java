package com.savia.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.Optional;

@Component
public class JwtService {

    private final SecretKey key;
    private final long expirationMillis;

    public JwtService(@Value("${app.jwt-secret}") String secret,
                       @Value("${app.jwt-expiration-hours}") long expirationHours) {
        this.key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMillis = expirationHours * 60 * 60 * 1000;
    }

    public String generar(Long usuarioId, String email, String nombre) {
        Date ahora = new Date();
        Date expira = new Date(ahora.getTime() + expirationMillis);

        return Jwts.builder()
                .subject(String.valueOf(usuarioId))
                .claim("email", email)
                .claim("nombre", nombre)
                .issuedAt(ahora)
                .expiration(expira)
                .signWith(key)
                .compact();
    }

    public Optional<Long> extraerUsuarioId(String token) {
        try {
            Claims claims = Jwts.parser().verifyWith(key).build().parseSignedClaims(token).getPayload();
            return Optional.of(Long.valueOf(claims.getSubject()));
        } catch (JwtException | IllegalArgumentException e) {
            return Optional.empty();
        }
    }
}
