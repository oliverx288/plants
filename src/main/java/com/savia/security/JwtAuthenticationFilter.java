package com.savia.security;

import com.savia.domain.Usuario;
import com.savia.repository.UsuarioRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.List;
import java.util.Optional;

/**
 * Lee el token Bearer si está presente y, de ser válido, autentica la
 * petición. Si no hay token o no es válido, la petición sigue como anónima
 * — son las reglas de autorización las que deciden qué rutas lo requieren.
 */
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private final JwtService jwtService;
    private final UsuarioRepository usuarioRepository;

    public JwtAuthenticationFilter(JwtService jwtService, UsuarioRepository usuarioRepository) {
        this.jwtService = jwtService;
        this.usuarioRepository = usuarioRepository;
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {

        String header = request.getHeader("Authorization");

        if (header != null && header.startsWith("Bearer ")) {
            String token = header.substring(7);
            Optional<Long> usuarioId = jwtService.extraerUsuarioId(token);

            if (usuarioId.isPresent() && SecurityContextHolder.getContext().getAuthentication() == null) {
                Optional<Usuario> usuario = usuarioRepository.findById(usuarioId.get());
                usuario.ifPresent(u -> {
                    var authentication = new UsernamePasswordAuthenticationToken(u, null, List.of());
                    SecurityContextHolder.getContext().setAuthentication(authentication);
                });
            }
        }

        chain.doFilter(request, response);
    }
}
