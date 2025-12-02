# ml-service/src/classifier.py
import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score, confusion_matrix
import numpy as np
from pathlib import Path
import json

from .config import (
    MODEL_PATH, 
    VECTORIZER_PATH, 
    LABEL_ENCODER_PATH,
    MODEL_PARAMS,
    TEST_SIZE,
    RANDOM_STATE
)

class LogClassifier:
    """ML-powered log classification system"""
    
    def __init__(self):
        self.model = None
        self.vectorizer = None
        self.label_encoder = None
        self.is_trained = False
        
    def train(self, df, save_model=True):
        """
        Train the classifier on log data
        
        Args:
            df: DataFrame with 'message' and 'severity' columns
            save_model: Whether to save the trained model
        
        Returns:
            dict: Training metrics
        """
        print("🎓 Starting model training...")
        
        # Prepare data
        X = df['message'].values
        y = df['severity'].values
        
        # Initialize components
        self.vectorizer = TfidfVectorizer(
            max_features=5000,
            ngram_range=(1, 3),
            min_df=2,
            max_df=0.9
        )
        
        self.label_encoder = LabelEncoder()
        
        # Transform data
        print("📝 Vectorizing log messages...")
        X_vectorized = self.vectorizer.fit_transform(X)
        y_encoded = self.label_encoder.fit_transform(y)
        
        # Split data
        X_train, X_test, y_train, y_test = train_test_split(
            X_vectorized, y_encoded, 
            test_size=TEST_SIZE, 
            random_state=RANDOM_STATE,
            stratify=y_encoded
        )
        
        print(f"📊 Training set: {X_train.shape[0]} samples")
        print(f"📊 Test set: {X_test.shape[0]} samples")
        
        # Train model
        print("🤖 Training Random Forest classifier...")
        self.model = RandomForestClassifier(**MODEL_PARAMS)
        self.model.fit(X_train, y_train)
        
        # Evaluate
        print("📈 Evaluating model...")
        y_pred = self.model.predict(X_test)
        accuracy = accuracy_score(y_test, y_pred)
        
        print(f"\n✅ Model trained successfully!")
        print(f"🎯 Accuracy: {accuracy * 100:.2f}%")
        
        # Detailed metrics
        report = classification_report(
            y_test, y_pred,
            target_names=self.label_encoder.classes_,
            output_dict=True
        )
        
        # Confusion matrix
        conf_matrix = confusion_matrix(y_test, y_pred)
        
        # Print classification report
        print("\n📊 Classification Report:")
        print(classification_report(
            y_test, y_pred,
            target_names=self.label_encoder.classes_
        ))
        
        self.is_trained = True
        
        # Save model
        if save_model:
            self.save_model()
        
        metrics = {
            "accuracy": float(accuracy),
            "classification_report": report,
            "confusion_matrix": conf_matrix.tolist(),
            "classes": self.label_encoder.classes_.tolist(),
            "training_samples": X_train.shape[0],
            "test_samples": X_test.shape[0]
        }
        
        return metrics
    
    def predict(self, messages):
        """
        Predict severity for log messages
        
        Args:
            messages: str or list of str
        
        Returns:
            dict or list of dict with predictions
        """
        if not self.is_trained:
            raise ValueError("Model not trained. Please train or load a model first.")
        
        # Handle single message
        if isinstance(messages, str):
            messages = [messages]
            single = True
        else:
            single = False
        
        # Vectorize
        X = self.vectorizer.transform(messages)
        
        # Predict
        predictions = self.model.predict(X)
        probabilities = self.model.predict_proba(X)
        
        # Decode predictions
        results = []
        for i, message in enumerate(messages):
            pred_severity = self.label_encoder.inverse_transform([predictions[i]])[0]
            confidence = float(np.max(probabilities[i]))
            
            # Get all class probabilities
            all_probs = {
                severity: float(prob)
                for severity, prob in zip(self.label_encoder.classes_, probabilities[i])
            }
            
            results.append({
                "message": message,
                "predicted_severity": pred_severity,
                "confidence": confidence,
                "probabilities": all_probs
            })
        
        return results[0] if single else results
    
    def save_model(self):
        """Save trained model, vectorizer, and label encoder"""
        if not self.is_trained:
            raise ValueError("Cannot save untrained model")
        
        print(f"💾 Saving model to {MODEL_PATH.parent}/")
        
        joblib.dump(self.model, MODEL_PATH)
        joblib.dump(self.vectorizer, VECTORIZER_PATH)
        joblib.dump(self.label_encoder, LABEL_ENCODER_PATH)
        
        print("✅ Model saved successfully!")
    
    def load_model(self):
        """Load trained model, vectorizer, and label encoder"""
        try:
            print(f"📂 Loading model from {MODEL_PATH.parent}/")
            
            self.model = joblib.load(MODEL_PATH)
            self.vectorizer = joblib.load(VECTORIZER_PATH)
            self.label_encoder = joblib.load(LABEL_ENCODER_PATH)
            
            self.is_trained = True
            print("✅ Model loaded successfully!")
            return True
        except FileNotFoundError:
            print("⚠️ Model files not found. Please train the model first.")
            return False
    
    def get_feature_importance(self, top_n=20):
        """Get most important features for classification"""
        if not self.is_trained:
            raise ValueError("Model not trained")
        
        feature_names = self.vectorizer.get_feature_names_out()
        importances = self.model.feature_importances_
        
        # Get top N features
        indices = np.argsort(importances)[-top_n:][::-1]
        top_features = [
            {
                "feature": feature_names[i],
                "importance": float(importances[i])
            }
            for i in indices
        ]
        
        return top_features

# Test the classifier
if __name__ == "__main__":
    from data_generator import LogDataGenerator
    
    # Generate training data
    generator = LogDataGenerator()
    df = generator.generate_dataset(5000)
    
    # Train classifier
    classifier = LogClassifier()
    metrics = classifier.train(df)
    
    print("\n" + "="*50)
    print("🎯 Training Complete!")
    print(f"Accuracy: {metrics['accuracy']*100:.2f}%")
    print("="*50)
    
    # Test predictions
    test_messages = [
        "System crash detected in auth module",
        "User logged in: john_doe",
        "High memory usage detected: 85%"
    ]
    
    print("\n🧪 Testing predictions:")
    for msg in test_messages:
        result = classifier.predict(msg)
        print(f"\nMessage: {msg}")
        print(f"Predicted: {result['predicted_severity']} (confidence: {result['confidence']:.2%})")