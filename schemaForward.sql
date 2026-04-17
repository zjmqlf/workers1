DROP TABLE IF EXISTS CONFIG;
CREATE TABLE IF NOT EXISTS CONFIG (
  name TEXT NOT NULL,
  chatId INTEGER NOT NULL,
  filterType INTEGER,
  reverse INTEGER,
  limited INTEGER
);

CREATE INDEX IF NOT EXISTS idx_config_name ON CONFIG(name);


DROP TABLE IF EXISTS FORWARDCHAT;
CREATE TABLE IF NOT EXISTS FORWARDCHAT (
  Cindex INTEGER PRIMARY KEY,
  channelId TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  username TEXT,
  title TEXT NOT NULL,
  current INTEGER,
  photo INTEGER,
  video INTEGER,
  document INTEGER,
  gif INTEGER,
  noforwards INTEGER,
  exist INTEGER,
  updated DATE
);

CREATE INDEX IF NOT EXISTS idx_forwardChat_id_accessHash ON FORWARDCHAT(channelId, accessHash);
CREATE INDEX IF NOT EXISTS idx_forwardChat_index_noforwards_exist ON FORWARDCHAT(Cindex, noforwards, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_current_exist ON FORWARDCHAT(current, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_photo_exist ON FORWARDCHAT(photo, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_video_exist ON FORWARDCHAT(video, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_document_exist ON FORWARDCHAT(document, exist);
CREATE INDEX IF NOT EXISTS idx_forwardChat_gif_exist ON FORWARDCHAT(gif, exist);


DROP TABLE IF EXISTS FORWARDMESSAGE;
CREATE TABLE IF NOT EXISTS FORWARDMESSAGE (
  Mindex INTEGER PRIMARY KEY,
  chatId INTEGER NOT NULL,
  id TEXT NOT NULL,
  txt TEXT NOT NULL,
  status INTEGER
);

CREATE INDEX IF NOT EXISTS idx_forwardMessage_chatId_id ON FORWARDMESSAGE(chatId, id);
CREATE INDEX IF NOT EXISTS idx_forwardMessage_chatId_mindex ON FORWARDMESSAGE(chatId, Mindex);




SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;

SELECT name, type, sql FROM sqlite_schema WHERE type IN ('index');

DROP INDEX 索引名称;
