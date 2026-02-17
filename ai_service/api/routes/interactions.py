"""
Drug Interaction Checker
"""
from fastapi import APIRouter
from pydantic import BaseModel
from typing import List

router = APIRouter()

class InteractionCheckRequest(BaseModel):
    drugs: List[str]

# Known drug interactions database (simplified)
INTERACTIONS_DB = [
    {"drug1": "warfarin", "drug2": "aspirin", "severity": "high",
     "description": "Increased risk of bleeding. Both drugs affect blood clotting."},
    {"drug1": "metformin", "drug2": "alcohol", "severity": "high",
     "description": "Risk of lactic acidosis. Avoid alcohol when taking metformin."},
    {"drug1": "lisinopril", "drug2": "potassium", "severity": "high",
     "description": "Risk of hyperkalemia. ACE inhibitors increase potassium levels."},
    {"drug1": "simvastatin", "drug2": "erythromycin", "severity": "high",
     "description": "Increased risk of rhabdomyolysis (muscle breakdown)."},
    {"drug1": "ciprofloxacin", "drug2": "antacids", "severity": "moderate",
     "description": "Antacids reduce absorption of ciprofloxacin. Take 2 hours apart."},
    {"drug1": "metformin", "drug2": "iodinated contrast", "severity": "high",
     "description": "Risk of lactic acidosis. Stop metformin 48h before contrast."},
    {"drug1": "ssri", "drug2": "tramadol", "severity": "high",
     "description": "Risk of serotonin syndrome. Avoid combination."},
    {"drug1": "amlodipine", "drug2": "simvastatin", "severity": "moderate",
     "description": "Amlodipine may increase simvastatin levels. Limit simvastatin to 20mg."},
    {"drug1": "omeprazole", "drug2": "clopidogrel", "severity": "high",
     "description": "Omeprazole reduces effectiveness of clopidogrel."},
    {"drug1": "ibuprofen", "drug2": "aspirin", "severity": "moderate",
     "description": "Ibuprofen may reduce the cardioprotective effects of aspirin."},
    {"drug1": "amoxicillin", "drug2": "methotrexate", "severity": "high",
     "description": "Amoxicillin may increase methotrexate toxicity."},
    {"drug1": "fluconazole", "drug2": "warfarin", "severity": "high",
     "description": "Fluconazole increases warfarin effects. Monitor INR closely."},
    {"drug1": "paracetamol", "drug2": "warfarin", "severity": "moderate",
     "description": "High doses of paracetamol may enhance warfarin effect."},
    {"drug1": "azithromycin", "drug2": "amiodarone", "severity": "high",
     "description": "Risk of QT prolongation and cardiac arrhythmia."},
    {"drug1": "cetirizine", "drug2": "alcohol", "severity": "moderate",
     "description": "Enhanced sedation and drowsiness."},
    {"drug1": "metformin", "drug2": "cimetidine", "severity": "moderate",
     "description": "Cimetidine increases metformin levels. Monitor blood glucose."},
    {"drug1": "amlodipine", "drug2": "cyclosporine", "severity": "moderate",
     "description": "Amlodipine may increase cyclosporine levels."},
    {"drug1": "diclofenac", "drug2": "lithium", "severity": "high",
     "description": "NSAIDs increase lithium levels. Risk of lithium toxicity."},
]

# Drug name aliases
DRUG_ALIASES = {
    "crocin": "paracetamol", "tylenol": "paracetamol", "dolo": "paracetamol",
    "brufen": "ibuprofen", "advil": "ibuprofen", "nurofen": "ibuprofen",
    "augmentin": "amoxicillin", "mox": "amoxicillin",
    "zithromax": "azithromycin", "azee": "azithromycin",
    "norvasc": "amlodipine", "stamlo": "amlodipine",
    "glucophage": "metformin", "glycomet": "metformin",
    "prilosec": "omeprazole", "omez": "omeprazole",
    "zyrtec": "cetirizine", "cetzine": "cetirizine",
    "ecosprin": "aspirin", "disprin": "aspirin",
    "coumadin": "warfarin",
    "cipro": "ciprofloxacin", "ciplox": "ciprofloxacin",
    "voveran": "diclofenac", "voltaren": "diclofenac",
}

def normalize_drug_name(name: str) -> str:
    """Normalize drug name to generic form"""
    clean = name.lower().strip()
    # Remove dosage info
    for suffix in ["mg", "ml", "mcg", "gm", "g"]:
        parts = clean.split()
        clean = " ".join(p for p in parts if not p.replace(".", "").replace(suffix, "").isdigit())
    clean = clean.strip()
    return DRUG_ALIASES.get(clean, clean)


@router.post("/interactions")
async def check_interactions(request: InteractionCheckRequest):
    """Check for drug-drug interactions"""
    if len(request.drugs) < 2:
        return {"safe": True, "warnings": [], "checked_drugs": request.drugs}
    
    normalized = [normalize_drug_name(d) for d in request.drugs]
    warnings = []
    
    for i in range(len(normalized)):
        for j in range(i + 1, len(normalized)):
            drug_a = normalized[i]
            drug_b = normalized[j]
            
            for interaction in INTERACTIONS_DB:
                d1 = interaction["drug1"]
                d2 = interaction["drug2"]
                
                if (d1 in drug_a or drug_a in d1 or d1 == drug_a) and \
                   (d2 in drug_b or drug_b in d2 or d2 == drug_b):
                    warnings.append({
                        "drug1": request.drugs[i],
                        "drug2": request.drugs[j],
                        "severity": interaction["severity"],
                        "description": interaction["description"],
                    })
                elif (d1 in drug_b or drug_b in d1 or d1 == drug_b) and \
                     (d2 in drug_a or drug_a in d2 or d2 == drug_a):
                    warnings.append({
                        "drug1": request.drugs[j],
                        "drug2": request.drugs[i],
                        "severity": interaction["severity"],
                        "description": interaction["description"],
                    })
    
    return {
        "safe": len(warnings) == 0,
        "warnings": warnings,
        "checked_drugs": request.drugs,
        "normalized_drugs": normalized,
        "total_interactions_found": len(warnings),
    }
