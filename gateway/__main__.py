"""Run the gateway server directly: python -m gateway"""

import uvicorn

from gateway.config import load_config
from gateway.server import create_app

config = load_config()
app = create_app(config)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=config.webhook_port)
