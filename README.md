# console-genius

A powerful, feature-rich debugging and logging utility for Node.js applications that enhances console logs with colors, contextual information, metrics tracking, and advanced error handling.

![npm](https://img.shields.io/npm/v/console-genius)
![License](https://img.shields.io/npm/l/console-genius)
![Downloads](https://img.shields.io/npm/dm/console-genius)

## Features

- 🎨 **Colored Output**: Distinct colors for different log levels for better visual scanning
- 📍 **Contextual Information**: Automatic file name and line number tracking
- ⏱️ **Time Tracking**: Shows elapsed time between logs and function execution timing
- 📊 **Metrics Collection**: Built-in counters, gauges, timers, and histograms
- 🐞 **Smart Error Handling**: Error deduplication and frequency tracking
- 🧩 **Namespaces**: Create isolated logger instances for different modules
- 📦 **Log Grouping**: Organize related logs into collapsible groups 
- 🔍 **Function Tracing**: Automatically log function arguments, return values, and execution time
- 🔄 **Multiple Transports**: Log to console, files, or HTTP endpoints
- 🎯 **Custom Formatting**: Define your own log formats or formatting functions

## Installation

```bash
npm install console-genius
```

## Basic Usage

```javascript
import dbg from 'console-genius';

// Simple logs with different levels
dbg.info('Application starting up');
dbg.debug('Connection details', { host: 'localhost', port: 3000 });
dbg.warn('Deprecated function called', { function: 'oldMethod' });
dbg.error('Failed to connect to database', new Error('Connection timeout'));
dbg.success('User registration complete');
dbg.fatal('System shutdown required', { reason: 'Out of memory' });

// Trace function execution automatically
const getUserData = dbg.traceFn(async function getUserData(userId) {
  // Function logic here
  return { id: userId, name: 'John Doe' };
});

// Will log the function call, arguments, return value and execution time
const userData = await getUserData(123);
```

## Advanced Features

### Namespaces

Create isolated loggers for different parts of your application:

```javascript
// Create namespaced loggers
const authLogger = dbg('auth');
const dbLogger = dbg('database');

authLogger.info('User login attempt', { username: 'user123' });
dbLogger.warn('Slow query detected', { query: 'SELECT * FROM users', time: '2.5s' });
```

### Groups

Organize related logs:

```javascript
const group = dbg.group('User Authentication');
dbg.info('Validating credentials');
dbg.debug('Checking password hash');
dbg.success('User authenticated');
group.end();
```

### Metrics and Timing

Track performance metrics:

```javascript
// Increment counters
dbg.count('api_calls');
dbg.count('errors', 5);

// Track values with gauges
dbg.gauge('active_connections', 42);

// Time operations
const timer = dbg.startTimer('database_query');
// ... run database query
const duration = timer.stop(); // duration in ms

// Record histogram values
dbg.recordValue('response_size', 1024);

// Get collected metrics
const stats = dbg.getStats();
console.log(stats.timers.database_query.avg); // Average query time
console.log(stats.counters.api_calls); // Total API calls
```

### Custom Transports

Log to different destinations:

```javascript
// Log to file
const fileTransport = new dbg.FileTransport('./logs/app.log', {
  rotate: true,
  maxSize: '10m',
  maxFiles: 5
});
dbg.addTransport(fileTransport);

// Log to HTTP endpoint
const httpTransport = new dbg.HttpTransport('https://logs.example.com/collect', {
  batchSize: 10,
  interval: 5000,
  headers: { 'Authorization': 'Bearer token123' }
});
dbg.addTransport(httpTransport);
```

### Error Handling

Deduplicate repeated errors:

```javascript
dbg.setOptions({
  deduplicateErrors: true,
  errorWindowMs: 60000,  // 1 minute window
  maxDuplicateCount: 5   // Show first 5 occurrences, then summarize
});

// Get error statistics
const errorStats = dbg.getErrorStats();
console.log(`Total errors: ${errorStats.total}`);
```

## Configuration Options

```javascript
dbg.setOptions({
  // Display options
  showTimestamp: true,        // Show timestamps in logs
  showSourceLocation: true,   // Show file and line information
  enableEmoji: true,          // Show emojis for log levels
  
  // Filtering options
  minLevel: 'info',           // Minimum level to display (trace, debug, info, warn, error, fatal)
  enabledNamespaces: '*',     // Namespace filter (similar to debug.js)
  
  // Output options
  transports: ['console'],    // Output destinations
  
  // Format options
  format: '${emoji} ${level} ${timestamp} ${source} +${timeDiff} - ${message} ${metadata}',
  
  // Error handling
  deduplicateErrors: false,
  errorWindowMs: 60000,       // 1 minute window
  maxDuplicateCount: 5        // Show first 5 occurrences individually
});

// Change format
dbg.setFormat('${timestamp} [${level}] ${message}');

// Or use a custom format function
dbg.setFormatFunction(logEntry => {
  return `[${logEntry.level.toUpperCase()}] ${logEntry.message}`;
});

// Set minimum log level
dbg.setLevel('debug');
```

## API Reference

### Log Levels (in ascending order of severity)

- `dbg.trace(message, [metadata])` - Fine-grained tracing information
- `dbg.debug(message, [metadata])` - Debugging information
- `dbg.info(message, [metadata])` - Informational messages
- `dbg.success(message, [metadata])` - Success messages
- `dbg.warn(message, [metadata])` - Warning messages
- `dbg.error(message, [metadata])` - Error messages
- `dbg.fatal(message, [metadata])` - Critical errors

### Function Tracing

- `dbg.traceFn(function)` - Wraps a function to log calls, arguments, return values, and execution time

### Groups and Inspection

- `dbg.group(name)` - Creates a new log group (returns an object with an `end()` method)
- `dbg.inspect(object, [name])` - Pretty-prints an object with syntax highlighting

### Metrics

- `dbg.count(name, [increment])` - Increment a counter
- `dbg.resetCounter([name])` - Reset a counter or all counters
- `dbg.gauge(name, value)` - Set a gauge value
- `dbg.recordValue(name, value)` - Record a value for histogram
- `dbg.startTimer(name)` - Start a timer (returns object with `stop()` method)
- `dbg.getStats()` - Get all metrics
- `dbg.resetAllMetrics()` - Reset all metrics

### Configuration

- `dbg.setOptions(options)` - Set multiple options at once
- `dbg.setLevel(level)` - Set minimum log level
- `dbg.setFormat(format)` - Set log format string
- `dbg.setFormatFunction(fn)` - Set custom format function
- `dbg.addTransport(transport)` - Add output destination
- `dbg.removeTransport(transport)` - Remove output destination

## Examples

### Real-world Express application example

```javascript
import express from 'express';
import dbg from 'console-genius';

// Configure logger
dbg.setOptions({
  minLevel: process.env.NODE_ENV === 'production' ? 'info' : 'debug'
});

// Create namespaced loggers
const routeLogger = dbg('routes');
const dbLogger = dbg('database');

// Create Express app
const app = express();

// Request logging middleware
app.use((req, res, next) => {
  const timer = routeLogger.startTimer('request');
  
  // Log when request completes
  res.on('finish', () => {
    const duration = timer.stop();
    routeLogger.info(`${req.method} ${req.path} ${res.statusCode}`, {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration,
      contentLength: res.get('Content-Length')
    });
    
    // Record metrics
    dbg.count('requests');
    dbg.recordValue('response_time', duration);
  });
  
  next();
});

// Example route
app.get('/users/:id', dbg.traceFn(async (req, res) => {
  try {
    dbLogger.debug('Fetching user data', { userId: req.params.id });
    
    // Database operation here
    const user = { id: req.params.id, name: 'John Doe' };
    
    dbLogger.success('User data retrieved');
    res.json(user);
  } catch (err) {
    dbLogger.error('Failed to fetch user data', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
}));

// Start server
app.listen(3000, () => {
  dbg.info('Server started', { port: 3000 });
});
```

## Credits

Created by Sandip Ganava

## License

MIT