import React, { useState, useEffect, useRef } from 'react';
import { 
  UploadCloud, CheckCircle2, FileText, AlertCircle, Activity, 
  Sparkles, Trash2, Eye, Database, BarChart2, ShieldCheck, RefreshCw, Check
} from 'lucide-react';
import { DataQualityHeatmap3D } from '../components/3d/DataQualityHeatmap3D';

interface ValidationPreview {
  filename: string;
  detected_delimiter: string;
  total_columns_found: number;
  columns: string[];
  recognized_clinical_features: string[];
  missing_standard_features: string[];
  recognized_ratio: number;
  has_labels: boolean;
  sample_preview: Record<string, any>[];
}

interface DatasetRecord {
  id: number;
  dataset_name: string;
  file_format: string;
  file_size_bytes: number;
  delimiter: string;
  patient_count: number;
  row_count: number;
  column_count: number;
  recognized_features_count: number;
  has_labels: boolean;
  sepsis_prevalence?: number;
  status: string;
  created_at: string;
}

export const DataUpload: React.FC = () => {
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [validationPreview, setValidationPreview] = useState<ValidationPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadSuccessNotice, setUploadSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [datasetsList, setDatasetsList] = useState<DatasetRecord[]>([]);
  const [activeDatasetDetails, setActiveDatasetDetails] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Fetch persisted datasets list
  const loadDatasets = async () => {
    try {
      const res = await fetch('/api/v1/datasets');
      if (res.ok) {
        const data = await res.json();
        setDatasetsList(data);
      }
    } catch (err) {
      console.warn('[DataUpload] Error loading datasets:', err);
    }
  };

  useEffect(() => {
    loadDatasets();
  }, []);

  // Handle Drag events
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelected(e.target.files[0]);
    }
  };

  // Inspect & pre-validate selected file
  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    setUploadSuccessNotice(null);
    setIsValidating(true);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await fetch('/api/v1/datasets/validate', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Validation inspection failed');
      }

      const previewData: ValidationPreview = await res.json();
      setValidationPreview(previewData);
    } catch (err: any) {
      setErrorMessage(err.message || 'Error parsing file structure');
      setValidationPreview(null);
    } finally {
      setIsValidating(false);
    }
  };

  // Submit actual upload to backend
  const handleConfirmUpload = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('dataset_name', selectedFile.name.replace(/\.[^/.]+$/, ''));

      const res = await fetch('/api/v1/datasets/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'Dataset upload failed');
      }

      const uploadResult = await res.json();
      setUploadSuccessNotice(
        `Successfully ingested '${uploadResult.dataset_name}' (${uploadResult.row_count} records across ${uploadResult.patient_count} patient sequence(s)). Ready for downstream inference.`
      );
      setSelectedFile(null);
      setValidationPreview(null);
      loadDatasets();
    } catch (err: any) {
      setErrorMessage(err.message || 'Ingestion error');
    } finally {
      setIsUploading(false);
    }
  };

  // View specific dataset details
  const handleInspectDataset = async (id: number) => {
    try {
      const res = await fetch(`/api/v1/datasets/${id}`);
      if (res.ok) {
        const data = await res.json();
        setActiveDatasetDetails(data);
      }
    } catch (err) {
      console.warn('[DataUpload] Error inspecting dataset:', err);
    }
  };

  // Delete dataset
  const handleDeleteDataset = async (id: number) => {
    if (!confirm('Remove this dataset from SepsisWatch-X storage?')) return;
    try {
      const res = await fetch(`/api/v1/datasets/${id}`, { method: 'DELETE' });
      if (res.ok) {
        loadDatasets();
        if (activeDatasetDetails?.id === id) setActiveDatasetDetails(null);
      }
    } catch (err) {
      console.warn('[DataUpload] Error deleting dataset:', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <UploadCloud className="w-5 h-5 text-orange-500" />
            <h1 className="text-xl font-bold font-display text-[#F3EEE8]">
              Clinical Dataset Ingestion Studio & Quality Profiler
            </h1>
          </div>
          <p className="text-xs text-[#A09689] font-mono mt-0.5">
            Upload genuine clinical ICU datasets (.psv or .csv) with automatic delimiter detection, schema mapping, and missingness profiling.
          </p>
        </div>

        <button
          onClick={() => {
            // Generate synthetic demonstration CSV on the fly for quick test
            const csvContent = "HR,O2Sat,Temp,SBP,MAP,DBP,Resp,Lactate,WBC,Age,Gender,ICULOS,SepsisLabel\n82,98,37.1,120,85,68,16,1.2,7.5,64,1,1,0\n88,97,37.3,115,82,65,18,1.4,8.1,64,1,2,0\n96,96,37.8,108,78,62,20,1.9,9.8,64,1,3,0\n114,94,38.4,92,64,55,24,2.8,14.2,64,1,4,1\n126,92,38.9,84,58,50,28,3.6,18.5,64,1,5,1";
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const file = new File([blob], 'demo_icu_patient_series.csv', { type: 'text/csv' });
            handleFileSelected(file);
          }}
          className="px-3 py-1.5 rounded-lg bg-[#1E1B18] text-amber-300 text-xs font-mono border border-amber-500/30 hover:bg-[#332E29] transition flex items-center space-x-1.5"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>Load Demonstrator .csv</span>
        </button>
      </div>

      {/* Success Notification */}
      {uploadSuccessNotice && (
        <div className="bg-emerald-950/80 border border-emerald-500/50 p-4 rounded-xl flex items-center space-x-3 text-emerald-200 text-xs font-mono shadow-lg animate-fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
          <span>{uploadSuccessNotice}</span>
        </div>
      )}

      {/* Error Message */}
      {errorMessage && (
        <div className="bg-red-950/80 border border-red-500/50 p-4 rounded-xl flex items-center space-x-3 text-red-200 text-xs font-mono shadow-lg">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Zone */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-6 space-y-4">
          <div
            onDragEnter={handleDrag}
            onDragOver={handleDrag}
            onDragLeave={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`glass-panel border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition ${
              dragActive
                ? 'border-orange-400 bg-amber-950/20 glow-ember'
                : 'border-[#332E29] hover:border-amber-500/40 bg-[#151311]/40'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".psv,.csv,.tsv,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 border border-amber-500/30 flex items-center justify-center text-orange-400 mb-3 glow-ember">
              <UploadCloud className="w-7 h-7" />
            </div>
            <h3 className="text-sm font-bold text-[#F3EEE8] font-sans">
              Select or Drop Supported Clinical Dataset (.psv or .csv)
            </h3>
            <p className="text-xs text-[#A09689] font-mono mt-1 max-w-sm">
              Supports pipe-separated values (|), comma-separated values (,), and multi-patient files up to 50MB.
            </p>

            {isValidating && (
              <div className="mt-4 flex items-center space-x-2 text-orange-400 text-xs font-mono animate-pulse">
                <Activity className="w-4 h-4 animate-spin" />
                <span>Inspecting schema & delimiter...</span>
              </div>
            )}
          </div>

          {/* Validation & Preview Panel */}
          {validationPreview && (
            <div className="glass-panel p-5 rounded-xl border border-amber-500/30 space-y-4 bg-[#141210]">
              <div className="flex items-center justify-between border-b border-stone-800 pb-3">
                <div className="flex items-center space-x-2">
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span className="text-sm font-bold text-white font-mono">{validationPreview.filename}</span>
                </div>
                <div className="flex items-center space-x-2 text-xs font-mono">
                  <span className="bg-stone-800 px-2 py-0.5 rounded text-amber-300">
                    Delimiter: <strong className="text-white">{validationPreview.detected_delimiter === '|' ? 'PIPE (|)' : 'COMMA (,)'}</strong>
                  </span>
                  <span className="bg-stone-800 px-2 py-0.5 rounded text-emerald-400">
                    {validationPreview.recognized_clinical_features.length} / 40 Features
                  </span>
                </div>
              </div>

              {/* Sample Table Preview */}
              <div className="overflow-x-auto">
                <table className="w-full text-[11px] font-mono text-left">
                  <thead className="bg-stone-900 text-stone-400 border-b border-stone-800">
                    <tr>
                      {validationPreview.columns.slice(0, 7).map((col) => (
                        <th key={col} className="p-2 whitespace-nowrap">{col}</th>
                      ))}
                      {validationPreview.columns.length > 7 && <th className="p-2">+{validationPreview.columns.length - 7} more</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-800 text-stone-300">
                    {validationPreview.sample_preview.map((row, rIdx) => (
                      <tr key={rIdx} className="hover:bg-stone-900/40">
                        {validationPreview.columns.slice(0, 7).map((col) => (
                          <td key={col} className="p-2 whitespace-nowrap">
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="text-stone-600">NaN</span>}
                          </td>
                        ))}
                        {validationPreview.columns.length > 7 && <td className="p-2 text-stone-600">...</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Confirm Ingestion Button */}
              <button
                onClick={handleConfirmUpload}
                disabled={isUploading}
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-medium text-xs font-mono flex items-center justify-center space-x-2 transition shadow-lg shadow-orange-600/25 border border-amber-400/30"
              >
                {isUploading ? (
                  <>
                    <Activity className="w-4 h-4 animate-spin" />
                    <span>Parsing, Profiling & Persisting to Database...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    <span>Ingest & Persist Dataset</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {/* 3D Data Quality Visualization */}
        <div className="lg:col-span-6 glass-panel p-4 rounded-xl flex flex-col justify-between border border-amber-500/20">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <BarChart2 className="w-4 h-4 text-orange-400" />
                <h3 className="text-xs font-bold font-mono uppercase text-slate-200">
                  Spatial Missingness & Observation Latency (3D Heatmap)
                </h3>
              </div>
              <span className="text-[10px] text-stone-400 font-mono">Interactive 3D Grid</span>
            </div>
            <p className="text-[11px] text-stone-400 font-mono mb-3">
              Displays observation frequency and missing value clusters across clinical features and temporal hourly sequences.
            </p>
          </div>

          <div className="h-72 w-full rounded-lg overflow-hidden bg-[#0C0B0A] border border-stone-800">
            <DataQualityHeatmap3D />
          </div>
        </div>
      </div>

      {/* Persisted Datasets Table */}
      <div className="glass-panel p-5 rounded-xl border border-amber-500/20 space-y-4">
        <div className="flex items-center justify-between border-b border-stone-800 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white font-display">
              Persisted Research Ingestion Library
            </h3>
            <span className="bg-stone-800 text-stone-300 text-xs font-mono px-2 py-0.5 rounded">
              {datasetsList.length} Datasets
            </span>
          </div>

          <button
            onClick={loadDatasets}
            className="p-1.5 rounded bg-stone-800 text-stone-300 hover:text-white transition"
            title="Refresh datasets"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {datasetsList.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-xs font-mono">
            No uploaded datasets registered yet. Upload a .psv or .csv above to populate the library.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left">
              <thead className="bg-stone-900 text-stone-400 border-b border-stone-800">
                <tr>
                  <th className="p-3">Dataset Name</th>
                  <th className="p-3">Format</th>
                  <th className="p-3">Rows</th>
                  <th className="p-3">Patients</th>
                  <th className="p-3">Recognized Features</th>
                  <th className="p-3">Labels</th>
                  <th className="p-3">Uploaded</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-800 text-stone-300">
                {datasetsList.map((d) => (
                  <tr key={d.id} className="hover:bg-stone-900/50 transition">
                    <td className="p-3 font-semibold text-white">{d.dataset_name}</td>
                    <td className="p-3 uppercase text-amber-400">{d.file_format} ({d.delimiter})</td>
                    <td className="p-3">{d.row_count.toLocaleString()}</td>
                    <td className="p-3">{d.patient_count}</td>
                    <td className="p-3 text-emerald-400">{d.recognized_features_count} / 40</td>
                    <td className="p-3">
                      {d.has_labels ? (
                        <span className="text-emerald-400 font-semibold">Yes ({d.sepsis_prevalence ? `${(d.sepsis_prevalence * 100).toFixed(1)}%` : 'Present'})</span>
                      ) : (
                        <span className="text-stone-500">Unlabeled</span>
                      )}
                    </td>
                    <td className="p-3 text-stone-400">{new Date(d.created_at).toLocaleDateString()}</td>
                    <td className="p-3 text-right space-x-2">
                      <button
                        onClick={() => handleInspectDataset(d.id)}
                        className="px-2 py-1 rounded bg-stone-800 text-amber-300 hover:bg-stone-700 transition"
                        title="Inspect Quality Report"
                      >
                        <Eye className="w-3.5 h-3.5 inline mr-1" />
                        Inspect
                      </button>
                      <button
                        onClick={() => handleDeleteDataset(d.id)}
                        className="p-1 rounded bg-stone-800 text-stone-400 hover:text-red-400 transition"
                        title="Delete Dataset"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Selected Dataset Inspection Modal / Details */}
        {activeDatasetDetails && (
          <div className="mt-4 p-4 rounded-xl bg-stone-900/90 border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between border-b border-stone-800 pb-2">
              <span className="text-xs font-bold text-amber-300 font-mono">
                Quality Report: {activeDatasetDetails.dataset_name} (ID: {activeDatasetDetails.id})
              </span>
              <button
                onClick={() => setActiveDatasetDetails(null)}
                className="text-stone-400 hover:text-white text-xs font-mono"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs font-mono">
              <div className="bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="text-stone-500 block text-[10px]">Overall Missingness</span>
                <span className="text-base font-bold text-amber-400">
                  {((activeDatasetDetails.quality_stats?.overall_missingness || 0) * 100).toFixed(1)}%
                </span>
              </div>
              <div className="bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="text-stone-500 block text-[10px]">Patient Sequences</span>
                <span className="text-base font-bold text-emerald-400">
                  {activeDatasetDetails.patient_count}
                </span>
              </div>
              <div className="bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="text-stone-500 block text-[10px]">Hourly Observations</span>
                <span className="text-base font-bold text-blue-400">
                  {activeDatasetDetails.row_count.toLocaleString()}
                </span>
              </div>
              <div className="bg-stone-950 p-2.5 rounded border border-stone-800">
                <span className="text-stone-500 block text-[10px]">Target Labeling</span>
                <span className="text-base font-bold text-orange-400">
                  {activeDatasetDetails.has_labels ? 'Supervised' : 'Unlabeled Inference'}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
