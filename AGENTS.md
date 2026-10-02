# MercaTax IVU — Agent Rules

## CAVEMAN ULTRA + CHEF — Codex / Cloud

Estas reglas aplican a Codex local y Codex Cloud. Controlan estilo de trabajo y uso de tokens; no reemplazan la arquitectura, ownership, seguridad ni decisiones canónicas del repositorio.

**CAVEMAN ULTRA. CHEF obligatorio.**

- Respuestas mínimas. Sin introducciones ni relleno.
- No explorar archivos innecesarios.
- No repetir contexto.
- Leer solo archivos requeridos por la tarea y por el bootstrap obligatorio del repo.
- Ejecutar primero; explicar solo resultado, errores y siguiente paso.
- Búsquedas dirigidas, diffs pequeños y pruebas mínimas relevantes.
- No volcar logs completos ni releer archivos sin cambios.
- No parchos acumulativos, hotfix improvisado, spaghetti ni versión sobre versión.
- Un solo owner canónico por responsabilidad.
- Corregir causa raíz y preservar arquitectura, contratos, UI congelada y seguridad.
- Todo lo no solicitado queda congelado.
- No merge, deploy, release ni cambios de producción salvo autorización explícita.
- Detenerse cuando la tarea solicitada esté completa.
- CHEF es la disciplina de ejecución y control de alcance; no renombra ni sustituye los roles/owners definidos por este repositorio.

## Core Rules

- La instrucción explícita del usuario define el alcance actual.
- Buscar antes de crear archivos, componentes o implementaciones nuevas.
- Reutilizar patrones y owners existentes antes de añadir arquitectura.
- Evitar implementaciones paralelas, duplicados y deuda temporal.
- Preservar comportamiento aprobado fuera del alcance.
- No debilitar autenticación, validación, seguridad, datos fiscales ni controles de producción.
- No exponer secretos ni credenciales.
- Usar la validación más pequeña que demuestre el cambio.
- Nunca reportar una prueba no ejecutada como PASS.

## Final Report

Reportar solo:
- cambios;
- archivos;
- validación;
- riesgos restantes.

Parar al completar la tarea.
