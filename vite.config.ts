import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'local-audio-downloader-api',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          
          if (req.url === '/api/tracks' && req.method === 'GET') {
            const audioDir = path.resolve(__dirname, './public/audio');
            
            if (!fs.existsSync(audioDir)) {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ success: true, tracks: [] }));
              return;
            }

            try {
              const files = fs.readdirSync(audioDir);
              const uniqueTracks = new Set<string>();

              files.forEach(file => {
                if (file.endsWith('.mp3')) {
                  const cleanKey = file.replace(/_(easy|medium)\.mp3$/, '');
                  uniqueTracks.add(cleanKey);
                }
              });

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ 
                success: true, 
                tracks: Array.from(uniqueTracks) 
              }));
            } catch (err) {
              res.statusCode = 500;
              res.end(JSON.stringify({ error: 'Failed to read audio directory' }));
            }
            return;
          }

          if (req.url === '/api/download' && req.method === 'POST') {
            let body = '';
            req.on('data', chunk => { body += chunk; });
            req.on('end', () => {
              try {
                const { youtubeUrl } = JSON.parse(body);
                if (!youtubeUrl) {
                  res.statusCode = 400;
                  res.end(JSON.stringify({ error: 'Missing youtubeUrl' }));
                  return;
                }

                exec(`./.venv/bin/python3 download_audio.py "${youtubeUrl}"`, (error) => {
                  if (error) {
                    console.error('Python Exec Error:', error);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Failed to process video audio' }));
                    return;
                  }

                  try {
                    const resultPath = path.resolve(__dirname, 'download_result.json');
                    if (fs.existsSync(resultPath)) {
                      const rawData = fs.readFileSync(resultPath, 'utf-8');
                      const { audioKey, correctAnswer } = JSON.parse(rawData);
                      fs.unlinkSync(resultPath);

                      res.setHeader('Content-Type', 'application/json');
                      res.end(JSON.stringify({ success: true, audioKey, correctAnswer }));
                    } else {
                      throw new Error("Result JSON file not found.");
                    }
                  } catch (err) {
                    console.error('Failed to parse download result:', err);
                    res.statusCode = 500;
                    res.end(JSON.stringify({ error: 'Failed to parse track metadata' }));
                  }
                });
              } catch (err) {
                res.statusCode = 500;
                res.end(JSON.stringify({ error: 'Payload parse error' }));
              }
            });
            return;
          }

          next();
        });
      }
    }
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});