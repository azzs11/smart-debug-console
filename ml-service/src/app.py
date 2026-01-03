# ml-service/src/app.py
from flask import Flask, request, jsonify, Response
from flask_cors import CORS
from prometheus_client import Counter, Histogram, generate_latest, CONTENT_TYPE_LATEST
import sys
from pathlib import Path
import time

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent.parent))

from src.classifier import LogClassifier
from src.config import FLASK_PORT, FLASK_HOST, FLASK_DEBUG, MODEL_PATH

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# Initialize classifier
classifier = LogClassifier()

# ==================== PROMETHEUS METRICS ====================
# Define metrics
prediction_counter = Counter(
    'ml_predictions_total', 
    'Total ML predictions', 
    ['severity']
)

prediction_duration = Histogram(
    'ml_prediction_duration_seconds', 
    'ML prediction duration'
)

prediction_confidence = Histogram(
    'ml_prediction_confidence', 
    'ML prediction confidence'
)

classification_errors = Counter(
    'ml_classification_errors_total',
    'Total classification errors'
)

# ============================================================

# Load model on startup (Flask 3.0 compatible)
def load_model():
    """Load the trained model when the app starts"""
    if not classifier.load_model():
        print("⚠️ Warning: Model not loaded. Please train the model first.")
        print("Run: python src/train_model.py")

# Load model immediately
with app.app_context():
    load_model()

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "success",
        "message": "ML Service is running",
        "model_loaded": classifier.is_trained
    }), 200

@app.route('/metrics', methods=['GET'])
def metrics():
    """Prometheus metrics endpoint"""
    return Response(generate_latest(), mimetype=CONTENT_TYPE_LATEST)

@app.route('/api/classify', methods=['POST'])
def classify_log():
    """
    Classify a single log message
    
    Request body:
    {
        "message": "Error connecting to database"
    }
    
    Response:
    {
        "status": "success",
        "data": {
            "message": "Error connecting to database",
            "predicted_severity": "error",
            "confidence": 0.92,
            "probabilities": {...}
        }
    }
    """
    start_time = time.time()
    
    try:
        if not classifier.is_trained:
            classification_errors.inc()
            return jsonify({
                "status": "error",
                "message": "Model not loaded. Please train the model first."
            }), 503
        
        data = request.get_json()
        
        if not data or 'message' not in data:
            classification_errors.inc()
            return jsonify({
                "status": "error",
                "message": "Missing 'message' in request body"
            }), 400
        
        message = data['message']
        
        # Predict with timing
        result = classifier.predict(message)
        
        # Record metrics
        prediction_counter.labels(severity=result['predicted_severity']).inc()
        prediction_confidence.observe(result['confidence'])
        prediction_duration.observe(time.time() - start_time)
        
        return jsonify({
            "status": "success",
            "data": result
        }), 200
    
    except Exception as e:
        classification_errors.inc()
        prediction_duration.observe(time.time() - start_time)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/classify/batch', methods=['POST'])
def classify_batch():
    """
    Classify multiple log messages
    
    Request body:
    {
        "messages": [
            "Error connecting to database",
            "User logged in successfully"
        ]
    }
    
    Response:
    {
        "status": "success",
        "data": [...]
    }
    """
    start_time = time.time()
    
    try:
        if not classifier.is_trained:
            classification_errors.inc()
            return jsonify({
                "status": "error",
                "message": "Model not loaded"
            }), 503
        
        data = request.get_json()
        
        if not data or 'messages' not in data:
            classification_errors.inc()
            return jsonify({
                "status": "error",
                "message": "Missing 'messages' array in request body"
            }), 400
        
        messages = data['messages']
        
        if not isinstance(messages, list):
            classification_errors.inc()
            return jsonify({
                "status": "error",
                "message": "'messages' must be an array"
            }), 400
        
        # Predict batch
        results = classifier.predict(messages)
        
        # Record metrics for each prediction
        for result in results:
            prediction_counter.labels(severity=result['predicted_severity']).inc()
            prediction_confidence.observe(result['confidence'])
        
        prediction_duration.observe(time.time() - start_time)
        
        return jsonify({
            "status": "success",
            "data": results,
            "count": len(results)
        }), 200
    
    except Exception as e:
        classification_errors.inc()
        prediction_duration.observe(time.time() - start_time)
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/model/info', methods=['GET'])
def model_info():
    """Get information about the loaded model"""
    try:
        if not classifier.is_trained:
            return jsonify({
                "status": "error",
                "message": "Model not loaded"
            }), 503
        
        top_features = classifier.get_feature_importance(15)
        
        return jsonify({
            "status": "success",
            "data": {
                "model_loaded": True,
                "classes": classifier.label_encoder.classes_.tolist(),
                "num_features": len(classifier.vectorizer.get_feature_names_out()),
                "top_features": top_features,
                "model_path": str(MODEL_PATH)
            }
        }), 200
    
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": str(e)
        }), 500

@app.route('/api/model/retrain', methods=['POST'])
def retrain_model():
    """Trigger model retraining (for future use)"""
    return jsonify({
        "status": "error",
        "message": "Retraining endpoint not yet implemented"
    }), 501

if __name__ == '__main__':
    print("="*60)
    print("🤖 SMART DEBUG CONSOLE - ML SERVICE")
    print("="*60)
    print(f"🌐 Starting Flask server on {FLASK_HOST}:{FLASK_PORT}")
    print(f"📁 Model path: {MODEL_PATH}")
    print(f"📊 Prometheus metrics: http://{FLASK_HOST}:{FLASK_PORT}/metrics")
    print("="*60)
    
    app.run(
        host=FLASK_HOST,
        port=FLASK_PORT,
        debug=FLASK_DEBUG
    )