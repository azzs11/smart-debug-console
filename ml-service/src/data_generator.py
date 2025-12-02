# ml-service/src/data_generator.py
import random
import pandas as pd
from datetime import datetime, timedelta

class LogDataGenerator:
    """Generate synthetic log data for training the classifier"""
    
    def __init__(self):
        self.log_templates = {
            "critical": [
                "System crash detected in module {module}",
                "Fatal error: Out of memory in {module}",
                "Database connection failed permanently",
                "Security breach detected from IP {ip}",
                "Critical service {service} is down",
                "Data corruption detected in {module}",
                "System kernel panic in {module}",
                "Fatal authentication failure",
                "Critical resource exhaustion in {service}",
                "Unrecoverable error in {module}"
            ],
            "error": [
                "Failed to connect to {service}",
                "Error processing request in {module}",
                "Exception in {module}: {error_type}",
                "Database query failed: {error_type}",
                "API call failed: {error_type}",
                "File not found: {file}",
                "Permission denied in {module}",
                "Timeout error in {service}",
                "Invalid response from {service}",
                "Failed to parse data in {module}"
            ],
            "warning": [
                "High memory usage detected: {percent}%",
                "Slow query detected in {module}",
                "Deprecated API usage in {module}",
                "Rate limit approaching for {service}",
                "Cache miss ratio high in {module}",
                "Retry attempt {num} for {service}",
                "Connection pool near capacity",
                "Disk space running low: {percent}%",
                "SSL certificate expires soon",
                "Performance degradation in {module}"
            ],
            "info": [
                "Request processed successfully in {module}",
                "User logged in: {user}",
                "Service {service} started successfully",
                "Configuration reloaded",
                "Cache refreshed for {module}",
                "Scheduled task completed: {task}",
                "Connection established to {service}",
                "Data backup completed successfully",
                "New session created for user {user}",
                "Health check passed for {service}"
            ],
            "debug": [
                "Processing request ID: {id}",
                "Function {function} called with params {params}",
                "Variable state: {variable}={value}",
                "Entering method {method} in {module}",
                "Loop iteration {num} in {module}",
                "Query execution time: {time}ms",
                "Response size: {size} bytes",
                "Cache hit for key: {key}",
                "Thread {thread} started",
                "Debug checkpoint reached in {module}"
            ]
        }
        
        self.modules = ["auth", "api", "database", "cache", "payment", "user-service", "order-service", "notification"]
        self.services = ["Redis", "PostgreSQL", "MongoDB", "Elasticsearch", "RabbitMQ", "Nginx"]
        self.error_types = ["NullPointerException", "TimeoutException", "ConnectionError", "ValueError", "TypeError"]
        self.users = ["john_doe", "jane_smith", "admin", "test_user", "api_client"]
        
    def generate_log(self, severity=None):
        """Generate a single log entry"""
        if severity is None:
            severity = random.choice(list(self.log_templates.keys()))
        
        template = random.choice(self.log_templates[severity])
        
        # Fill in placeholders
        message = template.format(
            module=random.choice(self.modules),
            service=random.choice(self.services),
            error_type=random.choice(self.error_types),
            ip=f"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
            file=f"/var/log/{random.choice(self.modules)}.log",
            percent=random.randint(60, 95),
            num=random.randint(1, 5),
            user=random.choice(self.users),
            task=f"task_{random.randint(1000, 9999)}",
            id=f"req_{random.randint(10000, 99999)}",
            function=f"process_{random.choice(['data', 'request', 'response'])}",
            params=f"{{id: {random.randint(1, 100)}}}",
            variable=random.choice(['user_id', 'order_id', 'session_id']),
            value=random.randint(1, 1000),
            method=random.choice(['authenticate', 'validate', 'process', 'execute']),
            time=random.randint(10, 500),
            size=random.randint(100, 10000),
            key=f"cache_key_{random.randint(1, 100)}",
            thread=f"thread_{random.randint(1, 10)}"
        )
        
        return {
            "message": message,
            "severity": severity,
            "source": random.choice(self.modules),
            "timestamp": datetime.now().isoformat()
        }
    
    def generate_dataset(self, size=5000):
        """Generate a balanced dataset for training"""
        logs = []
        severity_levels = list(self.log_templates.keys())
        logs_per_severity = size // len(severity_levels)
        
        for severity in severity_levels:
            for _ in range(logs_per_severity):
                logs.append(self.generate_log(severity))
        
        # Add some random logs to reach exact size
        while len(logs) < size:
            logs.append(self.generate_log())
        
        # Shuffle the dataset
        random.shuffle(logs)
        
        df = pd.DataFrame(logs)
        print(f"✅ Generated {len(df)} training samples")
        print(f"📊 Distribution:\n{df['severity'].value_counts()}")
        
        return df

# Test the generator
if __name__ == "__main__":
    generator = LogDataGenerator()
    df = generator.generate_dataset(1000)
    print("\nSample logs:")
    print(df.head(10))