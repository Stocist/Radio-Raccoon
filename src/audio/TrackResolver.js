const playdl = require('play-dl');
const { spawnSync } = require('child_process');
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
      const json = this._ytDlpJson(['-J', '--no-warnings', '--quiet', '--no-playlist', url]);
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
      const json = this._ytDlpJson(['-J', '--no-warnings', '--quiet', url]);
      const entries = Array.isArray(json?.entries) ? json.entries : [];
      const limited = entries.slice(0, 100);
      return limited.map((e) => this._mapYtDlpEntryToTrack(e)).filter(Boolean);
    } catch (e1) {
      // Fallback to play-dl
      try {
        const pl = await playdl.playlist_info(url, { incomplete: true });
        const videos = typeof pl.all_videos === 'function' ? await pl.all_videos() : (pl.videos || []);
        const tracks = videos.map((v) => ({
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
        const limited = tracks.slice(0, 100);
        const results = [];
        for (const t of limited) {
          const name = t.name || t.title;
          const artist = (Array.isArray(t.artists) ? t.artists[0]?.name : t.artist) || '';
          const q = `${name} ${artist}`.trim();
          try {
            const track = await this.searchYouTubeAsTrack(q);
            if (track) results.push(track);
          } catch {}
        }
        return results;
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
      const json = this._ytDlpJson(['-J', '--no-warnings', '--quiet', `ytsearch1:${query}`]);
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
      const json = this._ytDlpJson(['-J', '--no-warnings', '--quiet', `ytsearch1:${query}`]);
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

  _ytDlpJson(args) {
    const cookiesFile = process.env.YTDLP_COOKIES_FILE;
    const base = cookiesFile ? ['--cookies', cookiesFile] : [];
    const run = (extra = []) => spawnSync('yt-dlp', [...base, ...extra, ...args], { encoding: 'utf8' });

    let result = run();
    if (result.status !== 0) {
      // Retry with Android client extractor as a fallback
      result = run(['--extractor-args', 'youtube:player_client=android']);
      if (result.status !== 0) {
        throw new Error(result.stderr?.trim() || 'yt-dlp failed');
      }
    }
    const text = result.stdout?.trim();
    if (!text) throw new Error('yt-dlp produced no output');
    return JSON.parse(text);
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
