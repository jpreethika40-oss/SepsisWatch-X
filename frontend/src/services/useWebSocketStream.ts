import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const useWebSocketStream = () => {
  const { setWsStatus, setPatients, updatePatientRisk, setCurrentSimHour, addAlert } = useStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    // 1. Initial REST fetch for patients as reliable bootstrap
    const fetchInitialPatients = async () => {
      try {
        const res = await fetch('/api/patients');
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setPatients(data);
            console.log('[SepsisWatch-X] Successfully loaded', data.length, 'patients via REST.');
          }
        }
      } catch (e) {
        console.warn('[SepsisWatch-X] REST patient bootstrap fallback used.');
      }
    };
    fetchInitialPatients();

    // 2. Real-time WebSocket connection for live telemetry ticks
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
          console.log('[SepsisWatch-X] WebSocket Stream Connected:', wsUrl);
          setWsStatus('connected');
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const data = JSON.parse(event.data);
            if (data.type === 'snapshot' && Array.isArray(data.data)) {
              // Robustly map snapshot using id, bed_number, risk fields
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
                  current_hour: b.current_hour || 1,
                  risk: Number(riskVal),
                  calibrated_prob: Number(calProb),
                  conformal_label: b.conformal_label || 'no_sepsis',
                  status: b.status || (riskVal >= 0.7 ? 'critical' : riskVal >= 0.4 ? 'caution' : 'normal'),
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
                  const riskVal = b.risk !== undefined ? b.risk : (b.risk_score !== undefined ? b.risk_score : 0.15);
                  const hour = b.current_hour || data.tick;
                  const conf = b.conformal_label || 'no_sepsis';

                  updatePatientRisk(patientId, Number(riskVal), hour, conf);

                  if (b.is_alert && (b.status === 'critical' || riskVal >= 0.7)) {
                    addAlert({
                      id: Date.now() + patientId,
                      patient_id: patientId,
                      patient_code: b.patient_code || `p_A_${String(patientId).padStart(5, '0')}`,
                      bed_number: Number(b.bed_number || patientId),
                      hour: hour,
                      severity: 'critical',
                      risk_score: Number(riskVal),
                      status: 'active',
                      lead_time_hours: 5.2,
                      message: `Early Warning Alert: Bed ${b.bed_number || patientId} (${b.patient_code}) risk elevated to ${(riskVal * 100).toFixed(0)}%. Conformal status: ${conf.toUpperCase()}.`,
                      created_at: 'Just now'
                    });
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
          console.warn('[SepsisWatch-X] WebSocket Stream Closed. Reconnecting in 3s...');
          setWsStatus('disconnected');
          reconnectTimeoutRef.current = window.setTimeout(connect, 3000);
        };

        ws.onerror = (err) => {
          console.warn('[SepsisWatch-X] WebSocket Stream Error:', err);
          ws.close();
        };
      } catch (e) {
        console.warn('[SepsisWatch-X] WebSocket connection exception:', e);
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
