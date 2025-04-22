import chalk from 'chalk';
import * as stackTrace from 'stack-trace';
import prettyMs from 'pretty-ms';

// Default options
let options = {
    showTimestamp: true,
    logToFile: false,
    defaultLevel: 'info',
    showSourceLocation: true,
    enableEmoji: true,
    minLevel: 'info',        // Minimum level to display
    enabledNamespaces: '*',  // Namespace filter pattern (similar to debug.js)
    transports: ['console'],  // Default to console transport only
    format: '${emoji} ${level} ${timestamp} ${source} +${timeDiff} - ${message} ${metadata}',
    formatFn: null,  // Allow custom formatter function
    deduplicateErrors: false,
    errorWindowMs: 60000, // 1 minute window for deduplication
    maxDuplicateCount: 5  // After this many duplicates, show summary instead
};

// Track time between logs
let lastLogTime = Date.now();

// Define log level hierarchy
const logLevels = {
    trace: 0,
    debug: 1,
    info: 2,
    warn: 3,
    error: 4,
    fatal: 5
};

// Emoji mappings
const emojis = {
    info: '🔵',
    warn: '🟡',
    error: '🔴',
    success: '🟢',
    trace: '📌',
    return: '✅',
    debug: '🟣',
    fatal: '⚫'
};

// Color mappings
const colors = {
    info: chalk.blue,
    warn: chalk.yellow,
    error: chalk.red,
    success: chalk.green,
    trace: chalk.cyan,
    return: chalk.green,
    debug: chalk.magenta,
    fatal: chalk.bgRed.white
};

// Transport registry
const transportRegistry = {
    console: {
        log: (logEntry) => {
            // Use your existing console.log implementation
            console.log(logEntry.formattedMessage);
        }
    }
};

// Metrics storage
const metrics = {
    counters: {},
    gauges: {},
    histograms: {},
    timers: {}
};

// Store for seen errors
const errorCache = {
    errors: new Map(),
    cleanup: null
};

// Helper to get caller info
function getCallerInfo() {
    const trace = stackTrace.get();
    // Skip stack frames related to this module
    let relevantFrame;
    for (let i = 0; i < trace.length; i++) {
        if (!trace[i].getFileName()?.includes('debuggify')) {
            relevantFrame = trace[i];
            break;
        }
    }

    if (!relevantFrame) return '';

    const fileName = relevantFrame.getFileName()?.split('/').pop() || 'unknown';
    const lineNumber = relevantFrame.getLineNumber() || '?';
    return `${fileName}:${lineNumber}`;
}

// Format any value for output
function formatValue(value) {
    if (typeof value === 'object' && value !== null) {
        return JSON.stringify(value);
    }
    return String(value);
}

// Check if a log should be shown based on level and namespace
function shouldLog(level, namespace = 'default') {
    // Check log level
    if (logLevels[level] < logLevels[options.minLevel]) {
        return false;
    }
    
    // Check namespace
    if (options.enabledNamespaces === '*') {
        return true;
    }
    
    const patterns = options.enabledNamespaces.split(',');
    return patterns.some(pattern => {
        if (pattern.startsWith('-')) {
            return !namespace.match(new RegExp(pattern.substring(1)));
        }
        return namespace.match(new RegExp(pattern));
    });
}

// Parse a format string and apply it to a log entry
function formatLog(format, logEntry) {
    return format.replace(/\${(\w+)}/g, (match, key) => {
        switch (key) {
            case 'emoji':
                return options.enableEmoji ? (emojis[logEntry.level] || '📋') : '';
            case 'level':
                return colors[logEntry.level](`[${logEntry.level.toUpperCase()}]`);
            case 'timestamp':
                return logEntry.timestamp;
            case 'source':
                return logEntry.source ? `(${chalk.gray(logEntry.source)})` : '';
            case 'timeDiff':
                return prettyMs(logEntry.timeDiff);
            case 'message':
                return logEntry.message;
            case 'metadata':
                return logEntry.metadata !== null ? formatValue(logEntry.metadata) : '';
            case 'namespace':
                return logEntry.namespace ? `[${logEntry.namespace}]` : '';
            default:
                return match; // Keep the placeholder if not recognized
        }
    });
}

// Base log function
function log(level, message, metadata = null, namespace = 'default') {
    // Check log level and namespace first
    if (!shouldLog(level, namespace)) {
        return;
    }

    const now = new Date();
    const timeDiff = now - lastLogTime;
    lastLogTime = now;

    // Create log entry object
    const logEntry = {
        level,
        message,
        metadata,
        namespace,
        timestamp: now.toLocaleTimeString(),
        isoTimestamp: now.toISOString(),
        timeDiff,
        source: options.showSourceLocation ? getCallerInfo() : '',
        elapsed: prettyMs(timeDiff)
    };

    // Prepare parts of the log for standard console output
    let logParts = [];

    // Emoji
    if (options.enableEmoji) {
        logParts.push(emojis[level] || '📋');
    }

    // Level
    logParts.push(colors[level](`[${level.toUpperCase()}]`));

    // Timestamp
    if (options.showTimestamp) {
        const timeStr = now.toLocaleTimeString();
        logParts.push(`${timeStr}`);
    }

    // Source location
    if (options.showSourceLocation) {
        const sourceInfo = getCallerInfo();
        if (sourceInfo) {
            logParts.push(`(${chalk.gray(sourceInfo)})`);
        }
    }

    // Namespace
    if (namespace !== 'default') {
        logParts.push(`[${namespace}]`);
    }

    // Time diff
    logParts.push(`+${prettyMs(timeDiff)}`);

    // Message
    logParts.push('-');
    logParts.push(message);

    // Metadata
    if (metadata !== null) {
        logParts.push(formatValue(metadata));
    }

    // Save the formatted message to the log entry
    logEntry.formattedMessage = logParts.join(' ');

    // Apply custom format function if provided
    if (typeof options.formatFn === 'function') {
        logEntry.formattedMessage = options.formatFn(logEntry);
    } else if (options.format && options.format !== '${emoji} ${level} ${timestamp} ${source} +${timeDiff} - ${message} ${metadata}') {
        // Use format string if it's not the default
        logEntry.formattedMessage = formatLog(options.format, logEntry);
    }

    // Send to all enabled transports
    if (typeof options.transports === 'string') {
        options.transports = [options.transports]; // Convert string to array
    }
    
    options.transports.forEach(transport => {
        if (typeof transport === 'string') {
            // Built-in transport
            if (transportRegistry[transport]) {
                transportRegistry[transport].log(logEntry);
            }
        } else if (typeof transport === 'object' && typeof transport.log === 'function') {
            // Custom transport object
            transport.log(logEntry);
        }
    });
}

// Transport interfaces
class FileTransport {
    constructor(filePath, options = {}) {
        this.filePath = filePath;
        this.options = {
            rotate: true,
            maxSize: 10 * 1024 * 1024, // 10MB
            maxFiles: 5,
            ...options
        };
        
        // In a real implementation, you'd set up file handling here
        // with rotation logic using something like rotating-file-stream
        const fs = require('fs');
        this.stream = fs.createWriteStream(filePath, { flags: 'a' });
    }
    
    log(logEntry) {
        const logLine = `${logEntry.isoTimestamp} [${logEntry.level.toUpperCase()}] ${logEntry.message}\n`;
        this.stream.write(logLine);
    }
    
    // Clean up resources when done
    close() {
        if (this.stream) {
            this.stream.end();
        }
    }
}

class HttpTransport {
    constructor(endpoint, options = {}) {
        this.endpoint = endpoint;
        this.options = {
            batchSize: 10,     // Number of logs to batch together
            interval: 5000,    // Flush interval in ms
            headers: {},       // Custom headers
            ...options
        };
        
        this.logQueue = [];
        this.timer = setInterval(() => this.flush(), this.options.interval);
    }
    
    log(logEntry) {
        this.logQueue.push(logEntry);
        
        if (this.logQueue.length >= this.options.batchSize) {
            this.flush();
        }
    }
    
    async flush() {
        if (this.logQueue.length === 0) return;
        
        const logsToSend = [...this.logQueue];
        this.logQueue = [];
        
        try {
            // In a real implementation, you'd use fetch or axios here
            const response = await fetch(this.endpoint, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    ...this.options.headers
                },
                body: JSON.stringify(logsToSend)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error ${response.status}`);
            }
        } catch (err) {
            // If sending fails, put logs back in the queue
            console.error('Failed to send logs:', err);
            this.logQueue = [...logsToSend, ...this.logQueue];
        }
    }
    
    close() {
        clearInterval(this.timer);
        this.flush();
    }
}

// Group management
const groups = {
    start(name) {
        console.group(chalk.bold(`📦 ${name}`));
        return {
            end: () => console.groupEnd()
        };
    }
};

// Function tracing wrapper
function traceFn(fn) {
    return function (...args) {
        const fnName = fn.name || 'anonymous';

        // Log function call with arguments
        const argStr = args.map((arg, i) => `${i < fn.length ? fn.length : ''}_${i}=${formatValue(arg)}`).join(', ');
        log('trace', `${fnName}(${argStr})`);

        const startTime = Date.now();

        try {
            const result = fn.apply(this, args);

            // Handle promises
            if (result instanceof Promise) {
                return result.then(asyncResult => {
                    const endTime = Date.now();
                    const duration = endTime - startTime;
                    log('return', `${fnName} → ${formatValue(asyncResult)} (${prettyMs(duration)})`);
                    // Record the timing
                    recordTiming(fnName, duration);
                    return asyncResult;
                }).catch(err => {
                    logError(`${fnName} threw an error`, err);
                    throw err;
                });
            } else {
                // Handle synchronous functions
                const endTime = Date.now();
                const duration = endTime - startTime;
                log('return', `${fnName} → ${formatValue(result)} (${prettyMs(duration)})`);
                // Record the timing
                recordTiming(fnName, duration);
                return result;
            }
        } catch (err) {
            logError(`${fnName} threw an error`, err);
            throw err;
        }
    };
}

// Object inspection
function inspect(obj, name = 'Object') {
    log('info', `Inspecting ${name}:`, null);
    console.dir(obj, { colors: true, depth: null });
    return obj;
}

// Set custom options
function setOptions(newOptions) {
    options = { ...options, ...newOptions };
    
    // If error deduplication options changed, reset the cleanup
    if ('errorWindowMs' in newOptions) {
        setupErrorCacheCleanup();
    }
}

// Set log level
function setLevel(level) {
    if (!logLevels[level]) {
        throw new Error(`Unknown log level: ${level}`);
    }
    options.minLevel = level;
}

// Add format setting functions
function setFormat(format) {
    options.format = format;
    options.formatFn = null; // Clear custom formatter
}

function setFormatFunction(fn) {
    if (typeof fn !== 'function') {
        throw new Error('Format function must be a function');
    }
    options.formatFn = fn;
}

// Add transport registration functions
function addTransport(transport) {
    if (typeof options.transports === 'string') {
        options.transports = [options.transports];
    }
    
    if (typeof transport === 'string') {
        if (!transportRegistry[transport]) {
            throw new Error(`Unknown transport: ${transport}`);
        }
        if (!options.transports.includes(transport)) {
            options.transports.push(transport);
        }
    } else if (typeof transport === 'object' && typeof transport.log === 'function') {
        options.transports.push(transport);
    } else {
        throw new Error('Transport must be a string name or an object with a log method');
    }
}

function removeTransport(transport) {
    if (typeof options.transports === 'string') {
        if (options.transports === transport) {
            options.transports = [];
        }
        return;
    }
    
    const index = options.transports.indexOf(transport);
    if (index !== -1) {
        options.transports.splice(index, 1);
    }
}

// Timing functions
function startTimer(name) {
    const startTime = Date.now();
    return {
        stop: () => {
            const duration = Date.now() - startTime;
            recordTiming(name, duration);
            return duration;
        }
    };
}

function recordTiming(name, durationMs) {
    if (!metrics.timers[name]) {
        metrics.timers[name] = {
            count: 0,
            total: 0,
            min: Infinity,
            max: 0,
            avg: 0,
            samples: []
        };
    }

    const timer = metrics.timers[name];
    timer.count++;
    timer.total += durationMs;
    timer.min = Math.min(timer.min, durationMs);
    timer.max = Math.max(timer.max, durationMs);
    timer.avg = timer.total / timer.count;
    
    // Keep last 100 samples for percentiles
    timer.samples.push(durationMs);
    if (timer.samples.length > 100) {
        timer.samples.shift();
    }
}

// Counter functions
function count(name, increment = 1) {
    if (!metrics.counters[name]) {
        metrics.counters[name] = 0;
    }
    metrics.counters[name] += increment;
    return metrics.counters[name];
}

function resetCounter(name) {
    if (name) {
        metrics.counters[name] = 0;
    } else {
        metrics.counters = {};
    }
}

// Gauge functions (set to specific value)
function gauge(name, value) {
    metrics.gauges[name] = value;
    return value;
}

// Histogram (frequency distribution)
function recordValue(name, value) {
    if (!metrics.histograms[name]) {
        metrics.histograms[name] = [];
    }
    
    metrics.histograms[name].push(value);
    
    // Keep histograms to a reasonable size
    if (metrics.histograms[name].length > 1000) {
        metrics.histograms[name].shift();
    }
}

// Helper to calculate percentile
function percentile(sortedArray, p) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * p) - 1;
    return sortedArray[Math.max(0, Math.min(sortedArray.length - 1, index))];
}

// Get stats and metrics
function getStats() {
    // Calculate percentiles for timers
    const timersWithPercentiles = Object.entries(metrics.timers).reduce((acc, [name, timer]) => {
        if (timer.samples.length === 0) {
            acc[name] = timer;
            return acc;
        }
        
        // Sort samples for percentile calculation
        const sortedSamples = [...timer.samples].sort((a, b) => a - b);
        
        acc[name] = {
            ...timer,
            p50: percentile(sortedSamples, 0.5),
            p90: percentile(sortedSamples, 0.9),
            p95: percentile(sortedSamples, 0.95),
            p99: percentile(sortedSamples, 0.99)
        };
        
        return acc;
    }, {});
    
    return {
        counters: { ...metrics.counters },
        gauges: { ...metrics.gauges },
        histograms: { ...metrics.histograms },
        timers: timersWithPercentiles
    };
}

// Reset all metrics
function resetAllMetrics() {
    metrics.counters = {};
    metrics.gauges = {};
    metrics.histograms = {};
    metrics.timers = {};
}

// Generate a signature for an error to identify duplicates
function getErrorSignature(error) {
    if (typeof error !== 'object' || error === null) {
        return String(error);
    }
    
    // For Error objects, combine message and a portion of the stack
    if (error instanceof Error) {
        // Extract first 3 lines of stack trace for the signature
        const stackSample = error.stack
            ? error.stack.split('\n').slice(0, 3).join('\n')
            : '';
        
        return `${error.name}:${error.message}:${stackSample}`;
    }
    
    // For other objects, use a simplified JSON representation
    try {
        return JSON.stringify(error);
    } catch (e) {
        return Object.prototype.toString.call(error);
    }
}

// Setup cleanup for error cache
function setupErrorCacheCleanup() {
    if (errorCache.cleanup) {
        clearInterval(errorCache.cleanup);
    }
    
    errorCache.cleanup = setInterval(() => {
        const now = Date.now();
        for (const [signature, entry] of errorCache.errors.entries()) {
            if (now - entry.lastSeen > options.errorWindowMs) {
                errorCache.errors.delete(signature);
            }
        }
    }, options.errorWindowMs / 2);
}

// Initialize error cache cleanup
setupErrorCacheCleanup();

// Enhanced error logging with deduplication
function logError(message, error) {
    if (!options.deduplicateErrors) {
        // Use original error logging
        return log('error', message, error);
    }
    
    const signature = getErrorSignature(error);
    const now = Date.now();
    
    if (!errorCache.errors.has(signature)) {
        // First occurrence of this error
        errorCache.errors.set(signature, {
            count: 1,
            firstSeen: now,
            lastSeen: now,
            message,
            error
        });
        
        // Log normally
        log('error', message, error);
    } else {
        // We've seen this error before
        const entry = errorCache.errors.get(signature);
        entry.count++;
        entry.lastSeen = now;
        
        // Log differently based on count
        if (entry.count <= options.maxDuplicateCount) {
            // Log with duplicate counter
            log('error', `${message} (${entry.count}x)`, error);
        } else if (entry.count === options.maxDuplicateCount + 1) {
            // Final individual log before switching to summary mode
            log('error', `${message} (${entry.count}x - further occurrences will be summarized)`, error);
        } else if ((entry.count - options.maxDuplicateCount) % 10 === 0) {
            // Periodic summary
            const timeSpan = prettyMs(now - entry.firstSeen);
            log('error', `Error occurring frequently: ${message} (${entry.count}x in ${timeSpan})`, {
                summary: `Repeated error of type ${error.name || typeof error}`,
                firstSeen: new Date(entry.firstSeen).toISOString()
            });
        }
    }
}

// Get error statistics
function getErrorStats() {
    const stats = Array.from(errorCache.errors.entries()).map(([signature, entry]) => ({
        signature: signature.substring(0, 100) + (signature.length > 100 ? '...' : ''),
        count: entry.count,
        firstSeen: new Date(entry.firstSeen).toISOString(),
        lastSeen: new Date(entry.lastSeen).toISOString(),
        message: entry.message
    }));
    
    return {
        total: stats.reduce((sum, entry) => sum + entry.count, 0),
        uniqueCount: stats.length,
        errors: stats.sort((a, b) => b.count - a.count) // Sort by frequency
    };
}

// Create namespaced logger
function createNamespace(namespace) {
    return {
        info: (message, metadata) => log('info', message, metadata, namespace),
        warn: (message, metadata) => log('warn', message, metadata, namespace),
        error: (message, metadata) => logError(message, metadata, namespace),
        success: (message, metadata) => log('success', message, metadata, namespace),
        debug: (message, metadata) => log('debug', message, metadata, namespace),
        trace: (message, metadata) => log('trace', message, metadata, namespace),
        fatal: (message, metadata) => log('fatal', message, metadata, namespace),
        traceFn: (fn) => traceFn(fn, namespace),
        group: groups.start,
        inspect: (obj, name) => inspect(obj, name, namespace),
        count: (name, increment) => count(`${namespace}:${name}`, increment),
        gauge: (name, value) => gauge(`${namespace}:${name}`, value),
        startTimer: (name) => startTimer(`${namespace}:${name}`),
        recordValue: (name, value) => recordValue(`${namespace}:${name}`, value)
    };
}

// Register built-in transports
transportRegistry.file = FileTransport;
transportRegistry.http = HttpTransport;

// Create the main exports
const dbg = (namespace) => createNamespace(namespace || 'default');

// Add methods to the function object
Object.assign(dbg, {
    info: (message, metadata) => log('info', message, metadata),
    warn: (message, metadata) => log('warn', message, metadata),
    error: (message, metadata) => logError(message, metadata),
    success: (message, metadata) => log('success', message, metadata),
    debug: (message, metadata) => log('debug', message, metadata),
    trace: (message, metadata) => log('trace', message, metadata),
    fatal: (message, metadata) => log('fatal', message, metadata),
    traceFn,
    group: groups.start,
    inspect,
    setOptions,
    setLevel,
    setFormat,
    setFormatFunction,
    addTransport,
    removeTransport,
    FileTransport,
    HttpTransport,
    count,
    resetCounter,
    gauge,
    recordValue,
    startTimer,
    recordTiming,
    getStats,
    resetAllMetrics,
    getErrorStats
});

export default dbg;