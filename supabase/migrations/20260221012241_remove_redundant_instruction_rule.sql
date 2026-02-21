UPDATE subject_guidelines
SET instruction = REPLACE(instruction, E'\n5. Şıkların başına "A) ", "B. " gibi harf veya rakam KESİNLİKLE koymayın; sistem bunları otomatik ekler.', '')
WHERE instruction LIKE '%harf veya rakam KESİNLİKLE koymayın%';
