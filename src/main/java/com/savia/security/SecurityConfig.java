package com.savia.security;

import com.savia.repository.UsuarioRepository;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http, JwtService jwtService, UsuarioRepository usuarioRepository)
            throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .formLogin(form -> form.disable())
                .httpBasic(basic -> basic.disable())
                .exceptionHandling(handling -> handling
                        .authenticationEntryPoint((request, response, ex) -> {
                            response.setStatus(401);
                            response.setCharacterEncoding("UTF-8");
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"error\":\"Es necesario iniciar sesión\"}");
                        })
                        .accessDeniedHandler((request, response, ex) -> {
                            response.setStatus(403);
                            response.setCharacterEncoding("UTF-8");
                            response.setContentType(MediaType.APPLICATION_JSON_VALUE);
                            response.getWriter().write("{\"error\":\"No tienes permiso para hacer esto\"}");
                        })
                )
                .authorizeHttpRequests(auth -> auth
                        // páginas y recursos estáticos
                        .requestMatchers(HttpMethod.GET, "/", "/login", "/registro", "/*.html", "/css/**", "/js/**", "/uploads/**", "/plantas/**")
                        .permitAll()
                        // registro y login
                        .requestMatchers(HttpMethod.POST, "/api/auth/**").permitAll()
                        // pasaporte público de cada planta: visible por cualquiera con el enlace
                        .requestMatchers(HttpMethod.GET,
                                "/api/plantas/*", "/api/plantas/*/acciones", "/api/plantas/*/diario", "/api/plantas/*/estadisticas")
                        .permitAll()
                        // el resto requiere sesión: listado propio, crear/editar/eliminar, registrar cuidados, subir fotos
                        .anyRequest().authenticated()
                )
                .addFilterBefore(new JwtAuthenticationFilter(jwtService, usuarioRepository), UsernamePasswordAuthenticationFilter.class);

        return http.build();
    }
}
