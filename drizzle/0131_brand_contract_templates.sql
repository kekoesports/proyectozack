-- Plantillas internas por marca. Se copian de los contratos sectoriales ya
-- revisados y almacenados en el CRM; no se envían ni firman automáticamente.
-- El type `brand:<id>` permite una selección determinista sin añadir datos
-- legales incompletos a crm_brands ni multiplicar lógica en la aplicación.
WITH brand_contracts(brand_id, brand_name, source_template_id) AS (
  VALUES
    (25, 'BETNIX', 12),
    (4,  'BLEAP', 1),
    (6,  'Csgofast', 12),
    (13, 'Empire Drop', 10),
    (7,  'GrandArena', 1),
    (8,  'HellCase', 12),
    (9,  'StormMedia', 1),
    (10, 'Csland & Dotaboom', 12),
    (5,  'CreatorPush', 1),
    (11, 'ClashGG', 12),
    (12, 'CSGOBIG', 12),
    (14, 'SkinsMonkey', 9),
    (15, 'LuckyX', 12),
    (3,  'W88', 12),
    (18, 'KeyDrop', 9),
    (19, 'Skinplace', 9),
    (20, '1xBET', 12),
    (1,  'SkinClub', 9),
    (22, 'CSGOSkins', 9),
    (23, 'Beton', 12),
    (17, '1WIN', 12),
    (21, 'YoSports', 12),
    (24, 'PIRATESWAP', 12)
)
INSERT INTO contract_templates (
  name,
  type,
  content,
  description,
  language,
  is_active,
  created_at,
  updated_at
)
SELECT
  'Contrato base — ' || mapping.brand_name,
  'brand:' || mapping.brand_id,
  source.content,
  'Borrador interno específico para ' || mapping.brand_name
    || '. Basado en «' || source.name
    || '». Requiere revisión humana de identidad legal, fiscalidad, jurisdicción, importes y entregables antes de enviarse.',
  source.language,
  true,
  now(),
  now()
FROM brand_contracts AS mapping
INNER JOIN crm_brands AS brand
  ON brand.id = mapping.brand_id
 AND brand.name = mapping.brand_name
INNER JOIN contract_templates AS source
  ON source.id = mapping.source_template_id
WHERE NOT EXISTS (
  SELECT 1
  FROM contract_templates AS existing
  WHERE existing.type = 'brand:' || mapping.brand_id
);
