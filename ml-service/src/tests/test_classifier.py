"""
ML Classifier Tests — pytest

Run with:  cd ml-service && python -m pytest src/tests/ -v

These tests load the trained model from disk. If models/log_classifier.pkl
does not exist, run `python src/train_model.py` first.
"""
import pytest
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent.parent))

from src.classifier import LogClassifier

# ── Fixtures ──────────────────────────────────────────────────────────────────

@pytest.fixture(scope="module")
def clf():
    classifier = LogClassifier()
    loaded = classifier.load_model()
    if not loaded:
        pytest.skip("Trained model not found — run train_model.py first")
    return classifier


# ── Health checks ─────────────────────────────────────────────────────────────

class TestModelLoad:
    def test_model_is_trained(self, clf):
        assert clf.is_trained is True

    def test_model_has_vectorizer(self, clf):
        assert clf.vectorizer is not None

    def test_model_has_label_encoder(self, clf):
        assert clf.label_encoder is not None

    def test_classes_are_correct(self, clf):
        classes = set(clf.label_encoder.classes_)
        assert classes == {'critical', 'error', 'warning', 'info', 'debug'}


# ── Single prediction ─────────────────────────────────────────────────────────

class TestSinglePrediction:
    def test_returns_required_keys(self, clf):
        result = clf.predict("connection refused")
        assert 'message' in result
        assert 'predicted_severity' in result
        assert 'confidence' in result
        assert 'probabilities' in result

    def test_confidence_in_range(self, clf):
        result = clf.predict("database connection failed")
        assert 0.0 <= result['confidence'] <= 1.0

    def test_probabilities_sum_to_one(self, clf):
        result = clf.predict("high memory usage detected 85%")
        total = sum(result['probabilities'].values())
        assert abs(total - 1.0) < 1e-6

    def test_probabilities_all_non_negative(self, clf):
        result = clf.predict("kernel panic")
        assert all(v >= 0 for v in result['probabilities'].values())

    def test_predicted_severity_matches_max_probability(self, clf):
        result = clf.predict("system crash detected")
        max_prob_class = max(result['probabilities'], key=result['probabilities'].get)
        assert result['predicted_severity'] == max_prob_class


# ── Known-pattern predictions ─────────────────────────────────────────────────

class TestKnownPatterns:
    """These test that the model learned obvious patterns, not exact correctness."""

    CRITICAL_MSGS = [
        "system crash detected in auth module",
        "fatal error out of memory",
        "kernel panic critical failure",
        "OOM killer invoked process killed",
        "database connection failed permanently critical"
    ]
    ERROR_MSGS = [
        "failed to connect to database",
        "API request failed exception timeout",
        "authentication error invalid credentials",
        "connection refused ECONNREFUSED",
        "SQL query failed database error"
    ]
    WARNING_MSGS = [
        "high memory usage detected 85 percent",
        "slow query detected performance degradation",
        "rate limit approaching warning",
        "disk space running low 90 percent",
        "retry attempt failed warning"
    ]
    INFO_MSGS = [
        "user logged in successfully",
        "request processed successfully",
        "service started successfully",
        "health check passed",
        "configuration reloaded"
    ]
    DEBUG_MSGS = [
        "processing request ID debug",
        "query execution time 45ms debug",
        "cache hit for key debug",
        "variable state debug checkpoint"
    ]

    @pytest.mark.parametrize("msg", CRITICAL_MSGS[:3])
    def test_critical_prediction(self, clf, msg):
        result = clf.predict(msg)
        # Allow critical or error (adjacent classes)
        assert result['predicted_severity'] in ('critical', 'error'), \
            f"Expected critical/error for '{msg}', got {result['predicted_severity']}"

    @pytest.mark.parametrize("msg", ERROR_MSGS[:3])
    def test_error_prediction(self, clf, msg):
        result = clf.predict(msg)
        assert result['predicted_severity'] in ('error', 'critical', 'warning'), \
            f"Expected error-adjacent for '{msg}', got {result['predicted_severity']}"

    @pytest.mark.parametrize("msg", WARNING_MSGS[:3])
    def test_warning_prediction(self, clf, msg):
        result = clf.predict(msg)
        assert result['predicted_severity'] in ('warning', 'error', 'info'), \
            f"Expected warning-adjacent for '{msg}', got {result['predicted_severity']}"

    @pytest.mark.parametrize("msg", INFO_MSGS[:3])
    def test_info_prediction(self, clf, msg):
        result = clf.predict(msg)
        assert result['predicted_severity'] in ('info', 'debug', 'warning'), \
            f"Expected info-adjacent for '{msg}', got {result['predicted_severity']}"

    @pytest.mark.parametrize("msg", DEBUG_MSGS[:3])
    def test_debug_prediction(self, clf, msg):
        result = clf.predict(msg)
        assert result['predicted_severity'] in ('debug', 'info'), \
            f"Expected debug/info for '{msg}', got {result['predicted_severity']}"


# ── Out-of-distribution ───────────────────────────────────────────────────────

class TestOutOfDistribution:
    def test_unusual_input_not_overconfident(self, clf):
        """Model should not be 100% confident on clearly OOD inputs."""
        ood_messages = [
            "something completely unusual happened in production system",
            "xyzzy foo bar quux baz qux corge grault garply",
            "the quick brown fox jumps over the lazy dog"
        ]
        for msg in ood_messages:
            result = clf.predict(msg)
            # Confidence < 0.999 — not absurdly overconfident
            assert result['confidence'] < 0.999, \
                f"Overconfident ({result['confidence']:.3f}) on OOD: '{msg}'"

    def test_handles_empty_string(self, clf):
        """Empty string should not raise — model returns some prediction."""
        result = clf.predict("")
        assert 'predicted_severity' in result

    def test_handles_very_long_message(self, clf):
        """Long messages should not raise."""
        long_msg = "connection failed " * 200
        result = clf.predict(long_msg)
        assert 'predicted_severity' in result

    def test_handles_special_characters(self, clf):
        """Special chars in log messages should not raise."""
        result = clf.predict("Error: ECONNREFUSED 127.0.0.1:5432 -- connect(); errno=111")
        assert 'predicted_severity' in result


# ── Batch prediction ──────────────────────────────────────────────────────────

class TestBatchPrediction:
    def test_returns_correct_count(self, clf):
        messages = [
            "error connecting to database",
            "user logged in successfully",
            "high memory usage detected 87%"
        ]
        results = clf.predict(messages)
        assert len(results) == 3

    def test_batch_same_as_single(self, clf):
        """Batch result for each message should match single prediction."""
        messages = ["system crash fatal", "request processed info", "slow query warning"]
        batch    = clf.predict(messages)
        for i, msg in enumerate(messages):
            single = clf.predict(msg)
            assert batch[i]['predicted_severity'] == single['predicted_severity']

    def test_batch_empty_list(self, clf):
        """Empty batch should return empty list."""
        result = clf.predict([])
        assert result == []

    def test_batch_single_element(self, clf):
        """Single-element batch returns list with one dict."""
        result = clf.predict(["error connecting"])
        assert isinstance(result, list)
        assert len(result) == 1
        assert 'predicted_severity' in result[0]


# ── Feature importance ────────────────────────────────────────────────────────

class TestFeatureImportance:
    def test_get_feature_importance_returns_list(self, clf):
        features = clf.get_feature_importance(10)
        assert isinstance(features, list)
        assert len(features) == 10

    def test_features_have_required_keys(self, clf):
        features = clf.get_feature_importance(5)
        for feat in features:
            assert 'feature' in feat
            assert 'importance' in feat

    def test_importances_are_non_negative(self, clf):
        features = clf.get_feature_importance(10)
        for feat in features:
            assert feat['importance'] >= 0

    def test_importances_sorted_descending(self, clf):
        features = clf.get_feature_importance(10)
        for i in range(1, len(features)):
            assert features[i-1]['importance'] >= features[i]['importance']
