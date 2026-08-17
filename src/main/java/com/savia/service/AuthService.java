package com.savia.service;

import com.savia.domain.Usuario;
import com.savia.dto.AuthResponseDTO;
import com.savia.dto.LoginDTO;
import com.savia.dto.RegistroDTO;
import com.savia.repository.UsuarioRepository;
import com.savia.security.JwtService;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AuthService {

    private final UsuarioRepository usuarioRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(UsuarioRepository usuarioRepository, PasswordEncoder passwordEncoder, JwtService jwtService) {
        this.usuarioRepository = usuarioRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponseDTO registrar(RegistroDTO dto) {
        String email = dto.getEmail().trim().toLowerCase();

        if (usuarioRepository.existsByEmail(email)) {
            throw new IllegalArgumentException("Ya existe una cuenta con ese email");
        }

        Usuario usuario = Usuario.builder()
                .nombre(dto.getNombre().trim())
                .email(email)
                .passwordHash(passwordEncoder.encode(dto.getPassword()))
                .build();

        usuario = usuarioRepository.save(usuario);
        return respuesta(usuario);
    }

    public AuthResponseDTO login(LoginDTO dto) {
        Usuario usuario = usuarioRepository.findByEmail(dto.getEmail().trim().toLowerCase())
                .orElseThrow(() -> new BadCredentialsException("Email o contraseña incorrectos"));

        if (!passwordEncoder.matches(dto.getPassword(), usuario.getPasswordHash())) {
            throw new BadCredentialsException("Email o contraseña incorrectos");
        }

        return respuesta(usuario);
    }

    private AuthResponseDTO respuesta(Usuario usuario) {
        String token = jwtService.generar(usuario.getId(), usuario.getEmail(), usuario.getNombre());
        return new AuthResponseDTO(token, usuario.getId(), usuario.getNombre(), usuario.getEmail());
    }
}
