DROP TABLE IF EXISTS CONFIG;
CREATE TABLE IF NOT EXISTS CONFIG (
  name TEXT NOT NULL,
  chatId INTEGER NOT NULL,
  filterType INTEGER,
  reverse INTEGER,
  limited INTEGER
);

CREATE INDEX IF NOT EXISTS idx_config_name ON CONFIG(name);


DROP TABLE IF EXISTS PANCHAT;
CREATE TABLE IF NOT EXISTS PANCHAT (
  Cindex INTEGER PRIMARY KEY,
  channelId TEXT NOT NULL,
  accessHash TEXT NOT NULL,
  title TEXT NOT NULL,
  current INTEGER,
  exist INTEGER,
  updated DATE
);

CREATE INDEX IF NOT EXISTS idx_panChat_id_accessHash ON PANCHAT(channelId, accessHash);
CREATE INDEX IF NOT EXISTS idx_panChat_index_exist ON PANCHAT(Cindex, exist);
CREATE INDEX IF NOT EXISTS idx_panChat_current_exist ON PANCHAT(current, exist);


DROP TABLE IF EXISTS PANMESSAGE;
CREATE TABLE IF NOT EXISTS PANMESSAGE (
  Mindex INTEGER PRIMARY KEY,
  chatId INTEGER NOT NULL,
  id TEXT NOT NULL,
  txt TEXT NOT NULL,
  webpage TEXT,
  url TEXT,
  status INTEGER
);

CREATE INDEX IF NOT EXISTS idx_panMessage_chatId_id ON PANMESSAGE(chatId, id);




SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;

SELECT name, type, sql FROM sqlite_schema WHERE type IN ('index');

DROP INDEX 索引名称;
