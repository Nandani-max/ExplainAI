from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware

import pandas as pd
import joblib
import io

from app.services.lime_service import generate_lime_explanation


app = FastAPI(title="ExplainAI API")


# Allow React frontend to communicate with FastAPI
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def home():
    return {"message": "ExplainAI backend is running"}


@app.post("/explain/lime")
async def explain_lime(
    model_file: UploadFile = File(...),
    dataset_file: UploadFile = File(...),
    row_index: int = Form(0)
):
    try:
        # Read uploaded model bytes
        model_bytes = await model_file.read()

        # Load the uploaded model
        model = joblib.load(io.BytesIO(model_bytes))

        # Read uploaded CSV dataset
        dataset_bytes = await dataset_file.read()

        dataset = pd.read_csv(
            io.BytesIO(dataset_bytes)
        )

        # Basic validation
        if dataset.empty:
            raise HTTPException(
                status_code=400,
                detail="Dataset is empty"
            )

        if row_index < 0 or row_index >= len(dataset):
            raise HTTPException(
                status_code=400,
                detail="Invalid row index"
            )

        # Ensure model supports classification probabilities
        if not hasattr(model, "predict_proba"):
            raise HTTPException(
                status_code=400,
                detail="Model must support predict_proba for this implementation"
            )

        # Ensure feature compatibility
        if hasattr(model, "feature_names_in_"):
            expected_features = list(model.feature_names_in_)

            if list(dataset.columns) != expected_features:
                raise HTTPException(
                    status_code=400,
                    detail={
                        "message": "Dataset columns do not match model features",
                        "expected_features": expected_features,
                        "received_features": list(dataset.columns)
                    }
                )

        # Call LIME service
        result = generate_lime_explanation(
            model=model,
            dataset=dataset,
            row_index=row_index
        )

        return {
            "success": True,
            "message": "LIME explanation generated successfully",
            "result": result
        }

    except HTTPException:
        raise

    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )