
DROP TABLE IF EXISTS CODE;
CREATE TABLE IF NOT EXISTS CODE (
  Cindex INTEGER PRIMARY KEY,
  chatId INTEGER NOT NULL,
  code TEXT NOT NULL,
  txt TEXT,
  counts INTEGER,
  status INTEGER
);

CREATE INDEX IF NOT EXISTS idx_code_chatId_code ON CODE(chatId, code);
CREATE INDEX IF NOT EXISTS idx_code_chatId_cindex ON CODE(chatId, Cindex);




SELECT name FROM sqlite_schema WHERE type='table' ORDER BY name;

SELECT name, type, sql FROM sqlite_schema WHERE type IN ('index');

DROP INDEX 索引名称;
