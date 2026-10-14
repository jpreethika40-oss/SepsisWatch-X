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
        const res = await fetch('/api/sim/tick', { method: 'POST' });
        if (!res.ok) throw new Error('API offline');
      } catch (err) {
        // Client-side simulation tick fallback for Hugging Face Static Space mode
        const store = useStore.getState();
        const nextHour = store.currentSimHour + 1;
        setCurrentSimHour(nextHour);

        // Track last alert hour per patient to enforce genuine cooldown
        const lastAlertHours: Record<number, number> = (window as any).__lastAlertHours || {};
        (window as any).__lastAlertHours = lastAlertHours;

        store.patients.forEach((p) => {
          const newVitals = { ...(p.vitals || {}) };
          
          // Stochastic state tracking on window/patient
          const trajKey = `__traj_${p.id}`;
          let traj = (window as any)[trajKey] || { state: 'stable', ticks: 0 };

          traj.ticks += 1;

          if (traj.state === 'stable') {
            // Stochastically trigger deterioration (~6% chance per hour)
            if (Math.random() < 0.06 && traj.ticks > 3) {
              traj = { state: 'deteriorating', ticks: 0 };
            } else {
              // Natural slight baseline drift
              newVitals.HR = Math.min(95, Math.max(62, (newVitals.HR || 74) + (Math.random() * 2 - 1)));
              newVitals.SBP = Math.min(136, Math.max(108, (newVitals.SBP || 120) + (Math.random() * 3 - 1.5)));
              newVitals.MAP = Math.round((newVitals.SBP * 2 + 75) / 3);
              newVitals.Resp = Math.min(20, Math.max(12, (newVitals.Resp || 16) + (Math.random() * 1.5 - 0.75)));
              newVitals.Temp = Number(Math.min(37.4, Math.max(36.5, (newVitals.Temp || 36.8) + (Math.random() * 0.2 - 0.1))).toFixed(1));
              newVitals.Lactate = Number(Math.min(1.8, Math.max(0.7, (newVitals.Lactate || 1.1) + (Math.random() * 0.1 - 0.05))).toFixed(1));
              newVitals.WBC = Number(Math.min(10.5, Math.max(5.5, (newVitals.WBC || 7.5) + (Math.random() * 0.2 - 0.1))).toFixed(1));
            }
          } else if (traj.state === 'deteriorating') {
            // Sepsis progression
            newVitals.HR = Math.min(142, Math.max(75, (newVitals.HR || 74) + (Math.random() * 4 + 2)));
            newVitals.SBP = Math.max(70, Math.min(125, (newVitals.SBP || 120) - (Math.random() * 4 + 2)));
            newVitals.MAP = Math.round((newVitals.SBP * 2 + 50) / 3);
            newVitals.Resp = Math.min(34, Math.max(16, (newVitals.Resp || 16) + (Math.random() * 2 + 0.5)));
            newVitals.Temp = Number(Math.min(39.5, Math.max(37.0, (newVitals.Temp || 36.8) + 0.25)).toFixed(1));
            newVitals.Lactate = Number(Math.min(5.4, Math.max(1.2, (newVitals.Lactate || 1.1) + (Math.random() * 0.4 + 0.2))).toFixed(1));
            newVitals.WBC = Number(Math.min(22.0, Math.max(9.0, (newVitals.WBC || 7.5) + 1.0)).toFixed(1));
            newVitals.O2Sat = Math.max(88, Math.min(97, (newVitals.O2Sat || 98) - 1));

            if (traj.ticks >= 5) {
              traj = { state: 'recovering', ticks: 0 };
            }
          } else if (traj.state === 'recovering') {
            // Treatment response
            newVitals.HR = Math.max(68, (newVitals.HR || 110) - (Math.random() * 4 + 2));
            newVitals.SBP = Math.min(125, (newVitals.SBP || 85) + (Math.random() * 4 + 2));
            newVitals.MAP = Math.round((newVitals.SBP * 2 + 65) / 3);
            newVitals.Resp = Math.max(14, (newVitals.Resp || 24) - (Math.random() * 1.5 + 0.5));
            newVitals.Temp = Number(Math.max(36.8, (newVitals.Temp || 38.5) - 0.2).toFixed(1));
            newVitals.Lactate = Number(Math.max(0.9, (newVitals.Lactate || 3.0) - 0.4).toFixed(1));
            newVitals.WBC = Number(Math.max(6.5, (newVitals.WBC || 15.0) - 0.8).toFixed(1));
            newVitals.O2Sat = Math.min(99, (newVitals.O2Sat || 92) + 1);

            if (traj.ticks >= 5 || ((newVitals.MAP || 75) >= 72 && (newVitals.Lactate || 1.1) <= 1.8)) {
              traj = { state: 'stable', ticks: 0 };
            }
          }

          (window as any)[trajKey] = traj;

          // Dynamic multivariate risk calculation
          const shockIndex = (newVitals.HR || 75) / Math.max(newVitals.SBP || 120, 40);
          let newRisk = (
            0.06 +
            (shockIndex - 0.70) * 0.42 +
            Math.max(0, (newVitals.Lactate || 1.1) - 1.0) * 0.14 +
            ((newVitals.Temp || 37) > 38.2 || (newVitals.Temp || 37) < 36.0 ? 0.12 : 0) +
            ((newVitals.Resp || 16) > 22 ? 0.10 : 0) +
            ((newVitals.MAP || 80) < 65 ? 0.18 : 0) +
            ((newVitals.WBC || 8) > 12 ? 0.08 : 0)
          );
          newRisk = Math.min(0.98, Math.max(0.02, Number(newRisk.toFixed(2))));

          const conf = newRisk >= 0.70 ? 'sepsis' : newRisk >= 0.45 ? 'uncertain' : 'no_sepsis';
          updatePatientRisk(p.id, newRisk, nextHour, conf, newVitals);

          // Genuine Alert Gating with Cooldown
          const lastAlert = lastAlertHours[p.id] || -99;
          const cooldownPassed = (nextHour - lastAlert) >= 6; // 6-hour policy cooldown

          if (newRisk >= 0.45 && cooldownPassed) {
            lastAlertHours[p.id] = nextHour;
            const isCrit = newRisk >= 0.70;
            const fingerprint = `crit-${p.id}-${nextHour}`;
            if (!triggeredAlertsRef.current.has(fingerprint)) {
              triggeredAlertsRef.current.add(fingerprint);
              if (isCrit) {
                audioAlertService.playCriticalAlarm(fingerprint);
              }
              addAlert({
                id: Date.now() + p.id,
                patient_id: p.id,
                patient_code: p.patient_code,
                bed_number: p.bed_number,
                hour: nextHour,
                severity: isCrit ? 'critical' : 'moderate',
                risk_score: newRisk,
                status: 'active',
                lead_time_hours: 5.2,
                message: `Bed ${p.bed_number} (${p.patient_code}) acute sepsis risk elevation to ${(newRisk * 100).toFixed(0)}%. Conformal status: ${conf.toUpperCase()}.`,
                created_at: 'Just now'
              });
            }
          }
        });
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
            } else if (data.type === 'NURSE_ESCALATION') {
              if (data.escalation) {
                audioAlertService.playCriticalAlarm(`esc-${data.escalation.id}`);
                const store = useStore.getState();
                const existing = store.escalations.find(e => e.id === data.escalation.id);
                if (!existing) {
                  store.setEscalations([data.escalation, ...store.escalations]);
                  store.setLastAckNotice(data.message || `🚨 New Nurse Escalation for Bed ${data.escalation.bed_number}!`);
                  setTimeout(() => store.setLastAckNotice(null), 7000);
                }
              }
            } else if (data.type === 'DOCTOR_ACKNOWLEDGED') {
              if (Array.isArray(data.acknowledged_ids)) {
                const store = useStore.getState();
                const updated = store.escalations.map(e => 
                  data.acknowledged_ids.includes(e.id)
                    ? { ...e, status: 'acknowledged' as const, acknowledged_by: data.doctor_name, acknowledged_at: data.acknowledged_at, doctor_orders: data.orders }
                    : e
                );
                store.setEscalations(updated);
                store.setLastAckNotice(`✓ Attending Physician ${data.doctor_name} acknowledged ${data.acknowledged_ids.length} alerts.`);
                setTimeout(() => store.setLastAckNotice(null), 5000);
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
