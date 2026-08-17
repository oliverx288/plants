package com.savia.security;

import com.savia.domain.Usuario;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

/** Resuelve el usuario autenticado (si lo hay) a partir del contexto de seguridad. */
@Component
public class UsuarioActualProvider {

    public Optional<Usuario> obtener() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof Usuario usuario)) {
            return Optional.empty();
        }
        return Optional.of(usuario);
    }

    public Usuario requerir() {
        return obtener().orElseThrow(() ->
                new org.springframework.security.access.AccessDeniedException("Es necesario iniciar sesión"));
    }
}
