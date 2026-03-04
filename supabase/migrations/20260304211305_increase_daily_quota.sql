-- Update check_and_increment_quota and get_user_quota_info to set daily quota to 250 instead of 50.

CREATE OR REPLACE FUNCTION "public"."check_and_increment_quota"("p_user_id" "uuid") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_today date := current_date;
    v_quota record;
    v_result jsonb;
BEGIN
    -- Get or create quota tracking row with lock
    SELECT * INTO v_quota
    FROM user_quotas
    WHERE user_id = p_user_id
    FOR UPDATE;

    IF NOT FOUND THEN
        -- Create initial row for user if it doesn't exist
        INSERT INTO user_quotas (user_id, daily_limit, used_today, last_reset_date)
        VALUES (p_user_id, 250, 1, v_today)
        RETURNING * INTO v_quota;
        
        v_result := jsonb_build_object(
            'allowed', true,
            'remaining', v_quota.daily_limit - v_quota.used_today,
            'daily_limit', v_quota.daily_limit
        );
        RETURN v_result;
    END IF;

    -- Reset if new day
    IF v_quota.last_reset_date < v_today THEN
        v_quota.used_today := 0;
        v_quota.last_reset_date := v_today;
    END IF;

    -- Check if limit exceeded
    IF v_quota.used_today >= v_quota.daily_limit THEN
        v_result := jsonb_build_object(
            'allowed', false,
            'remaining', 0,
            'daily_limit', v_quota.daily_limit
        );
        
        -- Update the reset date just in case
        UPDATE user_quotas
        SET last_reset_date = v_quota.last_reset_date,
            updated_at = now()
        WHERE user_id = p_user_id;

        RETURN v_result;
    END IF;

    -- Increment usage
    UPDATE user_quotas
    SET used_today = v_quota.used_today + 1,
        last_reset_date = v_quota.last_reset_date,
        updated_at = now()
    WHERE user_id = p_user_id;

    v_result := jsonb_build_object(
        'allowed', true,
        'remaining', v_quota.daily_limit - (v_quota.used_today + 1),
        'daily_limit', v_quota.daily_limit
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."check_and_increment_quota"("p_user_id" "uuid") OWNER TO "postgres";


CREATE OR REPLACE FUNCTION "public"."get_user_quota_info"() RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
    v_user_id uuid := auth.uid();
    v_today date := current_date;
    v_quota record;
    v_result jsonb;
BEGIN
    IF v_user_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    SELECT * INTO v_quota
    FROM user_quotas
    WHERE user_id = v_user_id;

    IF NOT FOUND THEN
        -- Auto-create on fetch
        INSERT INTO user_quotas (user_id, daily_limit, used_today, last_reset_date)
        VALUES (v_user_id, 250, 0, v_today)
        RETURNING * INTO v_quota;
    ELSIF v_quota.last_reset_date < v_today THEN
        -- Reset if previous day
        UPDATE user_quotas
        SET used_today = 0,
            last_reset_date = v_today,
            updated_at = now()
        WHERE user_id = v_user_id
        RETURNING * INTO v_quota;
    END IF;

    v_result := jsonb_build_object(
        'remaining', GREATEST(0, v_quota.daily_limit - v_quota.used_today),
        'daily_limit', v_quota.daily_limit
    );

    RETURN v_result;
END;
$$;


ALTER FUNCTION "public"."get_user_quota_info"() OWNER TO "postgres";

-- Update existing user quotas
ALTER TABLE public.user_quotas ALTER COLUMN daily_limit SET DEFAULT 250;
UPDATE public.user_quotas SET daily_limit = 250 WHERE daily_limit = 50;
