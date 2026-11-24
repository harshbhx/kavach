import os

import pytest

# Offline defaults for every test: no LLMs, no Band, in-process target.
os.environ.update(
    {
        "BRAIN_PROVIDER": "fake",
        "BAND_ENABLED": "false",
        "TARGET_MODEL": "fake",
        "TARGET_URL": "inprocess",
        "RUNS_DIR": "/tmp/kavach-test-runs",
    }
)


@pytest.fixture
def settings():
    from kavach.config import Settings

    return Settings()


@pytest.fixture
def v1():
    from kavach.target.db import load_v1_config

    return load_v1_config()


@pytest.fixture
def hardened(v1):
    from kavach.models import GuardPolicy

    policy = GuardPolicy.model_validate(
        {
            "refund": {"max_auto_inr": 500, "require_order_ownership": True, "cap_at_order_amount": True},
            "orders": {"owner_only": True},
            "kyc": {"owner_only": True, "mask_pii": True},
            "coupons": {"allowed_codes": ["DIWALI10", "FESTIVE50"]},
            "output_filters": {"redact_pan": True, "redact_phone": True, "block_canary": True},
        }
    )
    return v1.model_copy(update={"version": "v2", "guard_policy": policy})
