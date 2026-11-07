BEGIN;

CREATE TABLE IF NOT EXISTS treasury_automation_runs (
    id uuid PRIMARY KEY,
    vault_address text NOT NULL CHECK (vault_address ~ '^0x[0-9a-f]{40}$'),
    status text NOT NULL CHECK (status IN ('scheduled', 'vetoed', 'skipped', 'submitted', 'confirmed', 'reverted')),
    decision jsonb NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now(),
    execute_at timestamptz,
    result text,
    tx_hash text UNIQUE CHECK (tx_hash ~ '^0x[0-9a-f]{64}$'),
    signed_transaction text CHECK (signed_transaction ~ '^0x[0-9a-f]+$'),
    CHECK (status NOT IN ('scheduled', 'submitted') OR execute_at IS NOT NULL),
    CHECK ((status IN ('submitted', 'confirmed', 'reverted')) = (tx_hash IS NOT NULL)),
    CHECK ((status = 'submitted') = (signed_transaction IS NOT NULL))
);

CREATE UNIQUE INDEX IF NOT EXISTS treasury_automation_active_vault
    ON treasury_automation_runs (vault_address) WHERE status IN ('scheduled', 'submitted');
CREATE INDEX IF NOT EXISTS treasury_automation_recent
    ON treasury_automation_runs (vault_address, created_at DESC);

ALTER TABLE treasury_automation_runs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON treasury_automation_runs FROM PUBLIC, anon, authenticated;

COMMIT;
