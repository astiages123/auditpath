DO $$
BEGIN
    -- 1. Update instructions
    UPDATE subject_guidelines
    SET instruction = instruction || E'\n5. Şıkların başına "A) ", "B. " gibi harf veya rakam KESİNLİKLE koymayın; sistem bunları otomatik ekler.'
    WHERE instruction NOT LIKE '%harf veya rakam KESİNLİKLE koymayın%';

    -- 2. Update few_shot_example options
    UPDATE subject_guidelines
    SET few_shot_example = (
        SELECT jsonb_set(
            few_shot_example,
            '{options}',
            (
                SELECT jsonb_agg(regexp_replace(val, '^[A-Ea-e1-5][\s\).:-]+', ''))
                FROM jsonb_array_elements_text(few_shot_example->'options') AS val
            )
        )
    )
    WHERE few_shot_example ? 'options';

    -- 3. Update bad_few_shot_example options
    UPDATE subject_guidelines
    SET bad_few_shot_example = (
        SELECT jsonb_set(
            bad_few_shot_example,
            '{options}',
            (
                SELECT jsonb_agg(regexp_replace(val, '^[A-Ea-e1-5][\s\).:-]+', ''))
                FROM jsonb_array_elements_text(bad_few_shot_example->'options') AS val
            )
        )
    )
    WHERE bad_few_shot_example IS NOT NULL AND bad_few_shot_example ? 'options';
END $$;
