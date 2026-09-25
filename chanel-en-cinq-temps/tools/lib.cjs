'use strict';
const path = require('path');
const { execSync } = require('child_process');
const { pathToFileURL } = require('url');

// Use a local playwright if the project has one, else the global install.
function requirePlaywright() {
  try {
    return require('playwright');
  } catch (_) {
    const root = execSync('npm root -g').toString().trim();
    return require(path.join(root, 'playwright'));
  }
}

function filmURL(params = {}) {
  const url = pathToFileURL(path.join(__dirname, '..', 'index.html'));
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  return url.href;
}

// An ffmpeg with libx264 + aac: $FFMPEG, then PATH, then imageio-ffmpeg.
function findFFmpeg() {
  if (process.env.FFMPEG) return process.env.FFMPEG;
  try {
    execSync('ffmpeg -hide_banner -encoders 2>/dev/null | grep -q libx264', { stdio: 'ignore', shell: '/bin/bash' });
    return 'ffmpeg';
  } catch (_) {}
  try {
    return execSync('python3 -c "import imageio_ffmpeg;print(imageio_ffmpeg.get_ffmpeg_exe())"').toString().trim();
  } catch (_) {}
  throw new Error('No ffmpeg with libx264 found. Set FFMPEG=/path/to/ffmpeg (or pip install imageio-ffmpeg).');
}

module.exports = { requirePlaywright, filmURL, findFFmpeg };
