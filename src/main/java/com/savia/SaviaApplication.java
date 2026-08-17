package com.savia;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.boot.autoconfigure.security.servlet.UserDetailsServiceAutoConfiguration;

// La autenticación es 100% JWT (ver SecurityConfig); se excluye la
// auto-configuración de usuario en memoria que Spring Security genera
// por defecto cuando no encuentra un UserDetailsService propio.
@SpringBootApplication(exclude = UserDetailsServiceAutoConfiguration.class)
public class SaviaApplication {
    public static void main(String[] args) {
        SpringApplication.run(SaviaApplication.class, args);
    }
}
