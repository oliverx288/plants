package com.savia.web;

import com.savia.dto.AuthResponseDTO;
import com.savia.dto.LoginDTO;
import com.savia.dto.RegistroDTO;
import com.savia.service.AuthService;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public AuthResponseDTO registro(@Valid @RequestBody RegistroDTO dto) {
        return authService.registrar(dto);
    }

    @PostMapping("/login")
    public AuthResponseDTO login(@Valid @RequestBody LoginDTO dto) {
        return authService.login(dto);
    }
}
