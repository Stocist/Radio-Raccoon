const playdl = require('play-dl');
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
    } catch (error) {
      console.error('Failed to resolve YouTube track:', error.message);
      throw error;
    }
  }

  async resolveYouTubePlaylist(url) {
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
    } catch (error) {
      console.error('Failed to resolve YouTube playlist:', error.message);
      throw error;
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
    try {
      const res = await playdl.search(query, { limit: 1, source: { youtube: 'video' } });
      if (!res || res.length === 0) throw new Error('No results found');
      const candidate = res[0];
      const url = candidate?.url || (candidate?.id ? `https://www.youtube.com/watch?v=${candidate.id}` : undefined);
      if (!url) throw new Error('Search result missing URL');
      return await this.resolveYouTube(url);
    } catch (error) {
      console.error('Failed to search YouTube:', error.message);
      throw error;
    }
  }

  async searchYouTubeAsTrack(query) {
    const res = await playdl.search(query, { limit: 1, source: { youtube: 'video' } });
    if (!res || res.length === 0) throw new Error('No results found');
    const url = res[0].url || (res[0].id ? `https://www.youtube.com/watch?v=${res[0].id}` : undefined);
    if (!url) throw new Error('Search result missing URL');
    return await this.resolveYouTube(url);
  }
}

module.exports = TrackResolver;
