# CLAUDE.md — Biblioteca

Contexto del proyecto: `PROJECT_CONTEXT.md`.

## Reglas fijas de trabajo (Igor, 22/10/2026)
1. **Antes de lanzar agentes para construir o diseñar algo, pregunta a Igor quién lo hace:** un agente Sonnet, un agente Haiku o Gemini (Antigravity), al que Igor pasa un encargo escrito. Nunca lances agentes de implementación sin preguntar. Si elige Gemini, el encargo va detallado en un documento de `docs/` (como `docs/TAREAS_MOTOR_V2.md`).
2. **Las revisiones visuales son opcionales y por defecto NO se hacen:** nada de capturas, navegador ni recorridos de la interfaz para comprobar cambios, ni tuyos ni de los agentes, salvo que Igor lo pida. Él revisa en su móvil (`http://192.168.1.55:5173` con el servidor de desarrollo encendido). Sí se mantienen las comprobaciones baratas: `npx tsc -p app/tsconfig.json --noEmit` y los tests de las zonas de riesgo de datos. Al terminar, di qué no se ha revisado a ojo.
3. Gemini trabaja a la vez en esta misma carpeta: toca solo los archivos de tu tarea y no commitees los suyos.
