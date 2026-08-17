package com.savia.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * Resuelve las URLs "bonitas" que llevan las etiquetas NFC (p. ej.
 * /plantas/lola) a las páginas estáticas correspondientes, para que el
 * JavaScript de cada página lea el slug directamente de la URL.
 */
@Controller
public class WebViewController {

    @GetMapping("/plantas/nueva")
    public String nuevaPlanta() {
        return "forward:/planta-form.html";
    }

    @GetMapping("/plantas/{slug}/editar")
    public String editarPlanta() {
        return "forward:/planta-form.html";
    }

    @GetMapping("/plantas/{slug}")
    public String verPlanta() {
        return "forward:/planta.html";
    }
}
