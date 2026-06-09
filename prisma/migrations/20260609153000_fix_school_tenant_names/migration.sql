-- Rename test seed labels to production school names (Střílky)
UPDATE schools SET name = 'ZŠ Střílky'
WHERE id = '0813b865-eddb-416d-a70d-8710b827837e' AND name = 'Alfares School';

UPDATE tenants SET name = 'Školní výbor Střílky'
WHERE id = '444bc08e-45f2-4f76-9c87-f3a1b42c8bcf' AND name = 'Alfares School';
