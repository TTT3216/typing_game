# app.py (Render PostgreSQL 修正版 - 全文)

import random
from flask import Flask, render_template, request, jsonify, abort
import os # 環境変数を読み込むために必要
from flask.cli import with_appcontext
import click
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
# import pymysql # PostgreSQLを使うので不要

app = Flask(__name__)

# --- SQLAlchemyの設定 (Render PostgreSQL用) ---
# 環境変数 'DATABASE_URL' から接続情報を取得
database_url = os.environ.get('DATABASE_URL')

if not database_url:
    # 環境変数が設定されていない場合のエラー処理またはデフォルト設定
    # Render環境では通常設定されているはず
    raise ValueError("環境変数 'DATABASE_URL' が設定されていません。RenderのEnvironment設定を確認してください。")

# RenderのPostgreSQL接続文字列は 'postgres://' で始まるが、SQLAlchemyは 'postgresql://' を期待するため置換
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)

app.config['SQLALCHEMY_DATABASE_URI'] = database_url
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # 非推奨なのでFalseに

db = SQLAlchemy(app) # SQLAlchemyインスタンスを作成

# --- モデルクラスの定義 ---
# テーブル構造をPythonクラスで定義 (MySQL版から変更なしでOKなはず)
class Word(db.Model):
    __tablename__ = 'words' # テーブル名を指定
    id = db.Column(db.Integer, primary_key=True) # PostgreSQLでは SERIAL 型になる
    display = db.Column(db.String(255), nullable=False)
    hiragana = db.Column(db.String(255), nullable=False)
    length = db.Column(db.Integer, nullable=False)
    theme = db.Column(db.String(50), default='共通')

    def __repr__(self):
        return f'<Word {self.display}>'

class Ranking(db.Model):
    __tablename__ = 'rankings' # テーブル名を指定
    id = db.Column(db.Integer, primary_key=True) # PostgreSQLでは SERIAL 型になる
    username = db.Column(db.String(100), nullable=False)
    score = db.Column(db.Integer, nullable=False)
    speed = db.Column(db.Float, nullable=False)
    theme = db.Column(db.String(50), nullable=False)
    difficulty = db.Column(db.String(10), nullable=False) # easy/normal/hard
    misses = db.Column(db.Integer, nullable=False)
    # PostgreSQLのTIMESTAMP WITH TIME ZONEになることが多い (デフォルトでUTC)
    created_at = db.Column(db.DateTime(timezone=True), server_default=func.now()) # timezone=True を追加推奨

    def __repr__(self):
        return f'<Ranking {self.username} - {self.score}>'

    def to_dict(self):
        return {
            'username': self.username,
            'score': self.score,
            'speed': round(self.speed, 1),
            'misses': self.misses
            # 必要に応じて created_at も追加可能
            # 'created_at': self.created_at.isoformat() if self.created_at else None
        }

# --- データベース初期化関数 (単語ロード) ---
# (MySQL版から変更なしでOKなはず)
def init_db_data():
    """word_lists.txt から単語データを読み込み、データベースに挿入する"""
    WORD_LIST_FILE = 'word_lists.txt'
    word_list_path = os.path.join(app.root_path, WORD_LIST_FILE)

    if not os.path.exists(word_list_path):
        print(f"Warning: {WORD_LIST_FILE} not found. No words inserted.")
        return

    print(f"Loading words from {WORD_LIST_FILE}...")
    try:
        # 既存の単語データをクリア
        num_deleted = db.session.query(Word).delete()
        db.session.commit()
        print(f"Cleared {num_deleted} existing words.")
    except Exception as e:
        db.session.rollback()
        print(f"Error clearing words table: {e}")
        return

    count = 0
    inserted_words = set()
    words_to_add = []

    try:
        with open(word_list_path, 'r', encoding='utf-8') as f:
            for line in f:
                hiragana = line.strip()
                if hiragana and hiragana not in inserted_words:
                    display = hiragana
                    length = len(hiragana)
                    theme = '共通'

                    if len(display) > 255 or len(hiragana) > 255 or len(theme) > 50:
                        print(f"Skipping word due to length limit: {hiragana}")
                        continue

                    new_word = Word(display=display, hiragana=hiragana, length=length, theme=theme)
                    words_to_add.append(new_word)
                    inserted_words.add(hiragana)
                    count += 1

        if words_to_add:
            db.session.bulk_save_objects(words_to_add)
            db.session.commit()
            print(f"Inserted {count} unique words from {WORD_LIST_FILE}.")
        else:
            print("No valid words found in the file to insert.")

    except FileNotFoundError:
        print(f"Error: Could not open {WORD_LIST_FILE}.")
    except Exception as e:
        db.session.rollback()
        print(f"Error processing or committing words: {e}")

# --- Flask コマンドラインインターフェース設定 ---
# (MySQL版から変更なしでOK)
@click.command('init-db')
@with_appcontext
def init_db_command():
    """データベーステーブルを作成し、単語データをロードする"""
    print("Initializing database...")
    try:
        # モデル定義に基づいてテーブルを作成 (存在しない場合のみ)
        # db.drop_all() # 必要に応じて既存テーブルを強制的に削除する場合
        with app.app_context(): # アプリケーションコンテキスト内で実行
            db.create_all()
        print("Database tables created (if they did not exist).")
    except Exception as e:
        print(f"Error creating database tables: {e}")
        return

    # 単語データをロード
    init_db_data()
    print("Finished database initialization process.")

# Flask CLIにコマンドを登録
if not hasattr(app, 'cli'):
    from flask.cli import AppGroup
    app.cli = AppGroup()
app.cli.add_command(init_db_command)

# --- 難易度ごとの文字数範囲 ---
# (変更なし)
DIFFICULTY_LENGTH_RANGES = {
    'easy': (1, 4),
    'normal': (5, 8),
    'hard': (9, 999)
}

# --- ルート定義 ---
# (基本的にMySQL版から変更なしでOK)
@app.route('/')
def index():
    return render_template('index.html')

# --- 単語取得API ---
@app.route('/get_word')
def get_word():
    difficulty = request.args.get('difficulty', 'normal')
    min_len, max_len = DIFFICULTY_LENGTH_RANGES.get(difficulty, DIFFICULTY_LENGTH_RANGES['normal'])

    try:
        query = db.session.query(Word).filter(
            Word.length >= min_len,
            Word.length <= max_len
        )
        word_count = query.count()

        if word_count == 0:
            print(f"No word found for difficulty '{difficulty}'. Falling back to 'normal'.")
            min_len_fb, max_len_fb = DIFFICULTY_LENGTH_RANGES['normal']
            query_fb = db.session.query(Word).filter(Word.length >= min_len_fb, Word.length <= max_len_fb)
            word_count_fb = query_fb.count()
            if word_count_fb == 0:
                 print("Fallback failed. No words found in 'normal' range either.")
                 return jsonify({'error': '適切な単語が見つかりませんでした'}), 404
            random_offset_fb = random.randint(0, word_count_fb - 1)
            word_data = query_fb.offset(random_offset_fb).first()
        else:
            random_offset = random.randint(0, word_count - 1)
            word_data = query.offset(random_offset).first()

        if word_data:
            print(f"Word found: {word_data.display}")
            return jsonify({'display': word_data.display, 'hiragana': word_data.hiragana})
        else:
             print("Word data is None unexpectedly after query.")
             return jsonify({'error': '単語の取得に失敗しました'}), 500

    except Exception as e:
        print(f"Error in /get_word: {e}")
        # エラーログに詳細を出力
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'単語取得中にサーバーエラーが発生しました'}), 500 # エラー詳細はログで確認

# --- スコア送信API ---
@app.route('/submit_score', methods=['POST'])
def submit_score():
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    username = data.get('username')
    score = data.get('score')
    speed = data.get('speed')
    theme = data.get('theme')
    difficulty = data.get('difficulty')
    misses = data.get('misses')

    required_fields = {'username': username, 'score': score, 'speed': speed,
                       'theme': theme, 'difficulty': difficulty, 'misses': misses}
    if any(value is None for value in required_fields.values()):
        missing = [k for k, v in required_fields.items() if v is None]
        return jsonify({"error": f"Missing data: {', '.join(missing)}"}), 400

    errors = []
    if not isinstance(username, str) or not (0 < len(username) <= 100):
        errors.append("username must be a string between 1 and 100 characters")
    if not isinstance(score, int) or score < 0:
        errors.append("score must be a non-negative integer")
    if not isinstance(speed, (int, float)) or speed < 0:
        errors.append("speed must be a non-negative number")
    if not isinstance(theme, str) or not (0 < len(theme) <= 50):
         errors.append("theme must be a string between 1 and 50 characters")
    if not isinstance(difficulty, str) or difficulty not in ['easy', 'normal', 'hard']:
        errors.append("difficulty must be 'easy', 'normal', or 'hard'")
    if not isinstance(misses, int) or misses < 0:
        errors.append("misses must be a non-negative integer")

    if errors:
        return jsonify({"error": "Invalid data types or values", "details": errors}), 400

    try:
        new_ranking = Ranking(
            username=username,
            score=score,
            speed=speed,
            theme=theme,
            difficulty=difficulty,
            misses=misses
        )
        db.session.add(new_ranking)
        db.session.commit()

        print(f"Score submitted: User={username}, Score={score}, Speed={speed:.1f}, Theme={theme}, Difficulty={difficulty}, Misses={misses}")
        return jsonify({"message": "スコアが正常に送信されました"}), 201

    except Exception as e:
        db.session.rollback()
        print(f"Error in /submit_score: {e}")
        # エラーログに詳細を出力
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"スコア保存中にサーバーエラーが発生しました"}), 500 # エラー詳細はログで確認

# --- ランキング取得API ---
@app.route('/get_ranking')
def get_ranking():
    difficulty = request.args.get('difficulty')

    if not difficulty or difficulty not in ['easy', 'normal', 'hard']:
        return jsonify({"error": "Valid difficulty parameter (easy, normal, hard) is required"}), 400

    try:
        rankings = db.session.query(Ranking)\
                                .filter_by(difficulty=difficulty)\
                                .order_by(Ranking.score.desc(), Ranking.speed.desc())\
                                .limit(10)\
                                .all()

        ranking_list = [r.to_dict() for r in rankings]

        print(f"Ranking data fetched for difficulty '{difficulty}': {len(ranking_list)} entries")
        return jsonify(ranking_list)

    except Exception as e:
        print(f"Error in /get_ranking: {e}")
        # エラーログに詳細を出力
        import traceback
        traceback.print_exc()
        return jsonify({"error": f"ランキング取得中にサーバーエラーが発生しました"}), 500 # エラー詳細はログで確認

# --- アプリケーション実行 ---
# (変更なし)
if __name__ == '__main__':
    # Renderではgunicornが起動するため、この部分は通常実行されない
    print("This script is intended to be run with a WSGI server like Gunicorn on Render.")
    print("For local development with auto-reload, use: flask --app app run --debug")
    # ローカルでのデバッグ実行が必要な場合のみ以下のコメントを解除
    # app.run(debug=True, host='0.0.0.0', port=5000) # ポートは適宜変更
    pass
