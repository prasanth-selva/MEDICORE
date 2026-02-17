"""
MediCore HMS - AI Microservice
Disease Prediction + Inventory Forecasting + Drug Interaction Checker
"""
import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from api.routes.predict import router as predict_router
from api.routes.interactions import router as interactions_router
from api.routes.health import router as health_router

@asynccontextmanager
async def lifespan(app: FastAPI):
    print("🧠 MediCore AI Service starting...")
    yield
    print("🧠 MediCore AI Service shutting down...")

app = FastAPI(
    title="MediCore AI Service",
    description="Disease Prediction, Inventory Forecasting, and Drug Interaction Checker",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router, prefix="/predict", tags=["Predictions"])
app.include_router(interactions_router, prefix="/check", tags=["Drug Interactions"])
app.include_router(health_router, prefix="/health", tags=["Health"])

@app.get("/")
async def root():
    return {"service": "MediCore AI", "status": "running", "version": "1.0.0"}
