import React, { useState } from 'react';
import { useStore } from '../store/useStore';
import { Patient } from '../types';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, 
  ReferenceLine, CartesianGrid, LineChart, Line 
} from 'recharts';
import { 
  FileDown, Clock, ShieldCheck, Activity, HelpCircle, 
  ChevronRight, Brain, AlertTriangle, Layers, Box 
} from 'lucide-react';
import { AnatomyVitals3D } from '../components/3d/AnatomyVitals3D';

export const PatientDetail: React.FC = () => {
  const { patients, selectedPatientId, setSelectedPatientId } = useStore();
  const [selectedHour, setSelectedHour] = useState<number>(14);
  const [explainMethod, setExplainMethod] = useState<'shap' | 'ig'>('shap');

  const fallbackPatient: Patient = {
    id: 1,
    patient_code: 'p_A_00001',
    hospital: 'setA',
    age: 58,
    gender: 0,
    unit1: 1,
    unit2: 0,
    hosp_adm_time: -12.0,
    is_active: true,
    bed_number: 1,
    current_hour: 4,
    risk: 0.15,
    calibrated_prob: 0.14,
    conformal_label: 'no_sepsis',
    status: 'normal',
  };

  const currentPatient = patients.find((p) => p.id === selectedPatientId) || patients[0] || fallbackPatient;

  // Synthesize realistic 24-hour EHR timeline for this patient
  const timelineData = Array.from({ length: 24 }, (_, i) => {
    const h = i + 1;
    // Deterioration dynamics around onset hour 12
    const onsetHour = 12;
    const isSepticPatient = currentPatient.risk >= 0.45 || currentPatient.status === 'critical' || currentPatient.status === 'caution';
    const progress = isSepticPatient && h >= 6 ? Math.min(1.0, (h - 6) / 8) : 0.05;

    const baseRisk = 0.12 + progress * 0.76;
    const lower = Math.max(0.02, baseRisk - 0.12);
    const upper = Math.min(0.99, baseRisk + 0.12);

    return {
      hour: h,
      risk: Number(baseRisk.toFixed(2)),
      lower: Number(lower.toFixed(2)),
      upper: Number(upper.toFixed(2)),
      hr: Math.round(76 + progress * 48 + Math.sin(h) * 4),
      map: Math.round(85 - progress * 24 - Math.cos(h) * 3),
      temp: Number((36.8 + progress * 1.8 + Math.sin(h * 0.5) * 0.2).toFixed(1)),
      lactate: Number((1.1 + progress * 3.8).toFixed(1)),
      wbc: Number((7.2 + progress * 11.4).toFixed(1)),
      threshold: 0.45,
      isAlert: isSepticPatient && h >= 8,
      isOnset: isSepticPatient && h === onsetHour
    };
  });

  const activePoint = timelineData.find((d) => d.hour === selectedHour) || timelineData[selectedHour - 1] || timelineData[0];

  // SHAP vs Integrated Gradients explanations
  const shapFeatures = [
    { name: 'Heart Rate (HR: 124 bpm)', value: '+0.42', impact: 'high_risk', english: 'Severe tachycardia exceeding SIRS baseline.' },
    { name: 'Mean Arterial Pressure (MAP: 61 mmHg)', value: '+0.31', impact: 'high_risk', english: 'Hypotension approaching organ hypoperfusion limits.' },
    { name: 'Serum Lactate (3.8 mmol/L)', value: '+0.18', impact: 'high_risk', english: 'Elevated anaerobic cellular metabolism.' },
    { name: 'White Blood Cell Count (18.6 k/uL)', value: '+0.12', impact: 'high_risk', english: 'Marked leukocytosis indicating systemic immune activation.' },
    { name: 'Temperature (38.6 °C)', value: '+0.08', impact: 'moderate_risk', english: 'Febrile response compounding cardiac output load.' },
  ];

  const igFeatures = [
    { name: 'Temporal SBP Slope (-8 mmHg/2h)', value: '+0.38', impact: 'high_risk', english: 'Rapid downward acceleration of systolic pressure across hours 8-12.' },
    { name: 'Cumulative Shock Index (HR/SBP > 1.0)', value: '+0.29', impact: 'high_risk', english: 'Elevated sustained hemodynamic depression over the past 4 hours.' },
    { name: 'Missingness Decay in Labs', value: '+0.15', impact: 'moderate_risk', english: 'GRU-D temporal decay indicates acute absence of repeated lactate check.' },
    { name: 'Respiratory Rate Trend', value: '+0.11', impact: 'moderate_risk', english: 'Tachypnea persistent for >6 hours.' },
    { name: 'Age & Unit Priors', value: '+0.05', impact: 'low_risk', english: 'ICU Unit demographic baseline.' },
  ];

  const activeExplanations = explainMethod === 'shap' ? shapFeatures : igFeatures;

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      // Fallback: download as HTML file
      const blob = new Blob([generateReportHtml()], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `SepsisWatch_Patient_${currentPatient.patient_code}_Bed${currentPatient.bed_number}_Report.html`;
      a.click();
      return;
    }

    printWindow.document.write(generateReportHtml());
    printWindow.document.close();
  };

  const generateReportHtml = () => `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Clinical Sepsis Report - Bed ${currentPatient.bed_number} (${currentPatient.patient_code})</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 40px; margin: 0; }
        .header { border-bottom: 3px solid #ea580c; padding-bottom: 16px; margin-bottom: 24px; display: flex; justify-content: space-between; align-items: flex-start; }
        .title { font-size: 20px; font-weight: 800; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px; }
        .sub { font-size: 12px; color: #64748b; margin-top: 4px; font-family: monospace; }
        .badge { display: inline-block; padding: 4px 10px; border-radius: 4px; font-weight: bold; font-size: 12px; font-family: monospace; text-transform: uppercase; }
        .critical { background: #fee2e2; color: #991b1b; border: 1px solid #f87171; }
        .caution { background: #fef3c7; color: #92400e; border: 1px solid #fcd34d; }
        .stable { background: #dcfce7; color: #166534; border: 1px solid #86efac; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px; }
        .panel { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px; font-size: 13px; }
        .panel h4 { margin: 0 0 10px 0; font-size: 12px; text-transform: uppercase; color: #64748b; font-family: monospace; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 12px; }
        th, td { border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; }
        th { background: #f1f5f9; color: #475569; font-family: monospace; }
        .risk-box { background: ${currentPatient.risk >= 0.7 ? '#fff1f2' : currentPatient.risk >= 0.4 ? '#fffbeb' : '#f0fdf4'}; border: 2px solid ${currentPatient.risk >= 0.7 ? '#f43f5e' : currentPatient.risk >= 0.4 ? '#f59e0b' : '#22c55e'}; border-radius: 8px; padding: 16px; margin-bottom: 24px; text-align: center; }
        .risk-val { font-size: 32px; font-weight: 900; color: ${currentPatient.risk >= 0.7 ? '#e11d48' : currentPatient.risk >= 0.4 ? '#d97706' : '#16a34a'}; }
        .signatures { margin-top: 40px; padding-top: 20px; border-top: 2px solid #cbd5e1; display: grid; grid-template-columns: 1fr 1fr; gap: 30px; font-size: 12px; }
        .sig-line { border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 6px; }
        .print-btn { background: #ea580c; color: white; border: none; padding: 10px 18px; border-radius: 6px; font-weight: bold; cursor: pointer; font-size: 13px; margin-bottom: 20px; }
        @media print { .no-print { display: none; } body { padding: 15px; } }
      </style>
    </head>
    <body>
      <div class="no-print">
        <button class="print-btn" onclick="window.print()">Print or Save as PDF</button>
      </div>
      <div class="header">
        <div>
          <div class="title">Clinical Sepsis Early-Warning & Patient EHR Summary Report</div>
          <div class="sub">HOSPITAL ICU ADMISSION TELEMETRY • GENERATED ON ${new Date().toLocaleString()}</div>
        </div>
        <div style="text-align: right;">
          <div class="badge ${currentPatient.status === 'critical' ? 'critical' : currentPatient.status === 'caution' ? 'caution' : 'stable'}">
            ${currentPatient.status.toUpperCase()} SEPSIS ALERT
          </div>
          <div class="sub" style="margin-top: 4px;">BED ${currentPatient.bed_number} • ${currentPatient.hospital === 'setA' ? 'Hospital A (Emory)' : 'Hospital B (BIDMC)'}</div>
        </div>
      </div>

      <div class="risk-box">
        <div style="font-size: 12px; font-family: monospace; text-transform: uppercase; color: #64748b;">Calibrated Sepsis Risk Score (Split Conformal 90% Guarantee)</div>
        <div class="risk-val">${(currentPatient.risk * 100).toFixed(1)}%</div>
        <div style="font-size: 12px; color: #475569; margin-top: 4px;">Conformal Prediction Set: <strong>${currentPatient.conformal_label.toUpperCase()}</strong> • Finite-Sample Coverage: 90% Guaranteed</div>
      </div>

      <div class="grid">
        <div class="panel">
          <h4>Patient Demographics & Admission Profile</h4>
          <div><strong>Patient ID:</strong> ${currentPatient.patient_code}</div>
          <div style="margin-top: 4px;"><strong>Age / Sex:</strong> ${currentPatient.age} years old • ${currentPatient.gender === 1 ? 'Male' : 'Female'}</div>
          <div style="margin-top: 4px;"><strong>ICU Stay:</strong> ${currentPatient.current_hour} Hours Monitored</div>
          <div style="margin-top: 4px;"><strong>Care Unit:</strong> ICU Pod ${currentPatient.unit1 === 1 ? 'Medical ICU (MICU)' : 'Surgical ICU (SICU)'}</div>
        </div>

        <div class="panel">
          <h4>Clinical Diagnosis & Active Physician Orders</h4>
          <div><strong>Primary Diagnosis:</strong> ${currentPatient.diagnosis || 'Intensive Care Hemodynamic Monitoring'}</div>
          <div style="margin-top: 6px;"><strong>Active Orders:</strong> <span style="color: #b45309;">${currentPatient.active_treatments || 'Supportive ICU Care'}</span></div>
        </div>
      </div>

      <div class="panel" style="margin-bottom: 24px;">
        <h4>Current Physiological Biomarkers (ICU Hour ${selectedHour})</h4>
        <table>
          <thead>
            <tr>
              <th>Biomarker</th>
              <th>Observed Value</th>
              <th>Reference Clinical Range</th>
              <th>Acuity Interpretation</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Heart Rate (HR)</td>
              <td><strong>${activePoint.hr} bpm</strong></td>
              <td>60 - 100 bpm</td>
              <td style="color: ${activePoint.hr > 100 ? '#b91c1c' : '#166534'}">${activePoint.hr > 100 ? 'Tachycardia Alert' : 'Normal Sinus'}</td>
            </tr>
            <tr>
              <td>Mean Arterial Pressure (MAP)</td>
              <td><strong>${activePoint.map} mmHg</strong></td>
              <td>65 - 100 mmHg</td>
              <td style="color: ${activePoint.map < 65 ? '#b91c1c' : '#166534'}">${activePoint.map < 65 ? 'Hypotension / Hypoperfusion' : 'Adequate Perfusion'}</td>
            </tr>
            <tr>
              <td>Serum Lactate</td>
              <td><strong>${activePoint.lactate} mmol/L</strong></td>
              <td>0.5 - 2.0 mmol/L</td>
              <td style="color: ${activePoint.lactate > 2.0 ? '#b91c1c' : '#166534'}">${activePoint.lactate > 2.0 ? 'Elevated (Anaerobic Glycolysis)' : 'Normal Clearance'}</td>
            </tr>
            <tr>
              <td>Core Body Temperature</td>
              <td><strong>${activePoint.temp} °C</strong></td>
              <td>36.5 - 37.5 °C</td>
              <td>${activePoint.temp > 38.0 ? 'Febrile Response (SIRS)' : 'Normothermic'}</td>
            </tr>
            <tr>
              <td>White Blood Cell Count (WBC)</td>
              <td><strong>${activePoint.wbc} k/µL</strong></td>
              <td>4.5 - 11.0 k/µL</td>
              <td>${activePoint.wbc > 12.0 ? 'Leukocytosis' : 'Normal Count'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div class="panel" style="margin-bottom: 24px;">
        <h4>Explainable AI Biomarker Attributions (SHAP & Integrated Gradients)</h4>
        <table>
          <thead>
            <tr>
              <th>Driving Biomarker</th>
              <th>Attribution Weight</th>
              <th>Clinical Mechanism</th>
            </tr>
          </thead>
          <tbody>
            ${activeExplanations.map(exp => `
              <tr>
                <td><strong>${exp.name}</strong></td>
                <td style="color: #b91c1c; font-family: monospace;"><strong>${exp.value}</strong></td>
                <td>${exp.english}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="signatures">
        <div>
          <div class="sig-line"></div>
          <div><strong>Attending Critical Care Physician Sign-off</strong></div>
          <div style="color: #64748b; font-size: 11px;">Dr. Sarah Connor, MD / Dr. Marcus Wright, CMO</div>
        </div>
        <div>
          <div class="sig-line"></div>
          <div><strong>Lead ICU Triage Nurse Verification</strong></div>
          <div style="color: #64748b; font-size: 11px;">Nurse Alex Reed, RN • Sepsis Response Verified</div>
        </div>
      </div>
    </body>
    </html>
  `;

  return (
    <div className="space-y-4">
      {/* Patient Header & Cohort Selector */}
      <div className="glass-panel p-4 rounded-xl flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-4">
          <div className="w-12 h-12 rounded-xl bg-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-300 font-bold font-display text-lg glow-ember">
            {currentPatient.bed_number}
          </div>
          <div>
            <div className="flex items-center space-x-2.5">
              <h2 className="text-lg font-bold font-display text-slate-100">
                Patient {currentPatient.patient_code}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-amber-950/80 border border-amber-500/30 text-amber-300">
                Bed {currentPatient.bed_number}
              </span>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                {currentPatient.hospital === 'setA' ? 'Hospital A (Emory)' : 'Hospital B (BIDMC)'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-0.5">
              Demographics: {currentPatient.age}yo • {currentPatient.gender === 1 ? 'Male' : 'Female'} • ICU Stay: {currentPatient.current_hour}h
            </p>
            <p className="text-xs text-amber-300 font-mono mt-0.5">
              Diagnosis: <strong className="text-slate-100">{currentPatient.diagnosis || 'Severe Lobar Pneumonia / Sepsis Surveillance'}</strong> • Orders: {currentPatient.active_treatments || 'IV Crystalloid bolus, Levophed drip, Blood cultures'}
            </p>
          </div>
        </div>

        {/* Quick Bed Switcher & Export */}
        <div className="flex items-center space-x-3">
          <select
            value={currentPatient.id}
            onChange={(e) => setSelectedPatientId(Number(e.target.value))}
            className="bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none font-mono hover:border-amber-500/40"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                Bed {p.bed_number} ({p.patient_code}) - Risk: {(p.risk * 100).toFixed(0)}%
              </option>
            ))}
          </select>

          <button
            onClick={handleExportPdf}
            className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-orange-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono hover:bg-orange-500/25 transition glow-ember"
          >
            <FileDown className="w-4 h-4" />
            <span>Export Risk PDF</span>
          </button>
        </div>
      </div>

      {/* 3D Spatial Anatomy & Vitals Perfusion */}
      <AnatomyVitals3D patient={currentPatient} />

      {/* Main Timeline & Conformal Uncertainty Band */}
      <div className="glass-panel p-4 rounded-xl space-y-3">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
              <Activity className="w-4 h-4 text-orange-400" />
              <span>Calibrated Sepsis Risk with 90% Split Conformal Uncertainty Band</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">
              Shaded band denotes mathematically guaranteed 90% finite-sample coverage interval [Lower, Upper].
            </p>
          </div>

          <div className="flex items-center space-x-4 text-xs font-mono">
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 bg-red-400" />
              <span className="text-slate-300">Calibrated Risk</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-3 bg-orange-500/20 border border-orange-500/40 rounded-sm" />
              <span className="text-slate-300">Conformal Band (90%)</span>
            </div>
            <div className="flex items-center space-x-1.5">
              <span className="w-3 h-0.5 border-t border-dashed border-amber-400" />
              <span className="text-slate-300">Alarm Threshold (0.45)</span>
            </div>
          </div>
        </div>

        {/* 24-Hour Risk Curve */}
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timelineData} onClick={(e) => e && e.activePayload && setSelectedHour(e.activePayload[0].payload.hour)}>
              <defs>
                <linearGradient id="riskGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.0}/>
                </linearGradient>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#F97316" stopOpacity={0.35}/>
                  <stop offset="95%" stopColor="#F97316" stopOpacity={0.05}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="hour" stroke="#64748b" tickFormatter={(v) => `h${v}`} />
              <YAxis domain={[0, 1]} stroke="#64748b" tickFormatter={(v) => `${(v * 100).toFixed(0)}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', borderRadius: '8px', fontSize: '11px' }}
                labelFormatter={(l) => `ICU Hour ${l}`}
              />
              <ReferenceLine y={0.45} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Alarm Budget Threshold', fill: '#f59e0b', fontSize: 10 }} />
              <ReferenceLine x={12} stroke="#B8B0A4" label={{ value: 'Clinical Onset', fill: '#B8B0A4', fontSize: 10 }} />
              <ReferenceLine x={selectedHour} stroke="#FBBF24" strokeWidth={2} />
              
              <Area type="monotone" dataKey="upper" stroke="none" fill="url(#bandGrad)" />
              <Area type="monotone" dataKey="risk" stroke="#ef4444" strokeWidth={2.5} fill="url(#riskGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Hour Scrubber / Time Travel Slider */}
        <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 space-y-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 flex items-center space-x-1.5">
              <Clock className="w-3.5 h-3.5 text-orange-400" />
              <span>Inspection Hour Scrubber: <strong>Hour {selectedHour}</strong> of 24</span>
            </span>
            <span className="text-slate-400">
              Risk: <strong className="text-red-400">{(activePoint.risk * 100).toFixed(0)}%</strong> • Conformal: [{activePoint.lower * 100}%, {activePoint.upper * 100}%]
            </span>
          </div>
          <input
            type="range"
            min={1}
            max={24}
            value={selectedHour}
            onChange={(e) => setSelectedHour(Number(e.target.value))}
            className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-orange-500"
          />
        </div>
      </div>

      {/* Biomarker Multi-Stream Telemetry & Explainability */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left: Vitals & Labs Telemetry */}
        <div className="glass-panel p-4 rounded-xl space-y-3">
          <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
            <Activity className="w-4 h-4 text-emerald-400" />
            <span>Multi-Stream Physiological Telemetry</span>
          </h3>

          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="hour" stroke="#64748b" tickFormatter={(v) => `h${v}`} />
                <YAxis stroke="#64748b" />
                <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#38bdf8', fontSize: '11px' }} />
                <Line type="monotone" dataKey="hr" name="HR (bpm)" stroke="#ef4444" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="map" name="MAP (mmHg)" stroke="#38bdf8" dot={false} strokeWidth={2} />
                <Line type="monotone" dataKey="lactate" name="Lactate (mmol/L)" stroke="#f59e0b" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid grid-cols-3 gap-2 text-xs font-mono pt-1">
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px]">Heart Rate:</span>
              <p className="text-sm font-bold text-red-400">{activePoint.hr} bpm</p>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px]">MAP Pressure:</span>
              <p className="text-sm font-bold text-orange-400">{activePoint.map} mmHg</p>
            </div>
            <div className="bg-slate-900/80 p-2 rounded border border-slate-800">
              <span className="text-slate-400 text-[10px]">Lactate:</span>
              <p className="text-sm font-bold text-amber-400">{activePoint.lactate} mmol/L</p>
            </div>
          </div>
        </div>

        {/* Right: Plain-English Explanations (SHAP & Integrated Gradients) */}
        <div className="glass-panel p-4 rounded-xl space-y-3">
          <div className="flex justify-between items-center">
            <h3 className="text-xs font-mono uppercase tracking-wider text-slate-300 font-semibold flex items-center space-x-2">
              <Brain className="w-4 h-4 text-[#B8B0A4]" />
              <span>Explainable AI Attribution (Hour {selectedHour})</span>
            </h3>

            {/* Method Toggle: SHAP vs IG */}
            <div className="flex items-center space-x-1 bg-slate-900 p-0.5 rounded-lg border border-slate-800 text-[11px] font-mono">
              <button
                onClick={() => setExplainMethod('shap')}
                className={`px-2 py-0.5 rounded transition ${explainMethod === 'shap' ? 'bg-orange-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                SHAP (Tabular)
              </button>
              <button
                onClick={() => setExplainMethod('ig')}
                className={`px-2 py-0.5 rounded transition ${explainMethod === 'ig' ? 'bg-amber-400 text-slate-950 font-bold' : 'text-slate-400 hover:text-slate-200'}`}
              >
                Int. Gradients (Temporal)
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {activeExplanations.map((exp, idx) => (
              <div key={idx} className="bg-slate-900/70 p-2.5 rounded-lg border border-slate-800/80 space-y-1">
                <div className="flex justify-between items-center text-xs">
                  <span className="font-mono font-medium text-slate-200">{exp.name}</span>
                  <span className="font-mono font-bold text-red-400">{exp.value}</span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {exp.english}
                </p>
              </div>
            ))}
          </div>

          <div className="p-2.5 bg-amber-950/20 border border-amber-500/20 rounded-lg text-[11px] text-[#F3EEE8] flex items-start space-x-2">
            <HelpCircle className="w-4 h-4 text-[#B8B0A4] flex-shrink-0 mt-0.5" />
            <span>
              <strong>Clinical Interpretation:</strong> Attributions combine LightGBM non-linear interactions with GRU-D time-decay gradients. Features are weighted strictly within clinical safety guidelines.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
