from modelcontextprotocol.sdk.server import McpServer
from pydantic import BaseModel, Field

class Config(BaseModel):
    debug: bool = Field(default=False, description="Enable debug logging")

def create_stateless_server(config: Config):
    server = McpServer(
        name="My MCP Server",
        version="1.0.0",
    )

    class HelloToolParams(BaseModel):
        name: str = Field(..., description="Name to greet")

    @server.tool("hello", "Say hello to someone", HelloToolParams)
    async def hello(params: HelloToolParams):
        return {
            "content": [{"type": "text", "text": f"Hello, {params.name}!"}]
        }

    return server.server

def start():
    # This is a placeholder for where the server would be started.
    # In a real application, you would likely use a library like uvicorn to run the server.
    print("Starting server...")
    config = Config()
    server = create_stateless_server(config)
    # server.run() # This is a placeholder

if __name__ == "__main__":
    start()
