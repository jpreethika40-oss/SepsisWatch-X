"""
WebSocket Streaming Router for Real-Time 12-Bed ICU Ward Simulation.
"""

import asyncio
from typing import Dict, Any
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.app.services.simulator import simulator

router = APIRouter(tags=["Simulation & WebSocket Stream"])


class SimControlRequest(BaseModel):
    is_running: bool
    speed: float = 1.0


@router.websocket("/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming hourly ICU telemetry updates, calibrated risk scores,
    conformal prediction sets, and alert budget notifications across the 12-bed ward.
    """
    await simulator.connect(websocket)
    try:
        while True:
            # Receive any client commands (e.g., speed change, pause)
            data = await websocket.receive_text()
            try:
                msg = asyncio.iscoroutinefunction(data) or None
            except Exception:
                pass
    except WebSocketDisconnect:
        simulator.disconnect(websocket)
    except Exception:
        simulator.disconnect(websocket)


@router.post("/api/sim/tick")
async def manual_tick():
    """Manually advances simulation by 1 hour and broadcasts to active clients."""
    beds = simulator.advance_tick()
    snapshot = simulator.get_ward_snapshot()
    payload = {
        "type": "tick",
        "tick": simulator.current_tick,
        "beds": snapshot
    }
    await simulator.broadcast(payload)
    return {"status": "ok", "tick": simulator.current_tick, "beds": snapshot}


@router.post("/api/sim/control")
async def control_simulator(req: SimControlRequest):
    """Controls simulation running state and speed."""
    simulator.is_running = req.is_running
    simulator.sim_speed = req.speed
    return {"is_running": simulator.is_running, "speed": simulator.sim_speed}
