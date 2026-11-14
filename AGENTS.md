# FIELDVERSE: instrucciones compartidas

Leer README.md y docs/contrato-api.md antes de editar.

- Samuel: frontend/ y configuración raíz.
- Alex: backend/ excepto backend/src/domain/.
- Hellen: backend/src/domain/ y docs/metodologia/.
- Las rutas son acuerdos de colaboración, no barreras de seguridad. Para editar fuera del área acordar el cambio con su propietario.
- Mantener backend ESM; frontend componentes → páginas → rutas → App → main.
- Backend domain no debe importar Express, consultar APIs ni leer credenciales: recibir datos y devolver resultados.
- Alex controla backend/package.json y su lockfile; Samuel controla los del frontend. Hellen pide las dependencias que necesite a Alex.
- No añadir .vscode, credenciales, .env, node_modules o cachés al repositorio.
- No introducir MySQL, login, chatbot o nuevas fuentes sin acordar alcance.
- Distinguir historial, pronóstico y escenarios hipotéticos. Desconocido no significa cero. Datos de respaldo deben llevar fecha y origen.
- No atribuir puntuaciones demostrativas a NASA ni prometer rendimiento o supervivencia.
- Revisar los cambios, correr las verificaciones correspondientes y describir lo que sigue pendiente. No force push ni merge automático.
