const playdl = require('play-dl');
const { spawn } = require('child_process');
let spotifyInfo;
try {
  // Use global fetch (Node >=18). Fallback will be handled by package if needed.
  spotifyInfo = require('spotify-url-info')(typeof fetch !== 'undefined' ? fetch : undefined);
} catch {
  spotifyInfo = null;
}

class TrackResolver {
  constructor() {
    // No explicit API initialization required for ytdl-core/ytsr.
  }

  async resolve(query) {
    if (this.isSpotifyUrl(query)) {
      return await this.resolveSpotify(query);
    }
    if (this.isYouTubePlaylistUrl(query)) {
      return await this.resolveYouTubePlaylist(query);
    }
    if (this.isYouTubeUrl(query)) {
      return await this.resolveYouTube(query);
    }
    return await this.searchYouTube(query);
  }

  isYouTubeUrl(url) {
    return /(?:youtube\.com|youtu\.be)/.test(url);
  }

  isYouTubePlaylistUrl(url) {
    try {
      const u = new URL(url);
      return this.isYouTubeUrl(url) && (u.searchParams.has('list') || /\/playlist/.test(u.pathname));
    } catch {
      return false;
    }
  }

  isSpotifyUrl(url) {
    return /open\.spotify\.com\//.test(url);
  }

  async resolveYouTube(url) {
    // yt-dlp first (most reliable)
    try {
      const json = await this._ytDlpJsonAsync(['-J', '--no-warnings', '--quiet', '--no-playlist', url]);
      return this._mapYtDlpEntryToTrack(json);
    } catch (e1) {
      // Fallback to play-dl
      try {
        const video = await playdl.video_info(url);
        const details = video?.video_details;
        return {
          id: details?.id,
          title: details?.title,
          artist: details?.channel?.name,
          duration: Math.floor(details?.durationInSec || 0),
          url: details?.url || url,
          thumbnail: details?.thumbnails?.[0]?.url,
          source: 'youtube'
        };
      } catch (e2) {
        console.error('Failed to resolve YouTube track via yt-dlp:', e1?.message || e1);
        console.error('Failed to resolve YouTube track via play-dl:', e2?.message || e2);
        throw e2;
      }
    }
  }

  async resolveYouTubePlaylist(url) {
    // yt-dlp first
    try {
      const json = await this._ytDlpJsonAsync(['-J', '--no-warnings', '--quiet', url]);
      const entries = Array.isArray(json?.entries) ? json.entries : [];
      const limit = Number.parseInt(process.env.PLAYLIST_MAX || '100', 10);
      const limited = entries.slice(0, limit);
      return limited.map((e) => this._mapYtDlpEntryToTrack(e)).filter(Boolean);
    } catch (e1) {
      // Fallback to play-dl
      try {
        const pl = await playdl.playlist_info(url, { incomplete: true });
        const videos = typeof pl.all_videos === 'function' ? await pl.all_videos() : (pl.videos || []);
        const limit = Number.parseInt(process.env.PLAYLIST_MAX || '100', 10);
        const tracks = videos.slice(0, limit).map((v) => ({
          id: v.id,
          title: v.title,
          artist: v.channel?.name,
          duration: Math.floor(v.durationInSec || 0),
          url: v.url,
          thumbnail: v.thumbnails?.[0]?.url,
          source: 'youtube'
        }));
        return tracks;
      } catch (e2) {
        console.error('Failed to resolve YT playlist via yt-dlp:', e1?.message || e1);
        console.error('Failed to resolve YT playlist via play-dl:', e2?.message || e2);
        throw e2;
      }
    }
  }

  async resolveSpotify(url) {
    if (!spotifyInfo) {
      throw new Error('Spotify resolving is not available (dependency not loaded)');
    }
    const { getData, getTracks } = spotifyInfo;
    try {
      const data = await getData(url);
      if (data?.type === 'track') {
        const name = data.name || data.title;
        const artist = (Array.isArray(data.artists) ? data.artists[0]?.name : data.artist) || '';
        const q = `${name} ${artist}`.trim();
        return await this.searchYouTubeAsTrack(q);
      }
      if (data?.type === 'album' || data?.type === 'playlist') {
        const tracks = await getTracks(url);
        const limit = Number.parseInt(process.env.PLAYLIST_MAX || '100', 10);
        const concurrency = Math.max(1, Number.parseInt(process.env.SPOTIFY_CONCURRENCY || '4', 10));
        const limited = tracks.slice(0, limit);
        const mapper = async (t) => {
          const name = t.name || t.title;
          const artist = (Array.isArray(t.artists) ? t.artists[0]?.name : t.artist) || '';
          const q = `${name} ${artist}`.trim();
          try {
            return await this.searchYouTubeAsTrack(q);
          } catch {
            return null;
          }
        };
        const mapped = await this._mapWithConcurrency(limited, concurrency, mapper);
        return mapped.filter(Boolean);
      }
      throw new Error('Unsupported Spotify URL');
    } catch (error) {
      console.error('Failed to resolve Spotify:', error.message);
      throw error;
    }
  }

  async searchYouTube(query) {
    // yt-dlp first
    try {
      const json = await this._ytDlpJsonAsync(['-J', '--no-warnings', '--quiet', `ytsearch1:${query}`]);
      const entry = Array.isArray(json?.entries) ? json.entries[0] : json;
      if (!entry) throw new Error('No results found');
      const track = this._mapYtDlpEntryToTrack(entry);
      if (!track?.url) throw new Error('Search result missing URL');
      return track;
    } catch (e1) {
      // Fallback to play-dl
      try {
        const res = await playdl.search(query, { limit: 1, source: { youtube: 'video' } });
        if (!res || res.length === 0) throw new Error('No results found');
        const candidate = res[0];
        const url = candidate?.url || (candidate?.id ? `https://www.youtube.com/watch?v=${candidate.id}` : undefined);
        if (!url) throw new Error('Search result missing URL');
        return await this.resolveYouTube(url);
      } catch (e2) {
        console.error('Failed to search YouTube via yt-dlp:', e1?.message || e1);
        console.error('Failed to search YouTube via play-dl:', e2?.message || e2);
        throw e2;
      }
    }
  }

  async searchYouTubeAsTrack(query) {
    // yt-dlp first
    try {
      const json = await this._ytDlpJsonAsync(['-J', '--no-warnings', '--quiet', `ytsearch1:${query}`]);
      const entry = Array.isArray(json?.entries) ? json.entries[0] : json;
      if (!entry) throw new Error('No results found');
      return this._mapYtDlpEntryToTrack(entry);
    } catch (e1) {
      try {
        const res = await playdl.search(query, { limit: 1, source: { youtube: 'video' } });
        if (!res || res.length === 0) throw new Error('No results found');
        const url = res[0].url || (res[0].id ? `https://www.youtube.com/watch?v=${res[0].id}` : undefined);
        if (!url) throw new Error('Search result missing URL');
        return await this.resolveYouTube(url);
      } catch (e2) {
        console.error('Failed to search track via yt-dlp:', e1?.message || e1);
        console.error('Failed to search track via play-dl:', e2?.message || e2);
        throw e2;
      }
    }
  }

  _ytDlpJsonAsync(args, { timeoutMs } = {}) {
    const cookiesFile = process.env.YTDLP_COOKIES_FILE;
    const base = cookiesFile ? ['--cookies', cookiesFile] : [];
    const effectiveTimeout = Number.parseInt(timeoutMs || process.env.YTDLP_TIMEOUT_MS || '15000', 10);

    const runOnce = (extra = []) => new Promise((resolve, reject) => {
      const child = spawn('yt-dlp', [...base, ...extra, ...args]);
      let stdout = '';
      let stderr = '';
      let finished = false;
      const onFinish = (err, result) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        if (err) return reject(err);
        resolve(result);
      };
      const timer = setTimeout(() => {
        try { child.kill('SIGKILL'); } catch {}
        onFinish(new Error('yt-dlp timed out'));
      }, effectiveTimeout);
      child.stdout.setEncoding('utf8');
      child.stdout.on('data', (d) => { stdout += d; });
      child.stderr.setEncoding('utf8');
      child.stderr.on('data', (d) => { stderr += d; });
      child.on('error', (e) => onFinish(e));
      child.on('close', (code) => {
        if (code !== 0) {
          return onFinish(new Error(stderr.trim() || `yt-dlp exited with code ${code}`));
        }
        const text = (stdout || '').trim();
        if (!text) return onFinish(new Error('yt-dlp produced no output'));
        try {
          const json = JSON.parse(text);
          onFinish(null, json);
        } catch (e) {
          onFinish(new Error('Failed to parse yt-dlp JSON'));
        }
      });
    });

    // Try normal run, then fallback to Android extractor client
    return runOnce().catch(() => runOnce(['--extractor-args', 'youtube:player_client=android']));
  }

  async _mapWithConcurrency(items, concurrency, mapper) {
    if (!Array.isArray(items) || items.length === 0) return [];
    const results = new Array(items.length);
    let nextIndex = 0;

    const worker = async () => {
      while (true) {
        const currentIndex = nextIndex;
        if (currentIndex >= items.length) return;
        nextIndex += 1;
        try {
          results[currentIndex] = await mapper(items[currentIndex], currentIndex);
        } catch (e) {
          results[currentIndex] = null;
        }
      }
    };

    const workers = new Array(Math.min(concurrency, items.length)).fill(0).map(() => worker());
    await Promise.all(workers);
    return results;
  }

  _mapYtDlpEntryToTrack(entry) {
    if (!entry) return null;
    const id = entry.id;
    const title = entry.title;
    const artist = entry.uploader || entry.channel || '';
    const duration = Math.floor(entry.duration || 0);
    const url = entry.webpage_url || (id ? `https://www.youtube.com/watch?v=${id}` : undefined);
    const thumbnail = Array.isArray(entry.thumbnails) && entry.thumbnails.length > 0
      ? entry.thumbnails[0].url || entry.thumbnails[0]
      : entry.thumbnail || null;
    return { id, title, artist, duration, url, thumbnail, source: 'youtube' };
  }
}

module.exports = TrackResolver;
