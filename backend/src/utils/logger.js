class Logger {
  static log(level, message, metadata = {}) {
    const logEntry = {
      level,
      message,
      metadata,
      timestamp: new Date().toISOString()
    };
    
    console.log(JSON.stringify(logEntry));
  }
  
  static info(message, metadata) {
    this.log('INFO', message, metadata);
  }
  
  static error(message, metadata) {
    this.log('ERROR', message, metadata);
  }
  
  static warn(message, metadata) {
    this.log('WARN', message, metadata);
  }
  
  static debug(message, metadata) {
    this.log('DEBUG', message, metadata);
  }
}

module.exports = Logger;
