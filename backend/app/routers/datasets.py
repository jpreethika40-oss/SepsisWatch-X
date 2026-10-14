"""
Dataset Upload & Ingestion Router for SepsisWatch-X.
Supports genuine .psv, .csv, .tsv ICU telemetry uploads with automatic
delimiter detection, schema inspection, missingness profiling, and database persistence.
"""

import os
import io
import re
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional

import pandas as pd
import numpy as np
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Depends
from sqlalchemy import select, delete, desc
from sqlalchemy.ext.asyncio import AsyncSession

from backend.app.db.session import AsyncSessionLocal, sync_engine
from backend.app.db.base import Base
from backend.app.db.models import UploadedDataset

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])

UPLOAD_DIR = Path("data/uploads")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

# Ensure database tables are created (including uploaded_datasets)
try:
    Base.metadata.create_all(bind=sync_engine)
except Exception as e:
    print(f"[DatasetsRouter] Warning ensuring tables: {e}")

# Standard 40 Clinical ICU Features (PhysioNet CinC 2019 reference schema)
STANDARD_CLINICAL_FEATURES = [
    "HR", "O2Sat", "Temp", "SBP", "MAP", "DBP", "Resp", "EtCO2",
    "BaseExcess", "HCO3", "FiO2", "pH", "PaCO2", "SaO2", "AST", "BUN",
    "Alkalinephos", "Calcium", "Chloride", "Creatinine", "Bilirubin_direct",
    "Glucose", "Lactate", "Magnesium", "Phosphate", "Potassium",
    "Bilirubin_total", "TroponinI", "Hct", "Hgb", "PTT", "WBC",
    "Fibrinogen", "Platelets", "Age", "Gender", "Unit1", "Unit2",
    "HospAdmTime", "ICULOS"
]


async def get_db() -> AsyncSession:
    async with AsyncSessionLocal() as session:
        yield session


def detect_delimiter(sample_text: str) -> str:
    """Sniffs the most probable delimiter from sample text."""
    lines = [line.strip() for line in sample_text.splitlines() if line.strip()][:10]
    if not lines:
        return "|"

    delimiters = ["|", ",", "\t", ";"]
    counts = {d: 0 for d in delimiters}
    for line in lines:
        for d in delimiters:
            counts[d] += line.count(d)

    best_delimiter = max(counts, key=counts.get)
    # If no delimiter found, default to pipe for PSV
    return best_delimiter if counts[best_delimiter] > 0 else "|"


@router.post("/validate")
async def validate_dataset_preview(file: UploadFile = File(...)) -> Dict[str, Any]:
    """
    Inspects and pre-validates uploaded file without full ingestion.
    Returns detected delimiter, recognized vs missing columns, sample rows, and schema status.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename provided")

    raw_bytes = await file.read(65536) # Read first 64KB for inspection
    if not raw_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes)")

    try:
        sample_str = raw_bytes.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Encoding error reading file: {str(e)}")

    delimiter = detect_delimiter(sample_str)

    try:
        df_preview = pd.read_csv(io.StringIO(sample_str), sep=delimiter, nrows=10)
    except Exception as e:
        # Fallback to comma if pipe failed
        try:
            df_preview = pd.read_csv(io.StringIO(sample_str), sep=",", nrows=10)
            delimiter = ","
        except Exception:
            raise HTTPException(status_code=400, detail=f"Failed to parse tabular data: {str(e)}")

    found_cols = [str(c).strip() for c in df_preview.columns]
    found_cols_lower = {c.lower(): c for c in found_cols}

    recognized = []
    missing = []
    for ref_col in STANDARD_CLINICAL_FEATURES:
        if ref_col.lower() in found_cols_lower:
            recognized.append(found_cols_lower[ref_col.lower()])
        else:
            missing.append(ref_col)

    has_labels = "sepsislabel" in found_cols_lower or "sepsis_label" in found_cols_lower or "label" in found_cols_lower
    preview_records = df_preview.head(5).replace({np.nan: None}).to_dict(orient="records")

    return {
        "filename": file.filename,
        "detected_delimiter": delimiter,
        "total_columns_found": len(found_cols),
        "columns": found_cols,
        "recognized_clinical_features": recognized,
        "missing_standard_features": missing,
        "recognized_ratio": round(len(recognized) / len(STANDARD_CLINICAL_FEATURES), 2),
        "has_labels": has_labels,
        "sample_preview": preview_records
    }


@router.post("/upload")
async def upload_dataset(
    file: UploadFile = File(...),
    dataset_name: Optional[str] = Form(None),
    db: AsyncSession = Depends(get_db)
) -> Dict[str, Any]:
    """
    Full dataset upload, validation, quality metrics profiling, and persistence.
    Saves file to data/uploads/ and registers in uploaded_datasets table.
    """
    if not file.filename:
        raise HTTPException(status_code=400, detail="Empty filename provided")

    content = await file.read()
    file_size = len(content)
    if file_size == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty (0 bytes)")
    if file_size > 50 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File exceeds 50MB research upload limit")

    try:
        text_content = content.decode("utf-8", errors="replace")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"File encoding error: {str(e)}")

    delimiter = detect_delimiter(text_content[:10000])

    try:
        df = pd.read_csv(io.StringIO(text_content), sep=delimiter)
    except Exception:
        # Retry with comma delimiter
        try:
            df = pd.read_csv(io.StringIO(text_content), sep=",")
            delimiter = ","
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Tabular parsing error: {str(e)}")

    if df.empty or len(df.columns) < 2:
        raise HTTPException(status_code=400, detail="Dataset must contain at least 2 columns with valid rows")

    clean_name = dataset_name.strip() if dataset_name and dataset_name.strip() else Path(file.filename).stem
    file_ext = "psv" if delimiter == "|" else "csv"
    timestamp_str = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    target_filename = f"{clean_name}_{timestamp_str}.{file_ext}"
    target_path = UPLOAD_DIR / target_filename

    # Save to disk
    with open(target_path, "wb") as f:
        f.write(content)

    # Column inspection
    columns = [str(c).strip() for c in df.columns]
    cols_lower = {c.lower(): c for c in columns}

    recognized = []
    missing = []
    for ref in STANDARD_CLINICAL_FEATURES:
        if ref.lower() in cols_lower:
            recognized.append(cols_lower[ref.lower()])
        else:
            missing.append(ref)

    # Detect patient boundary count
    patient_col = None
    for candidate in ["patient_id", "patientid", "patient_code", "id"]:
        if candidate in cols_lower:
            patient_col = cols_lower[candidate]
            break

    if patient_col:
        patient_count = int(df[patient_col].nunique())
    else:
        # Default single patient file if standard hourly psv format
        patient_count = 1

    # Check labels & prevalence
    has_labels = False
    prevalence = None
    label_col = None
    for cand in ["sepsislabel", "sepsis_label", "label", "target"]:
        if cand in cols_lower:
            label_col = cols_lower[cand]
            has_labels = True
            try:
                prevalence = float(df[label_col].mean())
            except Exception:
                prevalence = 0.0
            break

    # Calculate missingness per recognized feature
    quality_stats: Dict[str, Any] = {
        "overall_missingness": round(float(df.isna().sum().sum()) / max(1, (df.shape[0] * df.shape[1])), 4),
        "feature_missingness": {},
        "vitals_summary": {}
    }

    for col in columns:
        pct_missing = round(float(df[col].isna().sum()) / max(1, len(df)), 4)
        quality_stats["feature_missingness"][col] = pct_missing

    # Vitals distributions for available standard features
    for v_col in ["HR", "MAP", "Resp", "Temp", "O2Sat", "Lactate", "WBC"]:
        if v_col in df.columns:
            s = pd.to_numeric(df[v_col], errors="coerce").dropna()
            if not s.empty:
                quality_stats["vitals_summary"][v_col] = {
                    "mean": round(float(s.mean()), 2),
                    "min": round(float(s.min()), 2),
                    "max": round(float(s.max()), 2),
                    "median": round(float(s.median()), 2)
                }

    # Persist in SQLite DB
    db_dataset = UploadedDataset(
        dataset_name=clean_name,
        file_format=file_ext,
        file_path=str(target_path),
        file_size_bytes=file_size,
        delimiter=delimiter,
        patient_count=patient_count,
        row_count=len(df),
        column_count=len(columns),
        columns_json=columns,
        recognized_columns_json=recognized,
        missing_columns_json=missing,
        quality_stats_json=quality_stats,
        has_labels=has_labels,
        sepsis_prevalence=round(prevalence, 4) if prevalence is not None else None,
        status="ready"
    )

    db.add(db_dataset)
    await db.commit()
    await db.refresh(db_dataset)

    return {
        "success": True,
        "id": db_dataset.id,
        "dataset_name": db_dataset.dataset_name,
        "file_format": db_dataset.file_format,
        "file_size_bytes": db_dataset.file_size_bytes,
        "row_count": db_dataset.row_count,
        "patient_count": db_dataset.patient_count,
        "column_count": db_dataset.column_count,
        "recognized_features_count": len(recognized),
        "has_labels": db_dataset.has_labels,
        "sepsis_prevalence": db_dataset.sepsis_prevalence,
        "quality_stats": db_dataset.quality_stats_json,
        "created_at": db_dataset.created_at.isoformat()
    }


@router.get("")
async def list_datasets(db: AsyncSession = Depends(get_db)) -> List[Dict[str, Any]]:
    """Returns all persisted uploaded datasets."""
    result = await db.execute(select(UploadedDataset).order_by(desc(UploadedDataset.created_at)))
    datasets = result.scalars().all()

    return [
        {
            "id": d.id,
            "dataset_name": d.dataset_name,
            "file_format": d.file_format,
            "file_size_bytes": d.file_size_bytes,
            "delimiter": d.delimiter,
            "patient_count": d.patient_count,
            "row_count": d.row_count,
            "column_count": d.column_count,
            "recognized_features_count": len(d.recognized_columns_json or []),
            "has_labels": d.has_labels,
            "sepsis_prevalence": d.sepsis_prevalence,
            "status": d.status,
            "created_at": d.created_at.isoformat()
        }
        for d in datasets
    ]


@router.get("/{dataset_id}")
async def get_dataset_details(dataset_id: int, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Returns dataset metadata, quality report, and first 15 preview rows from disk."""
    result = await db.execute(select(UploadedDataset).where(UploadedDataset.id == dataset_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")

    preview_rows = []
    if os.path.exists(d.file_path):
        try:
            df_preview = pd.read_csv(d.file_path, sep=d.delimiter, nrows=15)
            preview_rows = df_preview.replace({np.nan: None}).to_dict(orient="records")
        except Exception as e:
            print(f"[DatasetsRouter] Preview read error: {e}")

    return {
        "id": d.id,
        "dataset_name": d.dataset_name,
        "file_format": d.file_format,
        "file_path": d.file_path,
        "file_size_bytes": d.file_size_bytes,
        "delimiter": d.delimiter,
        "patient_count": d.patient_count,
        "row_count": d.row_count,
        "column_count": d.column_count,
        "columns": d.columns_json,
        "recognized_columns": d.recognized_columns_json,
        "missing_columns": d.missing_columns_json,
        "quality_stats": d.quality_stats_json,
        "has_labels": d.has_labels,
        "sepsis_prevalence": d.sepsis_prevalence,
        "status": d.status,
        "created_at": d.created_at.isoformat(),
        "preview_rows": preview_rows
    }


@router.delete("/{dataset_id}")
async def delete_dataset(dataset_id: int, db: AsyncSession = Depends(get_db)) -> Dict[str, Any]:
    """Removes dataset file and database record."""
    result = await db.execute(select(UploadedDataset).where(UploadedDataset.id == dataset_id))
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(status_code=404, detail="Dataset not found")

    if os.path.exists(d.file_path):
        try:
            os.remove(d.file_path)
        except Exception as e:
            print(f"[DatasetsRouter] Warning deleting file: {e}")

    await db.delete(d)
    await db.commit()

    return {"success": True, "message": f"Dataset {d.dataset_name} (ID: {dataset_id}) removed"}
