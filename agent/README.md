# FlowBridge Local Browser Agent

The official local browser agent for **FlowBridge** ("Let AI control your creative workflow").

## Overview

The FlowBridge Local Agent connects your local Chrome browser session to the FlowBridge Cloud / Web Application and Model Context Protocol (MCP) server.

When an AI chatbot (such as ChatGPT, Gemini, or Claude) sends MCP commands, FlowBridge orchestrates them through this agent to control your real browser and execute Google Flow media generations.

## Quick Start

### 1. Launch Chrome with Remote Debugging
On your computer, start Google Chrome with remote debugging enabled:

**macOS:**
```bash
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --user-data-dir="/tmp/flowbridge-chrome" https://flow.google.com
```

**Windows:**
```cmd
"C:\Program Files\Google\Chrome\Application\chrome.exe" --remote-debugging-port=9222 --user-data-dir="%TEMP%\flowbridge-chrome" https://flow.google.com
```

**Linux:**
```bash
google-chrome --remote-debugging-port=9222 --user-data-dir="/tmp/flowbridge-chrome" https://flow.google.com
```

### 2. Pair and Start Agent
From the FlowBridge web dashboard, click **"Connect Local Agent"** to get a 6-digit secure pairing code (e.g. `FB-7482-K9`).

Then run:
```bash
# Using npm
npm run agent -- --pair=FB-7482-K9

# Or from the agent directory
cd agent
npm install
npm start -- --pair=FB-7482-K9
```

Once connected, FlowBridge will display:
```
LOCAL AGENT: ● CONNECTED
```

The agent is now ready to receive real browser automation commands from ChatGPT, Gemini, or Claude.
