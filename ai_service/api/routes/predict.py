from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Optional, List
import os
import random
import math
from datetime import datetime, timedelta
import requests

router = APIRouter()

# ─── Regional Disease Profiles ─────────────────────────────
COIMBATORE_REGIONS = {
    "Neelambur": {
        "profile": {"Influenza": 0.22, "Dengue Fever": 0.18, "Gastroenteritis": 0.12, "Hypertension": 0.15, "Asthma": 0.08, "Common Cold": 0.15, "Type 2 Diabetes": 0.10},
        "population": 35000, "hospitals": 3, "risk_factor": 1.1
    },
    "Saravampatti": {
        "profile": {"Influenza": 0.18, "Dengue Fever": 0.25, "Type 2 Diabetes": 0.14, "Hypertension": 0.13, "Malaria": 0.07, "Common Cold": 0.13, "Gastroenteritis": 0.10},
        "population": 28000, "hospitals": 2, "risk_factor": 1.2
    },
    "Peelamedu": {
        "profile": {"Hypertension": 0.20, "Type 2 Diabetes": 0.18, "Common Cold": 0.15, "Influenza": 0.14, "Allergic Rhinitis": 0.10, "Bronchitis": 0.08, "Gastroenteritis": 0.15},
        "population": 45000, "hospitals": 5, "risk_factor": 0.95
    },
    "Gandhipuram": {
        "profile": {"Common Cold": 0.18, "Hypertension": 0.17, "Type 2 Diabetes": 0.16, "Influenza": 0.13, "Anxiety Disorders": 0.09, "Dengue Fever": 0.10, "Gastroenteritis": 0.17},
        "population": 60000, "hospitals": 8, "risk_factor": 0.9
    },
    "Ukkadam": {
        "profile": {"Dengue Fever": 0.22, "Gastroenteritis": 0.18, "Influenza": 0.15, "Skin Infections": 0.12, "Typhoid": 0.08, "Common Cold": 0.13, "Hypertension": 0.12},
        "population": 38000, "hospitals": 3, "risk_factor": 1.15
    },
}

# ─── Medicine Recommendations Database ─────────────────────
MEDICINE_MAP = {
    "Influenza": {
        "medicines": [
            {"name": "Oseltamivir (Tamiflu)", "dosage": "75mg", "frequency": "BD", "duration": "5 days"},
            {"name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration": "3 days"},
            {"name": "Cetirizine", "dosage": "10mg", "frequency": "OD", "duration": "5 days"},
        ]
    },
    "Dengue Fever": {
        "medicines": [
            {"name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration": "5 days"},
            {"name": "ORS (Oral Rehydration)", "dosage": "1 sachet", "frequency": "TID", "duration": "7 days"},
            {"name": "Platelet-boosting supplements", "dosage": "As directed", "frequency": "OD", "duration": "7 days"},
        ]
    },
    "Hypertension": {
        "medicines": [
            {"name": "Amlodipine", "dosage": "5mg", "frequency": "OD", "duration": "30 days"},
            {"name": "Losartan", "dosage": "50mg", "frequency": "OD", "duration": "30 days"},
        ]
    },
    "Type 2 Diabetes": {
        "medicines": [
            {"name": "Metformin", "dosage": "500mg", "frequency": "BD", "duration": "30 days"},
            {"name": "Glimepiride", "dosage": "1mg", "frequency": "OD", "duration": "30 days"},
        ]
    },
    "Common Cold": {
        "medicines": [
            {"name": "Cetirizine", "dosage": "10mg", "frequency": "OD", "duration": "5 days"},
            {"name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration": "3 days"},
            {"name": "Steam Inhalation", "dosage": "-", "frequency": "BD", "duration": "5 days"},
        ]
    },
    "Gastroenteritis": {
        "medicines": [
            {"name": "ORS", "dosage": "1 sachet", "frequency": "TID", "duration": "3 days"},
            {"name": "Omeprazole", "dosage": "20mg", "frequency": "BD", "duration": "5 days"},
            {"name": "Loperamide", "dosage": "2mg", "frequency": "SOS", "duration": "2 days"},
        ]
    },
    "Asthma": {
        "medicines": [
            {"name": "Salbutamol Inhaler", "dosage": "2 puffs", "frequency": "SOS", "duration": "As needed"},
            {"name": "Montelukast", "dosage": "10mg", "frequency": "HS", "duration": "30 days"},
        ]
    },
    "Bronchitis": {
        "medicines": [
            {"name": "Ambroxol", "dosage": "30mg", "frequency": "BD", "duration": "5 days"},
            {"name": "Azithromycin", "dosage": "500mg", "frequency": "OD", "duration": "3 days"},
        ]
    },
    "Allergic Rhinitis": {
        "medicines": [
            {"name": "Cetirizine", "dosage": "10mg", "frequency": "OD", "duration": "7 days"},
            {"name": "Fluticasone Nasal Spray", "dosage": "2 sprays", "frequency": "OD", "duration": "14 days"},
        ]
    },
    "Skin Infections": {
        "medicines": [
            {"name": "Clotrimazole Cream", "dosage": "Apply thin layer", "frequency": "BD", "duration": "14 days"},
            {"name": "Cetirizine", "dosage": "10mg", "frequency": "OD", "duration": "5 days"},
        ]
    },
    "Typhoid": {
        "medicines": [
            {"name": "Azithromycin", "dosage": "500mg", "frequency": "OD", "duration": "7 days"},
            {"name": "Paracetamol", "dosage": "500mg", "frequency": "TID", "duration": "5 days"},
        ]
    },
    "Malaria": {
        "medicines": [
            {"name": "Chloroquine", "dosage": "600mg base", "frequency": "See schedule", "duration": "3 days"},
            {"name": "Primaquine", "dosage": "15mg", "frequency": "OD", "duration": "14 days"},
        ]
    },
}

BACKEND_URL = os.environ.get("BACKEND_URL", "http://backend:5000/api")

# ─── Request/Response Models ───────────────────────────────
class PredictionRequest(BaseModel):
    region: str = "Neelambur"
    days_ahead: int = 30

class MedicineRequest(BaseModel):
    disease: str

class RestockRequest(BaseModel):
    days_ahead: int = 30

class InteractionRequest(BaseModel):
    drugs: List[str]


# ─── Prediction Logic ─────────────────────────────────────
def compute_predictions(region_data: dict, days_ahead: int, region_name: str):
    """Generate disease predictions based on regional profile."""
    predictions = []
    population = region_data["population"]
    risk_factor = region_data["risk_factor"]

    # Seasonal adjustment
    month = datetime.now().month
    seasonal = {
        "Influenza": 1.4 if month in [11, 12, 1, 2] else 0.8,
        "Dengue Fever": 1.5 if month in [6, 7, 8, 9, 10] else 0.6,
        "Malaria": 1.3 if month in [7, 8, 9, 10] else 0.7,
        "Common Cold": 1.3 if month in [10, 11, 12, 1] else 0.9,
        "Gastroenteritis": 1.2 if month in [4, 5, 6] else 0.9,
    }

    for disease, base_rate in region_data["profile"].items():
        season_mult = seasonal.get(disease, 1.0)
        daily_rate = base_rate * population * risk_factor * season_mult / 365
        predicted_cases = round(daily_rate * days_ahead)
        avg_daily = round(daily_rate, 1)
        
        # Trend based on seasonal direction
        if season_mult > 1.1:
            trend = "rising"
        elif season_mult < 0.85:
            trend = "declining"
        else:
            trend = "stable"

        confidence = min(0.95, 0.7 + (population / 100000) * 0.15 + (0.05 if len(region_data["profile"]) > 5 else 0))

        predictions.append({
            "disease": disease,
            "region": region_name,
            "predicted_cases_30d": predicted_cases,
            "avg_daily_cases": avg_daily,
            "trend": trend,
            "confidence": round(confidence, 2),
            "risk_factor": round(risk_factor * season_mult, 2),
        })

    return sorted(predictions, key=lambda x: x["predicted_cases_30d"], reverse=True)


# ─── Disease Prediction Endpoint ──────────────────────────
@router.post("/disease")
async def predict_disease(req: PredictionRequest):
    region_name = req.region

    # Handle "Overall" district aggregate
    if region_name == "Overall":
        all_predictions = {}
        for name, data in COIMBATORE_REGIONS.items():
            preds = compute_predictions(data, req.days_ahead, name)
            for p in preds:
                disease = p["disease"]
                if disease not in all_predictions:
                    all_predictions[disease] = {"disease": disease, "region": "Overall (Coimbatore)", "predicted_cases_30d": 0, "avg_daily_cases": 0, "trend": "stable", "confidence": 0, "trend_scores": []}
                all_predictions[disease]["predicted_cases_30d"] += p["predicted_cases_30d"]
                all_predictions[disease]["avg_daily_cases"] += p["avg_daily_cases"]
                all_predictions[disease]["confidence"] = max(all_predictions[disease]["confidence"], p["confidence"])
                all_predictions[disease]["trend_scores"].append(1 if p["trend"] == "rising" else -1 if p["trend"] == "declining" else 0)

        for d in all_predictions.values():
            avg_trend = sum(d.pop("trend_scores")) / max(len(COIMBATORE_REGIONS), 1)
            d["trend"] = "rising" if avg_trend > 0.3 else "declining" if avg_trend < -0.3 else "stable"
            d["avg_daily_cases"] = round(d["avg_daily_cases"], 1)

        predictions = sorted(all_predictions.values(), key=lambda x: x["predicted_cases_30d"], reverse=True)
        return {"predictions": predictions[:10], "region": "Overall (Coimbatore)", "period_days": req.days_ahead, "data_source": "simulated"}

    # Specific region
    region_data = COIMBATORE_REGIONS.get(region_name)
    if not region_data:
        raise HTTPException(status_code=400, detail=f"Unknown region: {region_name}. Available: {', '.join(list(COIMBATORE_REGIONS.keys()) + ['Overall'])}")

    predictions = compute_predictions(region_data, req.days_ahead, region_name)
    return {"predictions": predictions[:10], "region": region_name, "period_days": req.days_ahead, "data_source": "simulated"}


# ─── Medicine Recommendation Endpoint ─────────────────────
@router.post("/recommend-medicine")
async def recommend_medicine(req: MedicineRequest):
    disease = req.disease
    entry = MEDICINE_MAP.get(disease)
    if not entry:
        # Fuzzy match
        for key in MEDICINE_MAP:
            if key.lower() in disease.lower() or disease.lower() in key.lower():
                entry = MEDICINE_MAP[key]
                disease = key
                break

    if not entry:
        return {
            "disease": disease,
            "recommended_medicines": [disease.split()[0] + " treatment — consult doctor"],
            "detailed_medicines": [],
            "note": "No specific recommendation found. Please consult a specialist."
        }

    return {
        "disease": disease,
        "recommended_medicines": [m["name"] for m in entry["medicines"]],
        "detailed_medicines": entry["medicines"],
        "note": "AI-generated recommendation. Always verify with attending physician."
    }


# ─── Restock / Inventory Forecast ─────────────────────────
@router.get("/restock")
async def restock_recommendations():
    # Try to fetch real inventory from backend
    try:
        response = requests.get(f"{BACKEND_URL}/inventory", timeout=3, headers={"Authorization": "Bearer demo-token"})
        if response.status_code == 200:
            inventory = response.json()
            recs = []
            for item in (inventory if isinstance(inventory, list) else inventory.get("items", [])):
                stock = item.get("stock_quantity", item.get("quantity", 0))
                name = item.get("name", item.get("medicine_name", "Unknown"))
                demand_30d = max(stock * 2, 100)  # Simple estimation
                days_remaining = round(stock / max(demand_30d / 30, 1))
                urgency = "critical" if days_remaining <= 7 else "high" if days_remaining <= 14 else "medium" if days_remaining <= 21 else "low"
                recs.append({
                    "medicine_name": name,
                    "current_stock": stock,
                    "predicted_demand_30d": demand_30d,
                    "recommended_order_qty": max(demand_30d - stock, 0) + 200,
                    "urgency_level": urgency,
                    "estimated_days_remaining": days_remaining,
                    "confidence": 0.85,
                    "data_source": "live"
                })
            if recs:
                return {"recommendations": sorted(recs, key=lambda x: x["estimated_days_remaining"])[:10], "data_source": "live"}
    except Exception:
        pass

    # Fallback simulation
    medicines = [
        {"name": "Azithromycin 500mg", "stock": 200, "demand": 750},
        {"name": "Paracetamol 500mg", "stock": 1500, "demand": 2400},
        {"name": "Amoxicillin 500mg", "stock": 450, "demand": 900},
        {"name": "Cetirizine 10mg", "stock": 800, "demand": 1350},
        {"name": "Omeprazole 20mg", "stock": 600, "demand": 1100},
        {"name": "Metformin 500mg", "stock": 350, "demand": 800},
        {"name": "Amlodipine 5mg", "stock": 280, "demand": 600},
    ]

    recs = []
    for med in medicines:
        days_remaining = round(med["stock"] / max(med["demand"] / 30, 1))
        urgency = "critical" if days_remaining <= 7 else "high" if days_remaining <= 14 else "medium" if days_remaining <= 21 else "low"
        recs.append({
            "medicine_name": med["name"],
            "current_stock": med["stock"],
            "predicted_demand_30d": med["demand"],
            "recommended_order_qty": max(med["demand"] - med["stock"], 0) + 200,
            "urgency_level": urgency,
            "estimated_days_remaining": days_remaining,
            "confidence": 0.82,
            "data_source": "simulated"
        })

    return {"recommendations": sorted(recs, key=lambda x: x["estimated_days_remaining"]), "data_source": "simulated"}


# ─── Real-Time Stats from Backend ──────────────────────────
@router.get("/real-stats")
async def get_real_stats(region: str = "Overall", days: int = 30):
    """Fetch real disease stats from backend analytics and format for frontend."""
    try:
        response = requests.get(f"{BACKEND_URL}/analytics/disease-stats?days={days}", timeout=5, headers={"Authorization": "Bearer demo-token"})
        if response.status_code == 200:
            backend_data = response.json()
            if backend_data and len(backend_data) > 0:
                predictions = []
                total_count = sum(d.get("count", 0) for d in backend_data)
                for item in backend_data:
                    disease_name = item.get("disease", "Unknown")
                    count = item.get("count", 0)
                    avg_daily = round(count / max(days, 1), 1)
                    predicted_30d = round(avg_daily * 30)
                    trend = "rising" if avg_daily > (total_count / max(len(backend_data), 1) / days) * 1.2 else "declining" if avg_daily < (total_count / max(len(backend_data), 1) / days) * 0.8 else "stable"
                    confidence = min(0.95, 0.6 + (count / max(total_count, 1)) * 0.3)

                    predictions.append({
                        "disease": disease_name,
                        "region": region,
                        "predicted_cases_30d": predicted_30d,
                        "avg_daily_cases": avg_daily,
                        "trend": trend,
                        "confidence": round(confidence, 2),
                    })

                return {
                    "predictions": sorted(predictions, key=lambda x: x["predicted_cases_30d"], reverse=True)[:10],
                    "region": region,
                    "period_days": days,
                    "data_source": "live",
                    "total_records": total_count,
                }
    except Exception:
        pass

    # Fall back to regional simulation
    req = PredictionRequest(region=region, days_ahead=days)
    result = await predict_disease(req)
    result["data_source"] = "simulated"
    return result


# Drug interaction checker is handled by the dedicated interactions router at /check/interactions
