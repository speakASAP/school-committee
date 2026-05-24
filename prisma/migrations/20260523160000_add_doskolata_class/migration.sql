-- Insert Doskoláta (pre-school) class for each school that doesn't already have one.
-- grade = '0' ensures it sorts before grade '1' in the class dropdown.
INSERT INTO classes (id, school_id, school_year, grade, name, created_at)
SELECT
  gen_random_uuid(),
  s.id,
  '2025/26',
  '0',
  'Doskoláta',
  NOW()
FROM schools s
WHERE NOT EXISTS (
  SELECT 1 FROM classes c
  WHERE c.school_id = s.id AND c.grade = '0'
);
