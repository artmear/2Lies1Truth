import os
import re
import subprocess
import sys
import unicodedata
import json
import yt_dlp

def slugify(value):
    value = unicodedata.normalize('NFKD', value).encode('ascii', 'ignore').decode('ascii')
    value = re.sub(r'[^\w\s-]', '', value).strip().lower()
    return re.sub(r'[-\s]+', '_', value)

def download_and_filter(youtube_url):
    output_dir = "./public/audio"
    os.makedirs(output_dir, exist_ok=True)

    ydl_opts_meta = {'quiet': True, 'noplaylist': True}
    with yt_dlp.YoutubeDL(ydl_opts_meta) as ydl:
        info = ydl.extract_info(youtube_url, download=False)
        video_title = info.get('title', 'Unknown Track')

    track_key = slugify(video_title)

    easy_path = os.path.join(output_dir, f"{track_key}_easy.mp3")
    medium_path = os.path.join(output_dir, f"{track_key}_medium.mp3")

    ydl_opts = {
        'format': 'bestaudio/best',
        'outtmpl': os.path.join(output_dir, f"{track_key}_easy.%(ext)s"),
        'postprocessors': [{
            'key': 'FFmpegExtractAudio',
            'preferredcodec': 'mp3',
            'preferredquality': '192',
        }],
        'quiet': True,
        'noplaylist': True
    }

    print("Downloading track...")
    with yt_dlp.YoutubeDL(ydl_opts) as ydl:
        ydl.download([youtube_url])

    if not os.path.exists(easy_path):
        raise FileNotFoundError(f"Base easy MP3 file was not found at {easy_path}")

    print("Applying audio lowpass filter...")
    robotic_filter = "vibrato=f=12:d=0.4,aecho=0.8:0.3:10:0.3"
    
    result = subprocess.run([
        "ffmpeg", "-y",
        "-i", easy_path,
        "-af", robotic_filter,
        medium_path
    ], capture_output=True, text=True)

    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg failed: {result.stderr}")

    result_data = {
        "audioKey": track_key,
        "correctAnswer": video_title
    }
    
    with open("download_result.json", "w", encoding="utf-8") as f:
        json.dump(result_data, f)

    print(f"TRACK_KEY:{track_key}")
    print(f"TRACK_TITLE:{video_title}")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: Missing YouTube URL")
        sys.exit(1)
    
    try:
        download_and_filter(sys.argv[1])
    except Exception as e:
        print(f"Error executing script: {e}", file=sys.stderr)
        sys.exit(1)