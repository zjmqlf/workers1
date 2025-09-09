DROP TABLE IF EXISTS CONFIG;
CREATE TABLE IF NOT EXISTS CONFIG (
  name TEXT NOT NULL,
  chatId INTEGER NOT NULL,
  filterType INTEGER,
  reverse INTEGER,
  limited INTEGER
);

CREATE INDEX IF NOT EXISTS idx_config_name ON CONFIG(name);


DROP TABLE IF EXISTS CACHE;
CREATE TABLE IF NOT EXISTS CACHE (
  Cindex INTEGER PRIMARY KEY,
  chatId INTEGER NOT NULL,
  id TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_cache_id_accessHash ON CACHE(id, accessHash);


DROP TABLE IF EXISTS CHAT;
CREATE TABLE IF NOT EXISTS CHAT (
  Cindex INTEGER PRIMARY KEY,
  channelId TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  title TEXT NOT NULL,
  current INTEGER,
  photo INTEGER,
  video INTEGER,
  document INTEGER,
  gif INTEGER,
  exist INTEGER,
  updated DATE
);

CREATE INDEX IF NOT EXISTS idx_chat_id_accessHash ON CHAT(channelId, accessHash);
CREATE INDEX IF NOT EXISTS idx_chat_index_exist ON CHAT(Cindex, exist);
CREATE INDEX IF NOT EXISTS idx_chat_current_exist ON CHAT(current, exist);
CREATE INDEX IF NOT EXISTS idx_chat_photo_exist ON CHAT(photo, exist);
CREATE INDEX IF NOT EXISTS idx_chat_video_exist ON CHAT(video, exist);
CREATE INDEX IF NOT EXISTS idx_chat_document_exist ON CHAT(document, exist);
CREATE INDEX IF NOT EXISTS idx_chat_gif_exist ON CHAT(gif, exist);


DROP TABLE IF EXISTS MESSAGE;
CREATE TABLE IF NOT EXISTS MESSAGE (
  Mindex INTEGER PRIMARY KEY,
  id TEXT NOT NULL,
  dbIndex INTEGER NOT NULL,
  category INTEGER NOT NULL,
  txt TEXT,
  ids TEXT,
  status INTEGER
);

CREATE INDEX IF NOT EXISTS idx_message_id ON MESSAGE(id);
CREATE INDEX IF NOT EXISTS idx_message_category ON MESSAGE(category);
CREATE INDEX IF NOT EXISTS idx_message_status ON MESSAGE(status);


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
  height INTEGER,
  hash TEXT NOT NULL
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
  size INTEGER NOT NULL,
  hash TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_photo_id_accessHash_sizeType ON PHOTO(id, accessHash, sizeType);


DROP TABLE IF EXISTS PHOTOINDEX;
CREATE TABLE IF NOT EXISTS PHOTOINDEX (
  Pindex INTEGER NOT NULL,
  id TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  sizeType TEXT NOT NULL,
);

CREATE INDEX IF NOT EXISTS idx_photoIndex_id_accessHash_sizeType ON PHOTOINDEX(id, accessHash, sizeType);




SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;

SELECT name, type, sql FROM sqlite_schema WHERE type IN ('index');

DROP INDEX 索引名称;
