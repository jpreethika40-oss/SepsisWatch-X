"""
WebSocket Streaming Router for Real-Time 12-Bed ICU Ward Simulation.
Supports Live Application Mode, Historical Replay Mode, and Simulation Mode
with start, pause, resume, step forward, and reset controls.
"""

import asyncio
from typing import Dict, Any, Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from backend.app.services.simulator import simulator

router = APIRouter(tags=["Simulation & WebSocket Stream"])

# Global background ticker task handle
_bg_task: Optional[asyncio.Task] = None


class SimControlRequest(BaseModel):
    is_running: bool
    speed: float = 1.0
    mode: Optional[str] = "replay"  # 'live', 'replay', 'simulation'


async def _background_stream_loop():
    """Background loop that automatically advances simulation and broadcasts when is_running is True."""
    while True:
        try:
            if simulator.is_running:
                simulator.advance_tick()
                snapshot = simulator.get_ward_snapshot()
                payload = {
                    "type": "tick",
                    "tick": simulator.current_tick,
                    "beds": snapshot
                }
                await simulator.broadcast(payload)
                interval = max(0.4, 2.5 / max(0.1, simulator.sim_speed))
                await asyncio.sleep(interval)
            else:
                await asyncio.sleep(0.5)
        except asyncio.CancelledError:
            break
        except Exception as e:
            print(f"[StreamLoop] Background ticker warning: {e}")
            await asyncio.sleep(1.0)


@router.websocket("/ws/stream")
async def websocket_stream_endpoint(websocket: WebSocket):
    """
    WebSocket endpoint streaming hourly ICU telemetry updates, calibrated risk scores,
    conformal prediction sets, and alert budget notifications across the 12-bed ward.
    """
    global _bg_task
    if _bg_task is None or _bg_task.done():
        _bg_task = asyncio.create_task(_background_stream_loop())

    await simulator.connect(websocket)
    try:
        while True:
            # Keep connection alive and receive client control signals
            data = await websocket.receive_text()
            try:
                import json
                msg = json.loads(data)
                if msg.get("action") == "pause":
                    simulator.is_running = False
                elif msg.get("action") == "resume":
                    simulator.is_running = True
                elif msg.get("action") == "speed":
                    simulator.sim_speed = float(msg.get("value", 1.0))
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
    """Controls simulation running state, playback speed, and operational mode."""
    global _bg_task
    simulator.is_running = req.is_running
    simulator.sim_speed = max(0.1, min(10.0, req.speed))
    if hasattr(simulator, "operational_mode") and req.mode:
        simulator.operational_mode = req.mode

    if simulator.is_running and (_bg_task is None or _bg_task.done()):
        _bg_task = asyncio.create_task(_background_stream_loop())

    # Broadcast status change to connected clients
    await simulator.broadcast({
        "type": "control",
        "is_running": simulator.is_running,
        "speed": simulator.sim_speed,
        "mode": getattr(simulator, "operational_mode", "replay")
    })

    return {
        "is_running": simulator.is_running,
        "speed": simulator.sim_speed,
        "current_tick": simulator.current_tick,
        "mode": getattr(simulator, "operational_mode", "replay")
    }


@router.post("/api/sim/reset")
async def reset_simulator():
    """Resets the simulation to baseline Hour 1 state and broadcasts snapshot."""
    simulator.current_tick = 1
    simulator.is_running = False
    simulator._init_models_and_beds()
    snapshot = simulator.get_ward_snapshot()
    await simulator.broadcast({
        "type": "reset",
        "tick": 1,
        "beds": snapshot
    })
    return {"status": "reset", "tick": 1, "beds": snapshot}


@router.get("/api/sim/status")
async def get_simulator_status():
    """Returns the current simulation engine status and mode."""
    return {
        "is_running": simulator.is_running,
        "speed": simulator.sim_speed,
        "current_tick": simulator.current_tick,
        "mode": getattr(simulator, "operational_mode", "replay"),
        "connected_clients": len(simulator.active_websockets),
        "total_beds": len(simulator.beds_state)
    }
