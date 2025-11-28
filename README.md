# Smart Debug Console

Real-time log monitoring and analysis system with AI-powered error classification.

## Features
- Real-time log streaming via WebSocket
- AI-powered error classification
- Interactive visualization dashboard
- Advanced filtering and search
- Anomaly detection

## Tech Stack
- **Backend**: Node.js, Express, Socket.io
- **Frontend**: React.js, Socket.io-client, Recharts
- **ML Service**: Python, Flask, Scikit-learn

## Project Status
- [x] Phase 1: Basic Backend Setup - COMPLETED
- [ ] Phase 2: WebSocket Integration
- [ ] Phase 3: Frontend Setup
- [ ] Phase 4: ML Model Development
- [ ] Phase 5: ML Integration
- [ ] Phase 6: Advanced Features
- [ ] Phase 7: Testing & Deployment

## Setup Instructions

### Backend
```bash
cd backend
npm install
npm run dev
```

Server runs on `http://localhost:5000`

### ML Service (Coming Soon)
```bash
cd ml-service
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python src/app.py
```

### Frontend (Coming Soon)
```bash
cd frontend
npm install
npm start
```

## API Endpoints

### Health Check
```
GET /health
```

### Logs
```
GET /api/logs - Get all logs
POST /api/logs - Create a log
GET /api/logs/severity/:level - Get logs by severity
GET /api/logs/stats - Get log statistics
```

## Author
Akchhya Singh