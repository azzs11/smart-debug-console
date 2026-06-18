FROM python:3.10-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
RUN python src/train_model.py
EXPOSE 5001
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:5001/health || exit 1
CMD ["python", "src/app.py"]
