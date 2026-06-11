/*
  # Enable pg_cron and pg_net Extensions

  1. Extensions
    - `pg_cron` (v1.6.4) in schema `cron` - Job scheduler for recurring SQL tasks
    - `pg_net` (v0.19.5) in schema `extensions` - Async HTTP requests from PostgreSQL

  2. Important Notes
    - pg_cron will be used to schedule periodic checks for SFTP sync triggers
    - pg_net will be used to call edge functions asynchronously from SQL
*/

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA cron;

CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;
