import numpy as np
import pandas as pd

from lime.lime_tabular import LimeTabularExplainer


def generate_lime_explanation(model, dataset, row_index):
    # Validate the selected row
    if row_index < 0 or row_index >= len(dataset):
        raise ValueError("Invalid row index")

    # Select the instance to explain
    instance = dataset.iloc[row_index]

    # LIME expects a numerical array
    training_data = dataset.to_numpy(dtype=float)
    instance_data = instance.to_numpy(dtype=float)

    # Create LIME explainer using the dataset as reference
    explainer = LimeTabularExplainer(
        training_data=training_data,
        feature_names=dataset.columns.tolist(),
        mode="classification",
        discretize_continuous=True,
        random_state=42
    )

    # Model prediction function used by LIME
    def predict_proba_fn(data):
        data_df = pd.DataFrame(
            data,
            columns=dataset.columns
        )

        return model.predict_proba(data_df)

    # Get prediction for the original instance
    prediction_probabilities = model.predict_proba(
        pd.DataFrame(
            [instance_data],
            columns=dataset.columns
        )
    )[0]

    predicted_class_index = int(
        np.argmax(prediction_probabilities)
    )

    predicted_class = model.classes_[predicted_class_index]

    predicted_probability = float(
        prediction_probabilities[predicted_class_index]
    )

    # Generate local explanation
    explanation = explainer.explain_instance(
        data_row=instance_data,
        predict_fn=predict_proba_fn,
        num_features=min(10, dataset.shape[1]),
        num_samples=5000,
        labels=(predicted_class_index,)
    )

    # Get weights for the predicted class
    feature_weights = explanation.as_list(
        label=predicted_class_index
    )

    # Format weights for frontend
    results = []

    for feature_description, weight in feature_weights:
        results.append({
            "feature": feature_description,
            "weight": float(weight),
            "direction": (
                "supports_prediction"
                if weight > 0
                else "opposes_prediction"
            )
        })

    return {
        "row_index": row_index,
        "prediction": str(predicted_class),
        "probability": predicted_probability,
        "class_probabilities": {
            str(class_name): float(probability)
            for class_name, probability in zip(
                model.classes_,
                prediction_probabilities
            )
        },
        "features": results
    }