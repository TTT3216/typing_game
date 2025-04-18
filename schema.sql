-- schema.sql (修正後)

-- 既存のテーブルがあれば削除 (開発時に便利)
DROP TABLE IF EXISTS words;
DROP TABLE IF EXISTS rankings; -- テーブル名を 'rankings' に統一

-- 単語を格納するテーブル
CREATE TABLE words (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    display TEXT NOT NULL,     -- 表示用文字列
    hiragana TEXT NOT NULL,    -- ひらがな (読み)
    length INTEGER NOT NULL,   -- ひらがなの文字数 ★難易度判定用★
    theme TEXT DEFAULT '共通' -- テーマ (デフォルトは '共通')
);

-- ランキングを格納するテーブル
CREATE TABLE rankings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT NOT NULL,
    score INTEGER NOT NULL,
    speed REAL NOT NULL,       -- REAL は浮動小数点数 (float)
    theme TEXT NOT NULL,       -- どのテーマでの記録か
    difficulty TEXT NOT NULL, -- ★ 追加: プレイした難易度 (easy, normal, hard)
    misses INTEGER NOT NULL, -- ★ 追加: ミスタイプ数
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP -- 記録日時
);

-- ここには INSERT 文は含めない
