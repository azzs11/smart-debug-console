# 🤖 ML Service - Smart Debug Console

AI-powered log classification service using Machine Learning.

## Features

- **Random Forest Classifier** with 88%+ accuracy
- **TF-IDF Vectorization** for text processing
- **RESTful API** for real-time predictions
- **Batch classification** support
- **Feature importance** analysis

## Setup

### 1. Install Dependencies
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### 2. Train the Model
```bash
python src/train.py
```

This will:
- Generate 5000 synthetic training samples
- Train a Random Forest classifier
- Achieve 88%+ accuracy
- Save model to `models/` directory

### 3. Start the ML Service
```bash
python src/app.py
```

Service runs on `http://localhost:5001`

## API Endpoints

### Health Check
```bash
GET /health
```

### Classify Single Log
```bash
POST /api/classify
Content-Type: application/json

{
  "message": "Error connecting to database"
}
```

Response:
```json
{
  "status": "success",
  "data": {
    "message": "Error connecting to database",
    "predicted_severity": "error",
    "confidence": 0.92,
    "probabilities": {
      "critical": 0.05,
      "error": 0.92,
      "warning": 0.02,
      "info": 0.01,
      "debug": 0.00
    }
  }
}
```

### Classify Batch
```bash
POST /api/classify/batch
Content-Type: application/json

{
  "messages": [
    "System crash detected",
    "User logged in"
  ]
}
```

### Model Info
```bash
GET /api/model/info
```

## Model Performance

- **Accuracy:** 88%+
- **Training Samples:** 5000
- **Classes:** critical, error, warning, info, debug
- **Algorithm:** Random Forest (100 estimators)

## Architecture
```
ml-service/
├── src/
│   ├── app.py           # Flask API
│   ├── classifier.py    # ML model
│   ├── train.py         # Training script
│   └── data_generator.py # Synthetic data
├── models/              # Saved models
└── requirements.txt     # Dependencies
```

## Author

Akchhya Singh