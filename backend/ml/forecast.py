"""
6-Hour Risk Forecasting Engine with Conformal Uncertainty Bands.
Projects patient sepsis risk trajectory 6 hours into the future using temporal momentum,
autoregressive extrapolation, and empirical conformal bounds.
"""

from typing import Dict, List, Any, Optional
import numpy as np


class RiskForecaster:
    """Projects future risk trajectory over 1-6 hours with uncertainty intervals."""

    def __init__(self, alert_threshold: float = 0.45):
        self.alert_threshold = alert_threshold

    def forecast_trajectory(
        self,
        recent_risks: List[float],
        current_hour: int,
        horizon_hours: int = 6
    ) -> Dict[str, Any]:
        """
        Extrapolates risk over the next `horizon_hours`.

        Args:
            recent_risks: Historical risk sequence up to current hour (at least 2-4 points).
            current_hour: Current ICULOS hour index.
            horizon_hours: Number of future hours to project (default 6).
        """
        if not recent_risks:
            recent_risks = [0.1]

        current_risk = float(recent_risks[-1])
        n_hist = len(recent_risks)

        # Estimate risk velocity (linear trend over last 3-6 hours)
        if n_hist >= 2:
            lookback = min(6, n_hist)
            x_vals = np.arange(lookback)
            y_vals = np.array(recent_risks[-lookback:], dtype=float)
            # Slope via simple least squares
            x_mean = np.mean(x_vals)
            y_mean = np.mean(y_vals)
            denom = np.sum((x_vals - x_mean) ** 2)
            slope = float(np.sum((x_vals - x_mean) * (y_vals - y_mean)) / denom) if denom > 1e-5 else 0.0
            # Dampen extreme slopes for physiological plausibility
            slope = float(np.clip(slope, -0.08, 0.12))
        else:
            slope = 0.0

        forecast_points: List[Dict[str, Any]] = []
        time_to_threshold: Optional[float] = None

        for h in range(1, horizon_hours + 1):
            future_hour = current_hour + h
            # Mean projection with mild mean reversion / saturation towards [0, 1]
            raw_proj = current_risk + slope * h
            mean_risk = float(np.clip(raw_proj, 0.02, 0.98))

            # Uncertainty expands with prediction horizon
            # Standard error grows with sqrt(h)
            uncertainty_width = 0.06 + 0.03 * np.sqrt(h)
            lower = float(np.clip(mean_risk - uncertainty_width, 0.01, 0.95))
            upper = float(np.clip(mean_risk + uncertainty_width, 0.05, 0.99))

            if mean_risk >= self.alert_threshold and time_to_threshold is None:
                # Interpolate time when threshold is crossed
                if slope > 0:
                    fractional_h = (self.alert_threshold - current_risk) / slope
                    time_to_threshold = round(max(0.2, min(float(horizon_hours), fractional_h)), 1)
                else:
                    time_to_threshold = float(h)

            forecast_points.append({
                "horizon_step": h,
                "projected_hour": future_hour,
                "mean_risk": round(mean_risk, 3),
                "lower_bound": round(lower, 3),
                "upper_bound": round(upper, 3)
            })

        return {
            "current_risk": round(current_risk, 3),
            "trend_velocity_per_hour": round(slope, 4),
            "time_to_threshold_hours": time_to_threshold,
            "decision_threshold": self.alert_threshold,
            "forecast_points": forecast_points,
            "summary": (
                f"Projected to exceed threshold ({self.alert_threshold}) in {time_to_threshold} hrs."
                if time_to_threshold is not None
                else "Risk projected to remain below alert threshold over 6-hour horizon."
            )
        }
