import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';
import { audioAlertService } from './audioAlertService';

export const useWebSocketStream = () => {
  const { 
    setWsStatus, setPatients, updatePatientRisk, setCurrentSimHour, 
    addAlert, isSimRunning, simSpeed, soundEnabled 
  } = useStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);
  // Track triggered alerts to prevent duplicate alarms and audible spam on every tick
  const triggeredAlertsRef = useRef<Set<string>>(new Set());

  // Sync store soundEnabled preference to audioAlertService
  useEffect(() => {
    audioAlertService.setEnabled(soundEnabled);
  }, [soundEnabled]);

  // 1. Simulator Auto-Ticker Loop when isSimRunning is active
  useEffect(() => {
    if (!isSimRunning) return;

    const intervalTime = Math.max(600, 2400 / (simSpeed || 1));
    const timer = setInterval(async () => {
      try {
        await fetch('/api/sim/tick', { method: 'POST' });
      } catch (err) {
        console.warn('[SepsisWatch-X] Error pulsing simulation tick:', err);
      }
    }, intervalTime);

    return () => clearInterval(timer);
  }, [isSimRunning, simSpeed]);

  // 2. Real-time WebSocket connection & REST bootstrap
  useEffect(() => {
    let isMounted = true;

    // Initial REST fetch for patients as reliable bootstrap
    const fetchInitialPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPatients(data);
          }
        }
      } catch {
        console.warn('[SepsisWatch-X] REST patient bootstrap fallback used.');
      }
    };
    fetchInitialPatients();

    // Real-time WebSocket connection for live telemetry ticks
    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.port === '5173' ? 'localhost:8000' : window.location.host;
      const wsUrl = `${protocol}//${host}/ws/stream`;

      try {
        setWsStatus('connecting');
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setWsStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'snapshot' && Array.isArray(data.data)) {
              // Robustly map snapshot
              const mappedPatients = data.data.map((b: any, idx: number) => {
                const patientId = b.id || b.bed_id || b.bed_number || (idx + 1);
                const bedNum = b.bed_number || b.bed_id || patientId;
                const riskVal = b.risk !== undefined ? b.risk : (b.risk_score !== undefined ? b.risk_score : 0.15);
                const calProb = b.calibrated_prob !== undefined ? b.calibrated_prob : riskVal * 0.95;

                return {
                  id: Number(patientId),
                  patient_code: b.patient_code || `p_A_${String(patientId).padStart(5, '0')}`,
                  hospital: b.hospital || (idx % 2 === 0 ? 'setA' : 'setB'),
                  age: b.age || 60,
                  gender: b.gender !== undefined ? b.gender : idx % 2,
                  unit1: b.hospital === 'setA' ? 1 : 0,
                  unit2: b.hospital === 'setB' ? 1 : 0,
                  hosp_adm_time: -12.0,
                  is_active: true,
                  bed_number: Number(bedNum),
                  current_hour: b.current_hour || 4,
                  risk: Number(riskVal),
                  calibrated_prob: Number(calProb),
                  conformal_label: b.conformal_label || 'no_sepsis',
                  status: b.status || (riskVal >= 0.40 ? 'critical' : riskVal >= 0.20 ? 'caution' : 'normal'),
                  diagnosis: b.diagnosis || 'ICU Inpatient',
                  active_treatments: b.active_treatments || 'Standard Monitoring',
                  vitals: b.vitals || {}
                };
              });

              if (mappedPatients.length > 0) {
                setPatients(mappedPatients);
              }
            } else if (data.type === 'tick') {
              if (data.tick !== undefined) {
                setCurrentSimHour(data.tick);
              }
              if (Array.isArray(data.beds)) {
                data.beds.forEach((b: any) => {
                  const patientId = Number(b.id || b.bed_id || b.bed_number);
                  const riskVal = Number(b.risk !== undefined ? b.risk : (b.risk_score !== undefined ? b.risk_score : 0.15));
                  const hour = b.current_hour || data.tick;
                  const conf = b.conformal_label || 'no_sepsis';
                  const bedNum = Number(b.bed_number || patientId);
                  const code = b.patient_code || `p_A_${String(patientId).padStart(5, '0')}`;

                  updatePatientRisk(patientId, riskVal, hour, conf, b.vitals);

                  // 1. Critical Alert Handling (>= 40% risk or critical status)
                  if (riskVal >= 0.40 || b.status === 'critical') {
                    const fingerprint = `crit-${patientId}-${hour}`;
                    if (!triggeredAlertsRef.current.has(fingerprint)) {
                      triggeredAlertsRef.current.add(fingerprint);

                      // Audible alarm pulse
                      audioAlertService.playCriticalAlarm(fingerprint);

                      addAlert({
                        id: Date.now() + patientId,
                        patient_id: patientId,
                        patient_code: code,
                        bed_number: bedNum,
                        hour: hour,
                        severity: 'critical',
                        risk_score: riskVal,
                        status: 'active',
                        lead_time_hours: 5.2,
                        message: `Bed ${bedNum} (${code}) acute sepsis risk elevation to ${(riskVal * 100).toFixed(0)}%. Conformal status: ${conf.toUpperCase()}.`,
                        created_at: 'Just now'
                      });
                    }
                  } 
                  // 2. Moderate Alert Handling (20% to < 40% risk)
                  else if (riskVal >= 0.20) {
                    const fingerprint = `mod-${patientId}-${hour}`;
                    if (!triggeredAlertsRef.current.has(fingerprint)) {
                      triggeredAlertsRef.current.add(fingerprint);

                      // Audible warning chime
                      audioAlertService.playWarningAlarm(fingerprint);

                      addAlert({
                        id: Date.now() + patientId,
                        patient_id: patientId,
                        patient_code: code,
                        bed_number: bedNum,
                        hour: hour,
                        severity: 'moderate',
                        risk_score: riskVal,
                        status: 'active',
                        lead_time_hours: 4.8,
                        message: `Bed ${bedNum} (${code}) moderate sepsis risk elevation to ${(riskVal * 100).toFixed(0)}%. Monitoring vitals trajectory.`,
                        created_at: 'Just now'
                      });
                    }
                  }
                });
              }
            }
          } catch (err) {
            console.error('[SepsisWatch-X] Error parsing stream message:', err);
          }
        };

        ws.onclose = () => {
          if (!isMounted) return;
          setWsStatus('disconnected');
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {
        setWsStatus('disconnected');
        reconnectTimeoutRef.current = window.setTimeout(connect, 4000);
      }
    };

    connect();

    return () => {
      isMounted = false;
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, []);

  return { ws: wsRef.current };
};
