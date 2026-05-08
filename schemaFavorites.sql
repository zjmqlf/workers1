DROP TABLE IF EXISTS CONFIG;
CREATE TABLE IF NOT EXISTS CONFIG (
  tgId INTEGER NOT NULL,
  name TEXT NOT NULL,
  chatId INTEGER NOT NULL,
  filterType INTEGER,
  reverse INTEGER,
  limited INTEGER
);

CREATE INDEX IF NOT EXISTS idx_config_tgId_name ON CONFIG(tgId, name);


DROP TABLE IF EXISTS FORWARDCHAT;
CREATE TABLE IF NOT EXISTS FORWARDCHAT (
  Cindex INTEGER PRIMARY KEY,
  tgId INTEGER NOT NULL,
  channelId TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  username TEXT,
  title TEXT NOT NULL,
  current INTEGER,
  photo INTEGER,
  video INTEGER,
  document INTEGER,
  gif INTEGER,
  currentForward INTEGER,
  photoForward INTEGER,
  videoForward INTEGER,
  documentForward INTEGER,
  gifForward INTEGER,
  noforwards INTEGER,
  exist INTEGER,
  updated DATE
);

CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_id_accessHash ON FORWARDCHAT(tgId, channelId, accessHash);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_index_noforwards_exist ON FORWARDCHAT(tgId, Cindex, noforwards, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_current_exist ON FORWARDCHAT(tgId, current, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_photo_exist ON FORWARDCHAT(tgId, photo, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_video_exist ON FORWARDCHAT(tgId, video, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_document_exist ON FORWARDCHAT(tgId, document, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_gif_exist ON FORWARDCHAT(tgId, gif, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_currentForward_exist ON FORWARDCHAT(tgId, currentForward, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_photoForward_exist ON FORWARDCHAT(tgId, photoForward, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_videoForward_exist ON FORWARDCHAT(tgId, videoForward, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_documentForward_exist ON FORWARDCHAT(tgId, documentForward, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_tgId_gifForward_exist ON FORWARDCHAT(tgId, gifForward, exist);


DROP TABLE IF EXISTS MESSAGE;
CREATE TABLE IF NOT EXISTS MESSAGE (
  Mindex INTEGER PRIMARY KEY,
  userId INTEGER NOT NULL,
  id INTEGER NOT NULL,
  category INTEGER NOT NULL,
  sizeType TEXT NOT NULL,
  mid INTEGER,
  accessId TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  txt TEXT
);

CREATE INDEX IF NOT EXISTS idx_message_mid ON MESSAGE(mid);
CREATE INDEX IF NOT EXISTS idx_message_userId_id ON MESSAGE(userId, id);
CREATE INDEX IF NOT EXISTS idx_message_userId_mid ON MESSAGE(userId, mid);
CREATE INDEX IF NOT EXISTS idx_message_userId_mindex ON MESSAGE(userId, Mindex);
CREATE INDEX IF NOT EXISTS idx_message_userId_id_sizeType ON MESSAGE(userId, id, sizeType);
CREATE INDEX IF NOT EXISTS idx_message_accessId_accessHash ON MESSAGE(accessId, accessHash);


DROP TABLE IF EXISTS MEDIA;
CREATE TABLE IF NOT EXISTS MEDIA (
  Vindex INTEGER PRIMARY KEY,
  id TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  dcId TEXT NOT NULL,
  fileName TEXT,
  mimeType TEXT NOT NULL,
  size INTEGER NOT NULL,
  duration INTEGER,
  width INTEGER,
  height INTEGER
);

CREATE INDEX IF NOT EXISTS idx_media_id_accessHash ON MEDIA(id, accessHash);


DROP TABLE IF EXISTS MEDIAINDEX;
CREATE TABLE IF NOT EXISTS MEDIAINDEX (
  Vindex INTEGER NOT NULL,
  id TEXT NOT NULL,
  accessHash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_mediaIndex_id_accessHash ON MEDIAINDEX(id, accessHash);


DROP TABLE IF EXISTS PHOTO;
CREATE TABLE IF NOT EXISTS PHOTO (
  Pindex INTEGER PRIMARY KEY,
  id TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  dcId TEXT NOT NULL,
  sizeType TEXT NOT NULL,
  size INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_id_accessHash_sizeType ON PHOTO(id, accessHash, sizeType);


DROP TABLE IF EXISTS PHOTOINDEX;
CREATE TABLE IF NOT EXISTS PHOTOINDEX (
  Pindex INTEGER NOT NULL,
  id TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  sizeType TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photoIndex_id_accessHash_sizeType ON PHOTOINDEX(id, accessHash, sizeType);




SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;

SELECT name, type, sql FROM sqlite_schema WHERE type IN ('index');

DROP INDEX 索引名称;
