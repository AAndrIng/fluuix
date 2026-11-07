BEGIN;

CREATE TABLE IF NOT EXISTS intercompany_operations (
    id uuid PRIMARY KEY,
    vault_address text NOT NULL CHECK (vault_address ~ '^0x[0-9a-f]{40}$'),
    signer text NOT NULL CHECK (signer ~ '^0x[0-9a-f]{40}$'),
    source_id integer NOT NULL CHECK (source_id >= 0),
    destination_id integer NOT NULL CHECK (destination_id >= 0),
    source_name text NOT NULL,
    destination_name text NOT NULL,
    amount numeric(78, 0) NOT NULL CHECK (amount > 0),
    kind text NOT NULL CHECK (kind IN ('loan', 'contribution', 'other')),
    rate_bps smallint,
    note text NOT NULL CHECK (char_length(note) <= 120),
    status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'submitted', 'confirmed', 'reverted')),
    tx_hash text UNIQUE CHECK (tx_hash ~ '^0x[0-9a-f]{64}$'),
    block_number bigint,
    created_at timestamptz NOT NULL DEFAULT now(),
    confirmed_at timestamptz,
    CHECK (source_id <> destination_id),
    CHECK ((kind = 'loan' AND rate_bps IS NOT NULL AND rate_bps BETWEEN 0 AND 10000)
        OR (kind <> 'loan' AND rate_bps IS NULL)),
    CHECK (kind <> 'other' OR char_length(btrim(note)) > 0),
    CHECK ((status = 'pending') = (tx_hash IS NULL)),
    CHECK ((status = 'confirmed') = (confirmed_at IS NOT NULL AND block_number IS NOT NULL))
);

CREATE INDEX IF NOT EXISTS intercompany_vault_recent
    ON intercompany_operations (vault_address, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS intercompany_used_challenges (
    nonce uuid PRIMARY KEY,
    expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS intercompany_challenge_expiry
    ON intercompany_used_challenges (expires_at);

ALTER TABLE intercompany_operations ENABLE ROW LEVEL SECURITY;
ALTER TABLE intercompany_used_challenges ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON intercompany_operations, intercompany_used_challenges FROM PUBLIC;

COMMIT;
