# ml-service/src/train_model.py
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score
import joblib
import os
import re

# Set random seed for reproducibility
np.random.seed(42)

def load_data():
    """Load training data from CSV"""
    print("📂 Loading training data...")
    data_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'training_logs.csv')
    df = pd.read_csv(data_path)
    print(f"✅ Loaded {len(df)} log samples")
    print(f"📊 Distribution:\n{df['severity'].value_counts()}")
    return df

def preprocess_data(df):
    """Preprocess text data"""
    print("\n🔧 Preprocessing data...")
    
    # Convert to lowercase
    df['message'] = df['message'].str.lower()
    
    # Remove special characters (keep alphanumeric and spaces) - Fixed regex
    df['message'] = df['message'].str.replace(r'[^a-z0-9\s]', '', regex=True)
    
    # Remove extra whitespace
    df['message'] = df['message'].str.strip()
    
    return df

def train_model(df):
    """Train the classification model"""
    print("\n🤖 Training machine learning model...")
    
    # Split features and labels
    X = df['message']
    y = df['severity']
    
    # Split into training and testing sets (80-20 split)
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    
    print(f"📊 Training set: {len(X_train)} samples")
    print(f"📊 Testing set: {len(X_test)} samples")
    
    # Create TF-IDF vectorizer with better parameters
    print("\n🔤 Creating TF-IDF vectorizer...")
    vectorizer = TfidfVectorizer(
        max_features=1000,  # Increased features
        ngram_range=(1, 3),  # Use unigrams, bigrams, and trigrams
        min_df=1,  # Minimum document frequency
        max_df=0.9,
        sublinear_tf=True  # Use sublinear term frequency scaling
    )
    
    X_train_vec = vectorizer.fit_transform(X_train)
    X_test_vec = vectorizer.transform(X_test)
    
    # Train Random Forest classifier with better parameters
    print("\n🌲 Training Random Forest classifier...")
    model = RandomForestClassifier(
        n_estimators=200,  # More trees
        max_depth=30,  # Deeper trees
        min_samples_split=2,
        min_samples_leaf=1,
        random_state=42,
        n_jobs=-1,
        class_weight='balanced'  # Handle class imbalance
    )
    
    model.fit(X_train_vec, y_train)
    
    # Make predictions
    print("\n🎯 Making predictions...")
    y_pred = model.predict(X_test_vec)
    
    # Calculate metrics
    accuracy = accuracy_score(y_test, y_pred)
    print(f"\n✅ Model Accuracy: {accuracy * 100:.2f}%")
    
    # Classification report
    print("\n📊 Classification Report:")
    print(classification_report(y_test, y_pred))
    
    # Confusion matrix
    print("\n🔢 Confusion Matrix:")
    cm = confusion_matrix(y_test, y_pred, labels=['critical', 'error', 'warning', 'info', 'debug'])
    print(cm)
    print("\nLabels: [critical, error, warning, info, debug]")
    
    # Feature importance
    print("\n🔍 Top 10 Most Important Features:")
    feature_names = vectorizer.get_feature_names_out()
    importances = model.feature_importances_
    indices = np.argsort(importances)[-10:]
    
    for i in indices[::-1]:
        print(f"  {feature_names[i]}: {importances[i]:.4f}")
    
    return model, vectorizer, accuracy

def save_model(model, vectorizer):
    """Save trained model and vectorizer"""
    print("\n💾 Saving model and vectorizer...")
    
    models_dir = os.path.join(os.path.dirname(__file__), '..', 'models')
    os.makedirs(models_dir, exist_ok=True)
    
    model_path = os.path.join(models_dir, 'log_classifier.pkl')
    vectorizer_path = os.path.join(models_dir, 'tfidf_vectorizer.pkl')
    
    joblib.dump(model, model_path)
    joblib.dump(vectorizer, vectorizer_path)
    
    print(f"✅ Model saved to: {model_path}")
    print(f"✅ Vectorizer saved to: {vectorizer_path}")

def main():
    print("=" * 60)
    print("🚀 SMART DEBUG CONSOLE - ML MODEL TRAINING")
    print("=" * 60)
    
    # Load data
    df = load_data()
    
    # Check if we have enough data
    if len(df) < 400:
        print("\n⚠️ WARNING: Low number of training samples!")
        print("Consider adding more data for better accuracy.")
    
    # Preprocess
    df = preprocess_data(df)
    
    # Train model
    model, vectorizer, accuracy = train_model(df)
    
    # Save model
    save_model(model, vectorizer)
    
    print("\n" + "=" * 60)
    print(f"🎉 TRAINING COMPLETE! Accuracy: {accuracy * 100:.2f}%")
    if accuracy >= 0.85:
        print("✅ EXCELLENT: Model meets target accuracy (≥85%)")
    elif accuracy >= 0.70:
        print("⚠️ GOOD: Model is acceptable but could be improved")
    else:
        print("❌ NEEDS IMPROVEMENT: Consider adding more training data")
    print("=" * 60)
    
    # Test with sample predictions
    print("\n🧪 Testing with sample predictions:")
    sample_messages = [
        "database connection failed",
        "user logged in successfully", 
        "high memory usage detected",
        "system crash detected",
        "debug: entering function",
        "critical failure in payment system",
        "authentication successful for user",
        "warning: disk space low",
        "error: null pointer exception",
        "debug trace: method called"
    ]
    
    for msg in sample_messages:
        msg_vec = vectorizer.transform([msg.lower()])
        prediction = model.predict(msg_vec)[0]
        probabilities = model.predict_proba(msg_vec)[0]
        confidence = max(probabilities) * 100
        print(f"  '{msg}' → {prediction} (confidence: {confidence:.1f}%)")

if __name__ == "__main__":
    main()