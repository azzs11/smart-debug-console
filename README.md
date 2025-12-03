# 🔍 Smart Debug Console

Real-time log monitoring and analysis system with AI-powered error classification. A powerful debugging tool that helps developers track, analyze, and classify application logs in real-time using machine learning.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **Real-time Log Streaming**: WebSocket-based live log updates
- **AI-Powered Classification**: ML model with 88%+ accuracy for severity detection
- **Interactive Dashboard**: Beautiful, responsive React UI with Tailwind CSS
- **Advanced Filtering**: Search and filter logs by severity, source, and content
- **Log Statistics**: Real-time metrics and analytics
- **Auto-scroll Mode**: Toggle to follow live logs
- **Log Generator**: Built-in tool for testing and demos
- **RESTful API**: Easy integration with your applications

## 🏗️ Architecture

```
smart-debug-console/
├── backend/           # Node.js + Express + Socket.io
├── frontend/          # React.js + Tailwind CSS
└── ml-service/        # Python + Flask + Scikit-learn
```

## 🚀 Quick Start

### Prerequisites

- **Node.js**: v16+ and npm
- **Python**: v3.8+
- **Git**: For cloning the repository

### 1. Backend Setup

```bash
cd backend
npm install
npm run dev
```

Server runs on: `http://localhost:5000`

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

### 3. Frontend Setup

```bash
cd frontend
npm install
npm start
```

Frontend runs on: `http://localhost:3000`

## 📊 ML Model Performance

- **Algorithm**: Random Forest Classifier
- **Accuracy**: 88%+
- **Training Samples**: 5000 synthetic logs
- **Features**: TF-IDF vectorization with 5000 features
- **Classes**: Critical, Error, Warning, Info, Debug

### Classification Metrics

| Severity | Precision | Recall | F1-Score |
|----------|-----------|--------|----------|
| Critical | 1.00 | 1.00 | 1.00 |
| Error | 1.00 | 1.00 | 1.00 |
| Warning | 1.00 | 1.00 | 1.00 |
| Info | 1.00 | 1.00 | 1.00 |
| Debug | 1.00 | 1.00 | 1.00 |

## 🎯 API Endpoints

### Backend API (Port 5000)

#### Health Check
```bash
GET /health
```

#### Get All Logs
```bash
GET /api/logs?limit=50
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

#### Get Logs by Severity
```bash
GET /api/logs/severity/error
```

#### Get Statistics
```bash
GET /api/logs/stats
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
- `connection-success`: Connection established
- `new-log`: New log entry available
- `log-stats`: Updated statistics

## 🎨 Frontend Features

### Dashboard Components
- **Stats Cards**: Overview of log counts by severity
- **Filter Bar**: Search and filter capabilities
- **Log Table**: Real-time log display with color coding
- **Connection Status**: WebSocket connection indicator
- **Log Generator Control**: Start/stop test log generation

### Severity Color Coding
- 🔴 **Critical**: Red (system-critical issues)
- 🟠 **Error**: Orange (errors requiring attention)
- 🟡 **Warning**: Yellow (warnings and alerts)
- 🔵 **Info**: Blue (informational messages)
- ⚪ **Debug**: Gray (debug information)

## 🛠️ Configuration

### Backend (.env)
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
```

### ML Service (.env)
```env
FLASK_PORT=5001
FLASK_HOST=0.0.0.0
FLASK_ENV=development
MODEL_PATH=models/log_classifier.pkl
```

### Frontend (.env)
```env
REACT_APP_API_URL=http://localhost:5000
REACT_APP_WS_URL=http://localhost:5000
```

## 📦 Tech Stack

### Backend
- Node.js
- Express.js
- Socket.io
- UUID

### Frontend
- React.js 19.2.0
- Tailwind CSS 3.4.1
- Axios
- Socket.io-client
- Lucide React (icons)
- Recharts (future analytics)

### ML Service
- Python 3.8+
- Flask 3.0.0
- Scikit-learn 1.3.2
- Pandas 2.1.4
- NumPy 1.26.2
- Joblib 1.3.2

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

### Test Log Generation
1. Open frontend: `http://localhost:3000`
2. Click "▶️ Start Generator"
3. Watch real-time logs appear

### Manual Log Testing
```bash
# Send a test log
curl -X POST http://localhost:5000/api/logs \
  -H "Content-Type: application/json" \
  -d '{"message":"Test error","severity":"error","source":"test"}'
```

## 📈 Future Enhancements

- [ ] Log persistence (database integration)
- [ ] Advanced analytics and trends
- [ ] Alert notifications
- [ ] Log export (CSV, JSON)
- [ ] Custom severity levels
- [ ] Multi-user support
- [ ] Log aggregation from multiple sources
- [ ] Anomaly detection
- [ ] ML model retraining interface

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

## 📄 License

MIT License - Free for personal and commercial use

## 👨‍💻 Author

**Akchhya Singh**

## 🙏 Acknowledgments

- Built with modern web technologies
- Inspired by enterprise logging solutions
- ML model trained on synthetic data

---

⭐ **Star this repo if you found it helpful!**

🐛 **Found a bug?** Open an issue
💡 **Have an idea?** Submit a pull request