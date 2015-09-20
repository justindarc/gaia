/* global bridge, navigateToURL */
'use strict';

var service = bridge.service('camera-service')
  .method('share', share)

  .listen()
  .listen(new BroadcastChannel('camera-service'));

function share(filePath) {
  return getSong(filePath).then((song) => {
    if (!window.MozActivity) {
      return;
    }

    return Promise.all([
        getSongFile(filePath),
        getSongThumbnail(filePath)
      ]).then(([file, thumbnail]) => {
        var path = song.name;
        var filename = path.substring(path.lastIndexOf('/') + 1);

        return new window.MozActivity({
          name: 'share',
          data: {
            type: type,
            number: 1,
            blobs: [file],
            filenames: [filename],
            filepaths: [path]
          }
        });
      });
  });
}
