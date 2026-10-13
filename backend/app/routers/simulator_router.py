"""
Simulator & Stress Lab Router.
Controls live ward simulation playback and scripted resilience stress scenarios.
"""

from typing import Dict, Any, Optional
from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from backend.app.services.simulator import simulator
from backend.ml.stress_lab import StressLabEngine

router = APIRouter(prefix="/api", tags=["Simulator & Stress Lab"])


class SpeedRequest(BaseModel):
    speed: float = 1.0  # seconds per simulation tick


class StressRunRequest(BaseModel):
    scenario: str = "sensor_dropout"  # 'sensor_dropout', 'lab_delay', 'noisy_telemetry', 'ward_surge', 'domain_switch'


@router.post("/simulator/start")
async def start_sim():
    """Starts real-time 12-bed ICU ward telemetry streaming."""
    simulator.is_running = True
    return {"status": "Simulator Started", "sim_speed": simulator.sim_speed, "current_tick": simulator.current_tick}


@router.post("/simulator/pause")
async def pause_sim():
    """Pauses real-time simulation streaming."""
    simulator.is_running = False
    return {"status": "Simulator Paused", "current_tick": simulator.current_tick}


@router.post("/simulator/resume")
async def resume_sim():
    """Resumes real-time ward telemetry playback."""
    simulator.is_running = True
    return {"status": "Simulator Resumed", "current_tick": simulator.current_tick}


@router.post("/simulator/stop")
async def stop_sim():
    """Stops real-time simulation streaming."""
    simulator.is_running = False
    return {"status": "Simulator Stopped"}


@router.post("/simulator/speed")
async def set_speed(req: SpeedRequest):
    """Sets simulation playback speed multiplier."""
    simulator.sim_speed = max(0.1, min(10.0, req.speed))
    return {"status": "Speed Updated", "sim_speed": simulator.sim_speed}


@router.post("/simulator/reset")
async def reset_sim():
    """Resets all 12 beds to baseline hour 1 state."""
    simulator.current_tick = 1
    simulator._init_models_and_beds()
    return {"status": "Simulator Reset to Baseline", "current_tick": 1}


@router.post("/simulator/inject-shift")
async def inject_shift():
    """Injects artificial hemodynamic drift to demonstrate live drift alarms."""
    for bed in simulator.beds_state:
        bed["vitals"]["HR"] *= 1.15
        bed["vitals"]["MAP"] *= 0.88
        bed["risk_score"] = min(0.95, bed["risk_score"] * 1.30)
    return {"status": "Distribution Shift Injected", "features_affected": ["HR", "MAP", "Lactate"]}


@router.post("/stress/run")
async def run_stress_scenario(req: StressRunRequest):
    """Executes scripted resilience stress test and returns before/after degradation metrics."""
    return StressLabEngine.run_scenario(req.scenario)


@router.get("/stress/results")
async def get_stress_results():
    """Returns composite resilience scorecard across all 5 operational stress profiles."""
    return StressLabEngine.compute_composite_resilience_score()
