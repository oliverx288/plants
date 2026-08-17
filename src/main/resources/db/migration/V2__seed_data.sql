-- Datos de ejemplo: tres plantas en distintos estados para poder ver
-- de inmediato el dashboard, el historial, el diario y las estadísticas
-- funcionando con contenido real.

INSERT INTO plantas
    (slug, nombre, especie, descripcion, fecha_adopcion, ubicacion, luz_necesaria,
     frecuencia_riego_dias, humedad_recomendada, temperatura_min, temperatura_max,
     foto_principal_url, estado_manual, creado_en, actualizado_en)
VALUES
    ('lola', 'Lola', 'Monstera deliciosa',
     'Le encanta trepar por el tutor de fibra y sacar hojas cada vez más grandes. La más presumida de la colección.',
     '2024-03-10', 'Salón, junto a la ventana', 'MEDIA', 7, 'Media-alta', 18, 27,
     NULL, NULL, now(), now()),

    ('rex', 'Rex', 'Ficus lyrata',
     'Hojas grandes en forma de violín, algo dramáticas: en cuanto le falta agua un par de días lo hace notar.',
     '2023-11-02', 'Pasillo', 'ALTA', 9, 'Media', 16, 26,
     NULL, NULL, now(), now()),

    ('nube', 'Nube', 'Pilea peperomioides',
     'Pequeña y resistente, produce hijuelos cada pocos meses. Recientemente ha dado algún problema de plaga.',
     '2025-01-20', 'Estudio', 'MEDIA', 6, 'Media', 15, 24,
     NULL, 'PROBLEMAS', now(), now());

-- ---------------------------------------------------------------------
-- Lola — riego regular, estado saludable
-- ---------------------------------------------------------------------
INSERT INTO acciones_cuidado (planta_id, tipo, fecha, notas, foto_url, ubicacion_nueva, creado_en) VALUES
((SELECT id FROM plantas WHERE slug = 'lola'), 'TRASPLANTE', now() - interval '70 days', 'Cambio a una maceta de 24cm con drenaje mejorado.', NULL, NULL, now() - interval '70 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'FOTO', now() - interval '63 days', 'Primeras hojas nuevas tras el trasplante.', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+CjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlM2VjZGYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjN2Q2YmYiLz4KPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2cpIi8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVjN2E2OCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIG9wYWNpdHk9IjAuNSI+CjxwYXRoIGQ9Ik0yNjAgNDgwQzI2MCAzMDAgMzgwIDE2MCA1NjAgMTQwIi8+CjxwYXRoIGQ9Ik0yNjAgNDgwQzMxMCAzODAgNDAwIDMyMCA1MjAgMjkwIi8+CjwvZz4KPGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2M2YTRmIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xODAgNDYwQzE4MCAyNjAgMzIwIDEyMCA1ODAgOTZjMCAyMjYtMTU4IDM0NC00MDAgMzY0WiIvPgo8cGF0aCBkPSJNMTgwIDQ2MGM2MC0xMzAgMTY4LTIxNCAyOTItMjU2Ii8+CjwvZz4KPC9zdmc+Cg==', NULL, now() - interval '63 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'RIEGO', now() - interval '55 days', NULL, NULL, NULL, now() - interval '55 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'ABONADO', now() - interval '48 days', 'Abono líquido para plantas de interior, dosis media.', NULL, NULL, now() - interval '48 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'RIEGO', now() - interval '41 days', NULL, NULL, NULL, now() - interval '41 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'PODA', now() - interval '35 days', 'Retirada una hoja amarillenta de la base.', NULL, NULL, now() - interval '35 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'FOTO', now() - interval '34 days', 'Ya se nota más frondosa.', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+CjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlM2VjZGYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjN2Q2YmYiLz4KPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2cpIi8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVjN2E2OCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIG9wYWNpdHk9IjAuNSI+CjxwYXRoIGQ9Ik0yNjAgNDgwQzI2MCAzMDAgMzgwIDE2MCA1NjAgMTQwIi8+CjxwYXRoIGQ9Ik0yNjAgNDgwQzMxMCAzODAgNDAwIDMyMCA1MjAgMjkwIi8+CjwvZz4KPGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2M2YTRmIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xODAgNDYwQzE4MCAyNjAgMzIwIDEyMCA1ODAgOTZjMCAyMjYtMTU4IDM0NC00MDAgMzY0WiIvPgo8cGF0aCBkPSJNMTgwIDQ2MGM2MC0xMzAgMTY4LTIxNCAyOTItMjU2Ii8+CjwvZz4KPC9zdmc+Cg==', NULL, now() - interval '34 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'RIEGO', now() - interval '27 days', NULL, NULL, NULL, now() - interval '27 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'RIEGO', now() - interval '20 days', NULL, NULL, NULL, now() - interval '20 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'NOTA', now() - interval '15 days', 'Ha sacado una hoja nueva con un fenestrado precioso.', NULL, NULL, now() - interval '15 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'FOTO', now() - interval '14 days', 'La hoja fenestrada ya totalmente abierta.', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+CjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlM2VjZGYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjN2Q2YmYiLz4KPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2cpIi8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVjN2E2OCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIG9wYWNpdHk9IjAuNSI+CjxwYXRoIGQ9Ik0yNjAgNDgwQzI2MCAzMDAgMzgwIDE2MCA1NjAgMTQwIi8+CjxwYXRoIGQ9Ik0yNjAgNDgwQzMxMCAzODAgNDAwIDMyMCA1MjAgMjkwIi8+CjwvZz4KPGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2M2YTRmIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xODAgNDYwQzE4MCAyNjAgMzIwIDEyMCA1ODAgOTZjMCAyMjYtMTU4IDM0NC00MDAgMzY0WiIvPgo8cGF0aCBkPSJNMTgwIDQ2MGM2MC0xMzAgMTY4LTIxNCAyOTItMjU2Ii8+CjwvZz4KPC9zdmc+Cg==', NULL, now() - interval '14 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'RIEGO', now() - interval '13 days', NULL, NULL, NULL, now() - interval '13 days'),
((SELECT id FROM plantas WHERE slug = 'lola'), 'RIEGO', now() - interval '6 days', NULL, NULL, NULL, now() - interval '6 days');

-- ---------------------------------------------------------------------
-- Rex — riego algo atrasado, estado de atención
-- ---------------------------------------------------------------------
INSERT INTO acciones_cuidado (planta_id, tipo, fecha, notas, foto_url, ubicacion_nueva, creado_en) VALUES
((SELECT id FROM plantas WHERE slug = 'rex'), 'RIEGO', now() - interval '60 days', NULL, NULL, NULL, now() - interval '60 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'ABONADO', now() - interval '52 days', 'Abono de liberación lenta.', NULL, NULL, now() - interval '52 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'RIEGO', now() - interval '50 days', NULL, NULL, NULL, now() - interval '50 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'FOTO', now() - interval '49 days', 'Hoja nueva desplegándose junto a la ventana.', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+CjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlM2VjZGYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjN2Q2YmYiLz4KPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2cpIi8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVjN2E2OCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIG9wYWNpdHk9IjAuNSI+CjxwYXRoIGQ9Ik0yNjAgNDgwQzI2MCAzMDAgMzgwIDE2MCA1NjAgMTQwIi8+CjxwYXRoIGQ9Ik0yNjAgNDgwQzMxMCAzODAgNDAwIDMyMCA1MjAgMjkwIi8+CjwvZz4KPGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2M2YTRmIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xODAgNDYwQzE4MCAyNjAgMzIwIDEyMCA1ODAgOTZjMCAyMjYtMTU4IDM0NC00MDAgMzY0WiIvPgo8cGF0aCBkPSJNMTgwIDQ2MGM2MC0xMzAgMTY4LTIxNCAyOTItMjU2Ii8+CjwvZz4KPC9zdmc+Cg==', NULL, now() - interval '49 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'RIEGO', now() - interval '41 days', NULL, NULL, NULL, now() - interval '41 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'CAMBIO_UBICACION', now() - interval '33 days', 'Movido un poco más lejos de la corriente de aire de la puerta.', NULL, 'Pasillo, junto al armario', now() - interval '33 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'RIEGO', now() - interval '32 days', NULL, NULL, NULL, now() - interval '32 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'RIEGO', now() - interval '21 days', NULL, NULL, NULL, now() - interval '21 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'NOTA', now() - interval '12 days', 'Un par de hojas con manchas marrones en el borde, vigilar el riego.', NULL, NULL, now() - interval '12 days'),
((SELECT id FROM plantas WHERE slug = 'rex'), 'RIEGO', now() - interval '11 days', NULL, NULL, NULL, now() - interval '11 days');

-- ---------------------------------------------------------------------
-- Nube — riego reciente, pero con un problema activo (plaga)
-- ---------------------------------------------------------------------
INSERT INTO acciones_cuidado (planta_id, tipo, fecha, notas, foto_url, ubicacion_nueva, creado_en) VALUES
((SELECT id FROM plantas WHERE slug = 'nube'), 'TRASPLANTE', now() - interval '58 days', 'Separados tres hijuelos a macetas propias.', NULL, NULL, now() - interval '58 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'FOTO', now() - interval '57 days', 'La planta madre y los tres hijuelos recién separados.', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+CjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlM2VjZGYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjN2Q2YmYiLz4KPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2cpIi8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVjN2E2OCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIG9wYWNpdHk9IjAuNSI+CjxwYXRoIGQ9Ik0yNjAgNDgwQzI2MCAzMDAgMzgwIDE2MCA1NjAgMTQwIi8+CjxwYXRoIGQ9Ik0yNjAgNDgwQzMxMCAzODAgNDAwIDMyMCA1MjAgMjkwIi8+CjwvZz4KPGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2M2YTRmIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xODAgNDYwQzE4MCAyNjAgMzIwIDEyMCA1ODAgOTZjMCAyMjYtMTU4IDM0NC00MDAgMzY0WiIvPgo8cGF0aCBkPSJNMTgwIDQ2MGM2MC0xMzAgMTY4LTIxNCAyOTItMjU2Ii8+CjwvZz4KPC9zdmc+Cg==', NULL, now() - interval '57 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'RIEGO', now() - interval '45 days', NULL, NULL, NULL, now() - interval '45 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'ABONADO', now() - interval '38 days', NULL, NULL, NULL, now() - interval '38 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'RIEGO', now() - interval '32 days', NULL, NULL, NULL, now() - interval '32 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'CAMBIO_UBICACION', now() - interval '20 days', 'Más cerca de la luz natural del estudio.', NULL, 'Estudio, alféizar', now() - interval '20 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'RIEGO', now() - interval '18 days', NULL, NULL, NULL, now() - interval '18 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'RIEGO', now() - interval '10 days', NULL, NULL, NULL, now() - interval '10 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'NOTA', now() - interval '4 days', 'Se han detectado cochinillas en el envés de varias hojas. Tratamiento con alcohol isopropílico iniciado.', NULL, NULL, now() - interval '4 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'RIEGO', now() - interval '3 days', NULL, NULL, NULL, now() - interval '3 days'),
((SELECT id FROM plantas WHERE slug = 'nube'), 'FOTO', now() - interval '3 days', 'Detalle de las hojas afectadas para hacer seguimiento.', 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiB2aWV3Qm94PSIwIDAgODAwIDYwMCI+CjxkZWZzPjxsaW5lYXJHcmFkaWVudCBpZD0iZyIgeDE9IjAiIHkxPSIwIiB4Mj0iMSIgeTI9IjEiPgo8c3RvcCBvZmZzZXQ9IjAiIHN0b3AtY29sb3I9IiNlM2VjZGYiLz48c3RvcCBvZmZzZXQ9IjEiIHN0b3AtY29sb3I9IiNjN2Q2YmYiLz4KPC9saW5lYXJHcmFkaWVudD48L2RlZnM+CjxyZWN0IHdpZHRoPSI4MDAiIGhlaWdodD0iNjAwIiBmaWxsPSJ1cmwoI2cpIi8+CjxnIGZpbGw9Im5vbmUiIHN0cm9rZT0iIzVjN2E2OCIgc3Ryb2tlLXdpZHRoPSI0IiBzdHJva2UtbGluZWNhcD0icm91bmQiIHN0cm9rZS1saW5lam9pbj0icm91bmQiIG9wYWNpdHk9IjAuNSI+CjxwYXRoIGQ9Ik0yNjAgNDgwQzI2MCAzMDAgMzgwIDE2MCA1NjAgMTQwIi8+CjxwYXRoIGQ9Ik0yNjAgNDgwQzMxMCAzODAgNDAwIDMyMCA1MjAgMjkwIi8+CjwvZz4KPGcgZmlsbD0ibm9uZSIgc3Ryb2tlPSIjM2M2YTRmIiBzdHJva2Utd2lkdGg9IjciIHN0cm9rZS1saW5lY2FwPSJyb3VuZCIgc3Ryb2tlLWxpbmVqb2luPSJyb3VuZCI+CjxwYXRoIGQ9Ik0xODAgNDYwQzE4MCAyNjAgMzIwIDEyMCA1ODAgOTZjMCAyMjYtMTU4IDM0NC00MDAgMzY0WiIvPgo8cGF0aCBkPSJNMTgwIDQ2MGM2MC0xMzAgMTY4LTIxNCAyOTItMjU2Ii8+CjwvZz4KPC9zdmc+Cg==', NULL, now() - interval '3 days');
