from __future__ import annotations

import gzip
import hashlib
import json
from pathlib import Path

PROJECT_ROOT = Path(__file__).parents[2]
SAMPLE = PROJECT_ROOT / "public/data/multimodal-sample.jsonl.gz"
MANIFEST = PROJECT_ROOT / "public/data/multimodal-sample.manifest.json"


def test_committed_multimodal_sample_matches_its_manifest():
    manifest = json.loads(MANIFEST.read_text(encoding="utf-8"))
    assert manifest["rowCount"] >= 100_000
    assert sum(manifest["sourceRows"].values()) == manifest["rowCount"]
    assert all(rows > 0 for rows in manifest["sourceRows"].values())
    assert hashlib.sha256(SAMPLE.read_bytes()).hexdigest() == manifest["sha256"]

    with gzip.open(SAMPLE, "rt", encoding="utf-8") as source:
        assert sum(1 for _ in source) == manifest["rowCount"]
