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
