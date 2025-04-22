# console-genius

A lightweight and beautiful debug logging utility for Node.js developers that improves console logs with colored output, contextual information, and function tracing.

## Features

- 🎨 **Colored Output**: Different colors for different log levels
- 📍 **Contextual Info**: Automatically shows file name and line number
- 🔍 **Function Tracing**: Logs function arguments and return values
- ⏱️ **Time Diffing**: Shows time elapsed between logs
- 📦 **Log Grouping**: Organize logs into collapsible groups
- 🧩 **Object Inspection**: Pretty-print objects with proper formatting

## Installation

```bash
npm install console-genius
```

## Basic Usage

```javascript
const dbg = require('console-genius');

// Simple logs
dbg.info('Starting application');
dbg.warn('Configuration missing', { section: 'auth' });
dbg.error('Connection failed', new Error('Timeout'));
dbg.success('Data saved successfully');

// Group related logs
const group = dbg.group('User Authentication');
dbg.info('Validating credentials');
dbg.success('User authenticated');
group.end();

// Trace function execution
const getUserData = dbg.traceFn(async function getUserData(userId) {
  // Function logic here
  return { id: userId, name: 'John' };
});

// Will automatically log the call and return value
const userData = await getUserData(123);
```

## Configuration

Customize the logger behavior:

```javascript
dbg.setOptions({
  showTimestamp: true,      // Show/hide timestamps in logs
  logToFile: false,         // Enable logging to file (coming soon)
  defaultLevel: 'info',     // Default log level
  showSourceLocation: true, // Show/hide file and line number
  enableEmoji: true         // Show/hide emojis in logs
});
```

## API Reference

### Log Levels

- `dbg.info(message, [metadata])` - Informational messages
- `dbg.warn(message, [metadata])` - Warnings
- `dbg.error(message, [metadata])` - Errors
- `dbg.success(message, [metadata])` - Success messages

### Function Tracing

- `dbg.traceFn(function)` - Wraps a function to log calls, arguments, return values and execution time

### Groups

- `dbg.group(name)` - Creates a new log group
  - Returns an object with an `end()` method to close the group

### Object Inspection

- `dbg.inspect(object, [name])` - Pretty-prints an object with syntax highlighting

## License

MIT
```

## 6. LICENSE file

```
MIT License

Copyright (c) 2025 Your Name

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.