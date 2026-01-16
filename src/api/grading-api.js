const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Store active processes
const activeProcesses = new Map();

// Start servers (backend + frontend)
router.post('/start-servers', (req, res) => {
  const { repoUrl } = req.body;
  
  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  const processId = Date.now().toString();
  
  // Start the server process
  const serverProcess = spawn('node', ['src/index.js', repoUrl], {
    cwd: path.join(__dirname, '../..'),
    shell: true
  });

  activeProcesses.set(processId, { type: 'servers', process: serverProcess, repoUrl });

  serverProcess.stdout.on('data', (data) => {
    console.log(`[Servers ${processId}]:`, data.toString());
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`[Servers ${processId}]:`, data.toString());
  });

  res.json({ 
    success: true, 
    processId,
    message: 'Servers starting...'
  });
});

// Run grading
router.post('/run-grading', (req, res) => {
  const { repoUrl } = req.body;
  
  if (!repoUrl) {
    return res.status(400).json({ error: 'Repository URL is required' });
  }

  const processId = Date.now().toString();
  
  // Run the grading script
  const gradingProcess = spawn('npm', ['run', 'grade', repoUrl], {
    cwd: path.join(__dirname, '../..'),
    shell: true
  });

  let output = '';

  gradingProcess.stdout.on('data', (data) => {
    output += data.toString();
    console.log(`[Grading ${processId}]:`, data.toString());
  });

  gradingProcess.stderr.on('data', (data) => {
    output += data.toString();
    console.error(`[Grading ${processId}]:`, data.toString());
  });

  gradingProcess.on('close', (code) => {
    console.log(`Grading process exited with code ${code}`);
    activeProcesses.delete(processId);
  });

  activeProcesses.set(processId, { type: 'grading', process: gradingProcess, repoUrl });

  res.json({ 
    success: true, 
    processId,
    message: 'Grading started...'
  });
});

// Stop a process
router.post('/stop-process', (req, res) => {
  const { processId } = req.body;
  
  const processInfo = activeProcesses.get(processId);
  
  if (!processInfo) {
    return res.status(404).json({ error: 'Process not found' });
  }

  processInfo.process.kill();
  activeProcesses.delete(processId);

  res.json({ success: true, message: 'Process stopped' });
});

// Get active processes
router.get('/processes', (req, res) => {
  const processes = Array.from(activeProcesses.entries()).map(([id, info]) => ({
    id,
    type: info.type,
    repoUrl: info.repoUrl
  }));

  res.json(processes);
});

module.exports = router;