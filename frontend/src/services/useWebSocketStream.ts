import { useEffect, useRef } from 'react';
import { useStore } from '../store/useStore';

export const useWebSocketStream = () => {
  const { setWsStatus, setPatients, updatePatientRisk, setCurrentSimHour, addAlert, isSimRunning } = useStore();
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    let isMounted = true;

    const connect = () => {
      // Determine WebSocket URL dynamically based on environment
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
              // Update patients array from initial snapshot
              const mappedPatients = data.data.map((b: any) => ({
                id: b.bed_id,
                patient_code: b.patient_code,
                hospital: b.hospital,
                age: b.age,
                gender: b.gender,
                unit1: b.hospital === 'setA' ? 1 : 0,
                unit2: b.hospital === 'setB' ? 1 : 0,
                hosp_adm_time: -12.0,
                is_active: true,
                bed_number: b.bed_id,
                current_hour: b.current_hour,
                risk: b.risk_score,
                calibrated_prob: b.calibrated_prob,
                conformal_label: b.conformal_label,
                status: b.status,
              }));
              setPatients(mappedPatients);
            } else if (data.type === 'tick') {
              if (data.tick !== undefined) {
                setCurrentSimHour(data.tick);
              }
              if (Array.isArray(data.beds)) {
                data.beds.forEach((b: any) => {
                  updatePatientRisk(b.bed_id, b.risk_score, b.current_hour || data.tick, b.conformal_label);
                  if (b.is_alert && b.status === 'critical') {
                    addAlert({
                      id: Date.now() + b.bed_id,
                      patient_id: b.bed_id,
                      patient_code: b.patient_code,
                      bed_number: b.bed_id,
                      hour: b.current_hour || data.tick,
                      severity: 'critical',
                      risk_score: b.risk_score,
                      status: 'active',
                      lead_time_hours: 5.2,
                      message: `Early Warning Alert: Bed ${b.bed_id} (${b.patient_code}) risk elevated to ${(b.risk_score * 100).toFixed(0)}%. Conformal status: ${b.conformal_label.toUpperCase()}.`,
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
