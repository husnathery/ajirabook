-- Update minimum withdrawal amount constraint to 5000
ALTER TABLE withdrawals DROP CONSTRAINT IF EXISTS min_amount;
ALTER TABLE withdrawals ADD CONSTRAINT min_amount CHECK (amount >= 5000);