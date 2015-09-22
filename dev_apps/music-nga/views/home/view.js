/* global bridge, View */
'use strict';

var debug = 1 ? (...args) => console.log('[HomeView]', ...args) : () => {};

var HomeView = View.extend(function HomeView() {
  View.call(this); // super();

  this.searchBox = document.getElementById('search');
  this.tiles = document.getElementById('tiles');

  this.searchBox.addEventListener('search', (evt) => this.search(evt.detail));
  this.searchBox.addEventListener('open', () => window.parent.onSearchOpen());
  this.searchBox.addEventListener('close', () => window.parent.onSearchClose());
  this.searchBox.addEventListener('resultclick', (evt) => {
    var link = evt.detail;
    if (link) {
      if (link.dataset.section === 'songs') {
        this.queueSong(link.dataset.filePath);
      }

      this.client.method('navigate', link.getAttribute('href'));
    }
  });

  this.tiles.addEventListener('click', (evt) => {
    var link = evt.target.closest('a[data-file-path]');
    if (link) {
      this.queueAlbum(link.dataset.filePath);
    }
  });

  this.client.on('databaseChange', () => this.update());

  this.update();
});

HomeView.prototype.update = function() {
  this.getAlbums().then((albums) => {
    this.albums = albums;
    this.render();
  });
};

HomeView.prototype.destroy = function() {
  this.client.destroy();

  View.prototype.destroy.call(this); // super(); // Always call *last*
};

HomeView.prototype.render = function() {
  View.prototype.render.call(this); // super();

  Promise.all([
    document.l10n.formatValue('unknownArtist'),
    document.l10n.formatValue('unknownAlbum')
  ]).then(([unknownArtist, unknownAlbum]) => {
    var html = '';

    this.albums.forEach((album) => {
      var template =
`<a class="tile"
    href="/player?id=${album.name}"
    data-artist="${album.metadata.artist || unknownArtist}"
    data-album="${album.metadata.album || unknownAlbum}"
    data-file-path="${album.name}">
  <img>
</a>`;

      html += template;
    });

    this.tiles.innerHTML = html;

    [].forEach.call(this.tiles.querySelectorAll('.tile'), (tile) => {
      this.getSongThumbnail(tile.dataset.filePath)
        .then(blob => tile.querySelector('img').src = URL.createObjectURL(blob));
    });
  });
};

HomeView.prototype.getAlbums = function() {
  return this.fetch('/api/albums/list').then(response => response.json());
};

HomeView.prototype.getSongThumbnail = function(filePath) {
  return this.fetch('/api/artwork/thumbnail/' + filePath).then(response => response.blob());
};

HomeView.prototype.queueAlbum = function(filePath) {
  this.fetch('/api/queue/album/' + filePath);
};

HomeView.prototype.queueSong = function(filePath) {
  this.fetch('/api/queue/song/' + filePath);
};

HomeView.prototype.search = function(query) {
  var results = [];

  return Promise.all([
    document.l10n.formatValue('unknownTitle'),
    document.l10n.formatValue('unknownArtist'),
    document.l10n.formatValue('unknownAlbum')
  ]).then(([unknownTitle, unknownArtist, unknownAlbum]) => {
    var albumResults = this.fetch('/api/search/album/' + query)
      .then(response => response.json())
      .then((albums) => {
        var albumResults = albums.map((album) => {
          return {
            name:     album.name,
            title:    album.metadata.album  || unknownAlbum,
            subtitle: album.metadata.artist || unknownArtist,
            section:  'albums',
            url:      '/album-detail?id=' + album.name
          };
        });

        results = results.concat(albumResults);

        this.searchBox.setResults(results);
        return albumResults;
      });

    var artistResults = this.fetch('/api/search/artist/' + query)
      .then(response => response.json())
      .then((artists) => {
        var artistResults = artists.map((artist) => {
          return {
            name:     artist.name,
            title:    artist.metadata.artist || unknownArtist,
            subtitle: '',
            section:  'artists',
            url:      '/artist-detail?id=' + artist.name
          };
        });

        results = results.concat(artistResults);

        this.searchBox.setResults(results);
        return artistResults;
      });

    var songResults = this.fetch('/api/search/title/' + query)
      .then(response => response.json())
      .then((songs) => {
        var songResults = songs.map((song) => {
          return {
            name:     song.name,
            title:    song.metadata.title  || unknownTitle,
            subtitle: song.metadata.artist || unknownArtist,
            section:  'songs',
            url:      '/player?id=' + song.name
          };
        });

        results = results.concat(songResults);

        this.searchBox.setResults(results);
        return songResults;
      });

    return Promise.all([albumResults, artistResults, songResults]).then(() => results);
  });
};

window.view = new HomeView();
