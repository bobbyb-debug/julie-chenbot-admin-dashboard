# Running Julie's admin API locally, without a Discord bot

You don't need `DISCORD_TOKEN`, a real Discord server, or `ENABLE_SCHEDULER` to develop this
dashboard. Julie's admin API (`admin_api/` in the [JulieChenBot](https://github.com/bobbyb-debug/JulieChenBot)
repo) only needs a `ProductionEngine` instance — you can construct one directly in a small script.

Save this as e.g. `run_admin_api_dev.py` **inside the JulieChenBot repo** (it imports from it) and
run it with that repo's own virtualenv:

```python
import asyncio
from pathlib import Path
import tempfile

import config
TMP = Path(tempfile.mkdtemp(prefix="julie-dev-"))
config.STATE_DIR = TMP
config.DATA = TMP / "data"
config.DATABASE = TMP / "database"
config.LOGS = TMP / "logs"
for d in (config.DATA, config.DATABASE, config.LOGS):
    d.mkdir(parents=True, exist_ok=True)
config.ADMIN_API_KEY = "dev-local-secret"
config.ADMIN_API_PORT = 8080

import database.storage as storage_module
storage_module.Storage.FILE = config.DATA / "storage.json"
import database.hamsterwatch_archive as archive_module
archive_module.ARCHIVE_FILE = config.DATABASE / "hamsterwatch_archive.db"

from database.storage import Storage
from production.engine import ProductionEngine
from production.house_status import HouseStatus
from production.knowledge import KnowledgeType
from admin_api.server import run_admin_api


async def main() -> None:
    engine = ProductionEngine(storage=Storage())

    # Seed some sample state so the dashboard has something to show.
    engine.watcher.house_status.current = HouseStatus(
        hoh="Yash", nominees=("Angela", "Haley", "Kamu"),
        veto_holder="Yash", veto_used=False, feeds="up",
    )
    engine._persist_game_state()
    engine.knowledge.teach(KnowledgeType.STATE, "Yash", 1001, topic="HOH")
    engine.knowledge.teach(KnowledgeType.FACT, "Yash has won two HOH competitions.", 1001)

    print("Admin API on http://127.0.0.1:8080 (key: dev-local-secret)")
    await run_admin_api(engine, port=8080)


if __name__ == "__main__":
    asyncio.run(main())
```

Run it (from the JulieChenBot repo root, using its venv):

```bash
python run_admin_api_dev.py
```

Then point this dashboard at it:

```bash
# .env.local
JULIE_API_URL=http://127.0.0.1:8080
JULIE_API_KEY=dev-local-secret
```

State lives in a temp directory and disappears when the script exits — safe to run repeatedly
without touching the real bot's persisted `storage.json`. This script is intentionally not
committed to the JulieChenBot repo (it seeds fake demo data); treat it as a local, throwaway dev
tool.
