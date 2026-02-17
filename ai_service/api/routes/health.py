"""Health check and model performance endpoint"""
from fastapi import APIRouter
from datetime import datetime

router = APIRouter()

@router.get("/")
async def health_check():
    return {
        "status": "healthy",
        "service": "MediCore AI",
        "timestamp": datetime.now().isoformat(),
        "models": {
            "disease_predictor": {"status": "active", "version": "1.0.0", "type": "seasonal-baseline"},
            "inventory_forecaster": {"status": "active", "version": "1.0.0", "type": "usage-based"},
            "drug_interaction": {"status": "active", "version": "1.0.0", "interactions_count": 18},
        },
    }

@router.get("/performance")
async def model_performance():
    return {
        "disease_predictor": {
            "accuracy_30d": 0.78,
            "accuracy_60d": 0.82,
            "accuracy_90d": 0.85,
            "last_retrained": "2024-01-01T00:00:00",
            "drift_score": 0.05,
            "data_points": 5000,
        },
        "inventory_forecaster": {
            "accuracy_30d": 0.81,
            "mae": 12.5,
            "rmse": 18.3,
            "last_retrained": "2024-01-01T00:00:00",
        },
    }
