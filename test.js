import dbg from './index.js';

console.log('=== DEBUGGIFY PACKAGE COMPREHENSIVE TEST ===');

// Basic logging examples
console.log('\n1. Basic logging tests:');
dbg.info('This is an info message');
dbg.warn('This is a warning message', { reason: 'Just testing warnings' });
dbg.error('This is an error message', new Error('Test error'));
dbg.success('This is a success message');
dbg.debug('This is a debug message');
dbg.trace('This is a trace message');
dbg.fatal('This is a fatal message');

// Namespaced logging
console.log('\n2. Namespaced logging tests:');
const userLogger = dbg('user');
const apiLogger = dbg('api');

userLogger.info('User logged in', { userId: 123 });
apiLogger.warn('API rate limit approaching', { endpoint: '/users', remaining: 10 });

// Grouping
console.log('\n3. Grouping tests:');
const group = dbg.group('Database Operations');
dbg.info('Connecting to database...');
dbg.success('Connected to database');
dbg.info('Running migrations...');
group.end();

// Options configuration
console.log('\n4. Configuration tests:');
console.log('- Default configuration:');
dbg.info('Message with default config');

console.log('- Custom configuration:');
dbg.setOptions({
    showTimestamp: false,
    showSourceLocation: false
});
dbg.info('Message with timestamps and source location disabled');

dbg.setOptions({
    showTimestamp: true,
    showSourceLocation: true,
    enableEmoji: false
});
dbg.info('Message with emojis disabled');

// Format tests
console.log('\n5. Format tests:');
dbg.setFormat('${level} - ${message}');
dbg.info('Message with simple format');
dbg.setFormat('${timestamp} [${level}] ${message} ${metadata}');
dbg.info('Message with custom format', { user: 'test' });

// Custom format function
dbg.setFormatFunction((entry) => {
    return `CUSTOM: [${entry.level}] ${entry.message}`;
});
dbg.info('Message with custom format function');

// Reset format
dbg.setFormat('${emoji} ${level} ${timestamp} ${source} +${timeDiff} - ${message} ${metadata}');
dbg.setFormatFunction((entry) => entry.formattedMessage);


// Different log levels
console.log('\n6. Log level tests:');
console.log('- Setting minimum level to warn:');
dbg.setLevel('warn');
dbg.info('This info message should not be displayed');
dbg.warn('This warning message should be displayed');
dbg.error('This error message should be displayed');

// Reset level
dbg.setLevel('info');

// Function tracing
console.log('\n7. Function tracing tests:');
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

const syncFunction = dbg.traceFn(function multiply(a, b) {
    return a * b;
});

const asyncFunction = dbg.traceFn(async function fetchData(id) {
    await delay(300);
    if (id < 0) {
        throw new Error('Invalid ID');
    }
    return { id, name: 'Test Data' };
});

// Execute traced functions
syncFunction(10, 20);

// Metrics tests
console.log('\n8. Metrics tests:');
// Counters
dbg.count('api_calls');
dbg.count('api_calls');
dbg.count('errors', 5);
console.log(`Counter value: ${dbg.count('api_calls')}`);

// Gauges
dbg.gauge('memory_usage', 1024);
dbg.gauge('cpu_usage', 45.2);

// Histogram
for (let i = 0; i < 10; i++) {
    dbg.recordValue('response_size', Math.random() * 1000);
}

// Timers
const timer1 = dbg.startTimer('operation1');
setTimeout(() => {
    timer1.stop();
    console.log('Timer 1 stopped');
}, 200);

const timer2 = dbg.startTimer('operation2');
setTimeout(() => {
    timer2.stop();
    console.log('Timer 2 stopped');
    
    // Display stats after timers complete
    console.log('Stats:', JSON.stringify(dbg.getStats(), null, 2));
}, 400);

// Error deduplication
console.log('\n9. Error deduplication tests:');
dbg.setOptions({
    deduplicateErrors: true,
    maxDuplicateCount: 3,
    errorWindowMs: 5000
});

const testError = new Error('Duplicate error');
for (let i = 0; i < 10; i++) {
    dbg.error('This is a repeated error', testError);
}

setTimeout(() => {
    console.log('Error stats after duplicates:', JSON.stringify(dbg.getErrorStats(), null, 2));
}, 500);

// Transport tests
console.log('\n10. Transport tests:');
class TestTransport {
    constructor() {
        this.logs = [];
    }
    
    log(entry) {
        this.logs.push(entry);
        console.log(`Test transport received: ${entry.level} - ${entry.message}`);
    }
}

const testTransport = new TestTransport();
dbg.addTransport(testTransport);
dbg.info('This message should go to both console and test transport');

// Remove transport
dbg.removeTransport(testTransport);
dbg.info('This message should only go to console');

// Object inspection
console.log('\n11. Object inspection tests:');
const complexObject = {
    user: { id: 1, name: 'John', roles: ['admin', 'editor'] },
    settings: { theme: 'dark', notifications: true, display: { mode: 'compact', zoom: 1.2 } },
    metrics: { visits: 1254, conversions: 108, rate: 0.086 }
};
dbg.inspect(complexObject, 'Complex Object');

// Run async tests
async function runAsyncTests() {
    console.log('\nRunning async tests...');
    
    try {
        // Test successful async function
        const result = await asyncFunction(42);
        dbg.success('Async function succeeded', result);
        
        // Test error handling in async function
        try {
            await asyncFunction(-1);
        } catch (err) {
            dbg.error('Expected error in async function', err);
        }
    } catch (err) {
        dbg.fatal('Unexpected error in async tests', err);
    }
    
    // Reset metrics at the end
    setTimeout(() => {
        console.log('\nFinal stats before reset:');
        console.log(JSON.stringify(dbg.getStats(), null, 2));
        
        dbg.resetAllMetrics();
        console.log('Metrics after reset:', dbg.getStats());
        
        console.log('\n=== DEBUGGIFY TEST COMPLETE ===');
    }, 1000);
}

// Run everything
runAsyncTests();