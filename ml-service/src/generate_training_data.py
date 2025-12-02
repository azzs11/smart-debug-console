# ml-service/src/generate_training_data.py
import pandas as pd
import os

# Training data with clear patterns
training_data = {
    'message': [],
    'severity': []
}

# CRITICAL patterns (100 samples)
critical_messages = [
    "database connection pool exhausted",
    "system running out of memory",
    "security breach detected",
    "data corruption detected",
    "catastrophic failure in payment service",
    "all database replicas down",
    "disk full unable to write",
    "critical service unavailable",
    "system crash null pointer exception",
    "unrecoverable error data loss detected",
    "complete system shutdown required",
    "fatal error kernel panic",
    "critical security vulnerability",
    "multiple cascading failures",
    "deadlock detected in critical path",
    "out of memory system unstable",
    "critical data breach customer data exposed",
    "service completely unresponsive",
    "emergency maintenance required",
    "system integrity compromised",
] * 5

# ERROR patterns (100 samples)
error_messages = [
    "failed to connect to database",
    "authentication failed invalid credentials",
    "payment gateway timeout",
    "file upload failed size exceeded",
    "api request failed 404 not found",
    "email delivery failed",
    "database query failed",
    "session expired",
    "validation error missing required field",
    "permission denied for resource",
    "network request timeout",
    "failed to parse json response",
    "external service unavailable",
    "image processing failed",
    "failed to write to file system",
    "webhook delivery failed",
    "transaction rollback constraint violation",
    "failed to decrypt data",
    "invalid configuration parameter",
    "connection refused by remote server",
] * 5

# WARNING patterns (100 samples)
warning_messages = [
    "high memory usage 85 percent",
    "response time exceeded 500ms",
    "cache miss fetching from database",
    "retry attempt 2 of 3",
    "deprecated api endpoint used",
    "rate limit approaching threshold",
    "disk space low 15 percent remaining",
    "connection pool near capacity",
    "long running query detected",
    "token expiring in 5 minutes",
    "unusual traffic pattern detected",
    "cpu usage above 80 percent",
    "ssl certificate expires in 7 days",
    "failed login attempt",
    "queue size growing 1000 messages",
    "slow network response detected",
    "maximum retry attempts reached",
    "session timeout warning",
    "large payload detected 5mb",
    "stale cache data detected",
] * 5

# INFO patterns (100 samples)  
info_messages = [
    "application started successfully",
    "database connection established",
    "user authentication successful",
    "request completed in 45ms",
    "cache hit for user profile",
    "file uploaded successfully",
    "email sent to user",
    "session created for user",
    "api response successful",
    "payment processed successfully",
    "configuration loaded",
    "service health check passed",
    "backup completed successfully",
    "data sync completed",
    "report generated successfully",
    "user logged in successfully",
    "transaction committed",
    "cache warmed up",
    "server started on port 8080",
    "webhook delivered successfully",
] * 5

# DEBUG patterns (100 samples)
debug_messages = [
    "query execution time 45ms",
    "cache lookup performed",
    "request received get api users",
    "response sent 200 ok",
    "function called process payment",
    "variable initialized userid 12345",
    "loop iteration 50 of 100",
    "entering method validate input",
    "exiting method calculate total",
    "breakpoint hit line 234",
    "memory allocated 1024 bytes",
    "thread spawned worker thread 3",
    "event triggered on data received",
    "condition evaluated true",
    "array size 150 elements",
    "object created user instance",
    "connection opened to cache server",
    "file descriptor 42",
    "stack trace captured",
    "garbage collection triggered",
] * 5

# Combine all data
training_data['message'].extend(critical_messages)
training_data['severity'].extend(['critical'] * len(critical_messages))

training_data['message'].extend(error_messages)
training_data['severity'].extend(['error'] * len(error_messages))

training_data['message'].extend(warning_messages)
training_data['severity'].extend(['warning'] * len(warning_messages))

training_data['message'].extend(info_messages)
training_data['severity'].extend(['info'] * len(info_messages))

training_data['message'].extend(debug_messages)
training_data['severity'].extend(['debug'] * len(debug_messages))

# Create DataFrame
df = pd.DataFrame(training_data)

# Shuffle the data
df = df.sample(frac=1, random_state=42).reset_index(drop=True)

# Save to CSV
output_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'training_logs.csv')
df.to_csv(output_path, index=False)

print(f"✅ Generated {len(df)} training samples")
print(f"📊 Distribution:\n{df['severity'].value_counts()}")
print(f"💾 Saved to: {output_path}")