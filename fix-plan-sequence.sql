-- Fix plans table sequence
-- Run this if you get "duplicate key value violates unique constraint" error

-- Reset the sequence to the maximum existing plan_id + 1
SELECT setval(
    'plans_plan_id_seq', 
    COALESCE((SELECT MAX(plan_id) FROM plans), 0) + 1, 
    false
);

-- Check current plans
SELECT plan_id, name, plan_type, billing_interval FROM plans ORDER BY plan_id;

-- Check sequence current value
SELECT last_value FROM plans_plan_id_seq;


