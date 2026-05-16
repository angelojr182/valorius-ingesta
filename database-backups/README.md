# Valorius Database Backups

Este directorio se utilizará para almacenar respaldos oficiales de la base de datos de Valorius.

## Estrategia actual

1. Exportar backup completo desde Supabase.
2. Guardar archivo .sql en este directorio.
3. Mantener solo respaldos relevantes y recientes.
4. Eliminar tablas `_backup_*` internas antiguas una vez validado el export.

## Convención recomendada

valorius_backup_YYYY_MM_DD.sql

Ejemplo:

valorius_backup_2026_05_16.sql
