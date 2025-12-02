# ml-service/src/config.py
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Base directories
BASE_DIR = Path(__file__).parent.parent
MODEL_DIR = BASE_DIR / "models"
DATA_DIR = BASE_DIR / "data"

# Create directories if they don't exist
MODEL_DIR.mkdir(exist_ok=True)
DATA_DIR.mkdir(exist_ok=True)

# Flask Configuration
FLASK_PORT = int(os.getenv("FLASK_PORT", 5001))
FLASK_HOST = os.getenv("FLASK_HOST", "0.0.0.0")
FLASK_DEBUG = os.getenv("FLASK_ENV", "development") == "development"

# Model Paths
MODEL_PATH = MODEL_DIR / "log_classifier.pkl"
VECTORIZER_PATH = MODEL_DIR / "vectorizer.pkl"
LABEL_ENCODER_PATH = MODEL_DIR / "label_encoder.pkl"

# Training Configuration
TRAINING_DATA_SIZE = int(os.getenv("TRAINING_DATA_SIZE", 5000))
TEST_SIZE = float(os.getenv("TEST_SIZE", 0.2))
RANDOM_STATE = int(os.getenv("RANDOM_STATE", 42))

# Log Severity Levels
SEVERITY_LEVELS = ["critical", "error", "warning", "info", "debug"]

# Model Parameters
MODEL_PARAMS = {
    "n_estimators": 100,
    "max_depth": 20,
    "min_samples_split": 5,
    "min_samples_leaf": 2,
    "random_state": RANDOM_STATE
}

print(f"✅ Config loaded: Model Path = {MODEL_PATH}")