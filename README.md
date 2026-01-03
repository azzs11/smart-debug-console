# 🔍 Smart Debug Console

Real-time log monitoring and analysis system with AI-powered error classification. A powerful debugging tool that helps developers track, analyze, and classify application logs in real-time using machine learning.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![ML Accuracy](https://img.shields.io/badge/ML%20Accuracy-88%25%2B-brightgreen)

## ✨ Features

- **Real-time Log Streaming**: WebSocket-based live log updates processing 1,000+ logs/minute
- **AI-Powered Classification**: ML model with **88%+ accuracy** for severity detection using Random Forest classifier
- **Interactive Dashboard**: Beautiful, responsive React UI with Tailwind CSS and dark mode
- **Advanced Filtering**: Search and filter logs by severity, source, and content
- **ML Analytics**: Real-time metrics, confidence scores, and performance visualizations
- **Algorithm Comparison**: Interactive charts comparing ML model accuracy across severity types
- **Prometheus Integration**: Production-ready metrics for observability
- **Grafana Dashboards**: Pre-built dashboards for monitoring ML performance and log throughput
- **RESTful API**: Easy integration with your applications
- **Auto-scroll Mode**: Toggle to follow live logs
- **Log Generator**: Built-in tool for testing and demos

## 🏗️ Architecture

```
smart-debug-console/
├── backend/           # Node.js + Express + Socket.io + Prometheus
├── frontend/          # React 19.2.0 + Tailwind CSS 3.4.1 + Recharts
├── ml-service/        # Python + Flask + Scikit-learn
└── monitoring/        # Prometheus + Grafana configuration
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v16+ and npm
- **Python**: v3.8+
- **Docker** (optional, for Prometheus/Grafana)
- **Git**: For cloning the repository

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server runs on: `http://localhost:5000`
Metrics endpoint: `http://localhost:5000/metrics`

### 2. ML Service Setup

```bash
cd ml-service

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Train the model (first time only)
python src/train_model.py

# Start ML service
python src/app.py
```

ML Service runs on: `http://localhost:5001`
Metrics endpoint: `http://localhost:5001/metrics`

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: `http://localhost:3000`

### 4. Monitoring Setup (Optional)

```bash
# Start Prometheus and Grafana
docker-compose up -d

# Access dashboards
# Grafana: http://localhost:3001 (admin/admin)
# Prometheus: http://localhost:9090
```

## 📊 ML Model Performance

- **Algorithm**: Random Forest Classifier (100 estimators)
- **Accuracy**: **88%+** on test set
- **Training Samples**: 5,000 synthetic logs
- **Vectorization**: TF-IDF with 5,000 features, n-grams (1-3)
- **Classes**: Critical, Error, Warning, Info, Debug
- **Latency**: <1ms P99 prediction time

### Classification Metrics

| Severity | Precision | Recall | F1-Score | Support |
|----------|-----------|--------|----------|---------|
| Critical | 1.00 | 1.00 | 1.00 | 200 |
| Error | 1.00 | 1.00 | 1.00 | 200 |
| Warning | 1.00 | 1.00 | 1.00 | 200 |
| Info | 1.00 | 1.00 | 1.00 | 200 |
| Debug | 1.00 | 1.00 | 1.00 | 200 |

**Overall Accuracy**: 100% on test set (1,000 samples)

## 🎯 API Endpoints

### Backend API (Port 5000)

#### Health Check
```bash
GET /health
```

#### Get All Logs
```bash
GET /api/logs?limit=50&ml=true
```

#### Create Log
```bash
POST /api/logs
Content-Type: application/json

{
  "message": "Database connection failed",
  "severity": "error",
  "source": "database-service"
}
```

**Response with ML enrichment:**
```json
{
  "status": "success",
  "data": {
    "id": "uuid",
    "message": "Database connection failed",
    "severity": "error",
    "source": "database-service",
    "timestamp": "2025-01-03T10:30:45.123Z",
    "ml": {
      "predicted_severity": "error",
      "confidence": 0.92,
      "probabilities": {
        "critical": 0.05,
        "error": 0.92,
        "warning": 0.02,
        "info": 0.01,
        "debug": 0.00
      },
      "severity_match": true
    }
  }
}
```

#### Get Logs by Severity
```bash
GET /api/logs/severity/error
```

#### Get Statistics
```bash
GET /api/logs/stats
```

**Response:**
```json
{
  "status": "success",
  "data": {
    "total": 1234,
    "bySeverity": {
      "critical": 45,
      "error": 234,
      "warning": 456,
      "info": 389,
      "debug": 110
    },
    "ml": {
      "total_classified": 1234,
      "correct_predictions": 1087,
      "accuracy": "88.08",
      "avg_confidence": "91.25"
    }
  }
}
```

#### Start/Stop Log Generator
```bash
POST /api/logs/generator/start
POST /api/logs/generator/stop
GET /api/logs/generator/status
```

### ML Service API (Port 5001)

#### Classify Single Log
```bash
POST /api/classify
Content-Type: application/json

{
  "message": "Error connecting to database"
}
```

**Response:**
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

#### Classify Batch
```bash
POST /api/classify/batch
Content-Type: application/json

{
  "messages": [
    "System crash detected",
    "User logged in successfully"
  ]
}
```

#### Model Info
```bash
GET /api/model/info
```

## 🔌 WebSocket Events

### Client → Server
- `send-log`: Send a new log entry

### Server → Client
- `connection-success`: Connection established with ML status
- `new-log`: New log entry available (with ML predictions)
- `log-stats`: Updated statistics including ML accuracy

## 🎨 Frontend Features

### Dashboard Components
- **Stats Cards**: Overview of log counts by severity with color coding
- **ML Insights Card**: Real-time ML accuracy, confidence, and prediction metrics
- **ML Charts Panel**: Interactive visualizations including:
  - Accuracy over time (Line chart)
  - Confidence distribution (Bar chart)
  - Severity distribution (Pie chart)
  - Model performance stats
- **Filter Bar**: Search and filter capabilities
- **Log Table**: Real-time log display with:
  - Color-coded severity levels
  - ML prediction results
  - Confidence scores
  - Match indicators
- **Connection Status**: WebSocket connection indicator
- **Log Generator Control**: Start/stop test log generation

### Severity Color Coding
- 🔴 **Critical**: Red (system-critical issues)
- 🟠 **Error**: Orange (errors requiring attention)
- 🟡 **Warning**: Yellow (warnings and alerts)
- 🔵 **Info**: Blue (informational messages)
- ⚪ **Debug**: Gray (debug information)

## 📊 Grafana Dashboards

Pre-built dashboards include:

1. **📊 Logs Processed per Minute** - Real-time log throughput by severity
2. **⚡ ML Prediction Latency (P99)** - Sub-millisecond prediction times
3. **🔌 Active WebSocket Connections** - Connection monitoring
4. **🤖 ML Predictions per Minute** - AI classification rate
5. **🎯 ML Prediction Confidence Distribution** - Confidence score analytics
6. **❌ ML Classification Errors** - Error rate monitoring
7. **📈 Total Logs by Severity** - Distribution pie chart
8. **⏱️ ML Prediction Duration** - P50 & P95 latencies
9. **💻 CPU Usage** - System resource monitoring
10. **🧠 Memory Usage** - Memory consumption tracking

Access Grafana at `http://localhost:3001` (default credentials: admin/admin)

## 🛠️ Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
ML_SERVICE_URL=http://localhost:5001
```

### ML Service (.env)
```env
FLASK_PORT=5001
FLASK_HOST=0.0.0.0
FLASK_ENV=development
MODEL_PATH=models/log_classifier.pkl
TRAINING_DATA_SIZE=5000
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=http://localhost:5000
```

## 📦 Tech Stack

### Backend
- **Node.js 16+**
- **Express.js 4.21.2** - Web framework
- **Socket.io 4.8.1** - Real-time WebSocket communication
- **Axios 1.13.2** - HTTP client for ML service
- **prom-client 15.1.3** - Prometheus metrics
- **UUID 9.0.0** - Unique log identifiers

### Frontend
- **React 19.2.0** - UI framework
- **Tailwind CSS 3.4.1** - Utility-first styling
- **Recharts 3.5.1** - Interactive data visualizations
- **Socket.io-client 4.8.1** - WebSocket client
- **Axios 1.13.2** - HTTP client
- **Lucide React 0.555.0** - Modern icon library

### ML Service
- **Python 3.8+**
- **Flask 3.0.0** - Web framework
- **Scikit-learn 1.3.2** - Machine learning
- **Pandas 2.1.4** - Data manipulation
- **NumPy 1.26.2** - Numerical computing
- **Joblib 1.3.2** - Model serialization
- **prometheus-client 0.20.0** - Metrics

### Monitoring
- **Prometheus** - Metrics collection and storage
- **Grafana** - Metrics visualization and dashboarding

## 🔄 Integration Guide

### Sending Logs from Your Application

**JavaScript/Node.js:**
```javascript
const axios = require('axios');

async function sendLog(message, severity, source) {
  await axios.post('http://localhost:5000/api/logs', {
    message,
    severity,
    source
  });
}

// Usage
sendLog('Database connection failed', 'error', 'my-app');
```

**Python:**
```python
import requests

def send_log(message, severity, source):
    requests.post('http://localhost:5000/api/logs', json={
        'message': message,
        'severity': severity,
        'source': source
    })

# Usage
send_log('Database connection failed', 'error', 'my-app')
```

**cURL:**
```bash
curl -X POST http://localhost:5000/api/logs \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Database connection failed",
    "severity": "error",
    "source": "my-app"
  }'
```

## 🧪 Testing

### Test ML Model
```bash
cd ml-service
python src/classifier.py
```

### Load Testing
```bash
cd backend

# Single client load test (1,200 logs/min)
node test-load.js

# Multi-client test (10 clients, 1,000 logs/min total)
node test-load-multi.js
```

### Test ML Integration
```bash
cd backend
node test-ml.js
```

### Manual Log Testing
```bash
# Send a test log
curl -X POST http://localhost:5000/api/logs \
  -H "Content-Type: application/json" \
  -d '{"message":"Test error","severity":"error","source":"test"}'
```

## 📈 Performance Metrics

- **Throughput**: 1,000+ logs/minute processing capacity
- **ML Latency**: <1ms P99 prediction time
- **WebSocket**: Real-time updates with <10ms latency
- **Accuracy**: 88%+ ML classification accuracy
- **Confidence**: 91%+ average prediction confidence

## 📈 Future Enhancements

- [ ] Log persistence (PostgreSQL/MongoDB integration)
- [ ] Advanced analytics and trend detection
- [ ] Alert notifications (Email, Slack, PagerDuty)
- [ ] Log export (CSV, JSON, PDF)
- [ ] Custom severity levels and rules
- [ ] Multi-user support with authentication
- [ ] Log aggregation from multiple sources
- [ ] Anomaly detection using unsupervised learning
- [ ] ML model retraining interface
- [ ] Natural language queries for log search
- [ ] Log correlation and pattern detection
- [ ] Integration with popular logging frameworks

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 5000 is available
lsof -i :5000  # macOS/Linux
netstat -ano | findstr :5000  # Windows

# Kill process if needed
```

### ML Service errors
```bash
# Retrain model
cd ml-service
python src/train_model.py
```

### Frontend connection issues
- Ensure backend is running on port 5000
- Check CORS settings in backend
- Verify `.env` file in frontend

### WebSocket not connecting
- Check firewall settings
- Ensure Socket.io versions match
- Check browser console for errors

### Grafana dashboard not showing data
- Verify Prometheus is scraping metrics: `http://localhost:9090/targets`
- Check backend/ML service metrics endpoints are accessible
- Ensure services are configured with correct labels

## 📝 Development

### Run in Development Mode

**Terminal 1 - Backend:**
```bash
cd backend
npm run dev  # Uses nodemon for auto-restart
```

**Terminal 2 - ML Service:**
```bash
cd ml-service
source venv/bin/activate  # Windows: venv\Scripts\activate
python src/app.py
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm start  # Hot reload enabled
```

**Terminal 4 - Monitoring (Optional):**
```bash
docker-compose up -d
```

## 📄 License

MIT License - Free for personal and commercial use

## 👨‍💻 Author

**Akchhya Singh**
- 📧 Email: akchhya1108@gmail.com
- 💼 LinkedIn: [akchhya-singh11](https://linkedin.com/in/akchhya-singh11)
- 🐙 GitHub: [Akchhya1108](https://github.com/Akchhya1108)

## 🙏 Acknowledgments

- Built with modern web technologies and ML frameworks
- Inspired by enterprise logging solutions
- ML model trained on synthetic data generated using realistic patterns
- Prometheus and Grafana integration for production-ready observability

---

⭐ **Star this repo if you found it helpful!**

🐛 **Found a bug?** Open an issue  
💡 **Have an idea?** Submit a pull request  
📖 **Questions?** Check the [Wiki](https://github.com/Akchhya1108/smart-debug-console/wiki) or open a discussion