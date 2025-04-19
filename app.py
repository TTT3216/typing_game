# app.py (MySQL + SQLAlchemy 修正版 - 全文 + 累計利用者数)

import random
from flask import Flask, render_template, request, jsonify, abort
import os
from flask.cli import with_appcontext
import click
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.sql import func
from sqlalchemy import distinct # ★★★ distinct をインポート ★★★
#import pymysql # PyMySQLを使う場合は必要 (mysqlclientを使う場合は不要)

app = Flask(__name__)

database_url = os.environ.get('DATABASE_URL')
# --- ここまで ---

if not database_url:
    # 環境変数が設定されていない場合のエラー処理またはデフォルト設定
    # ローカル実行時は環境変数を設定する必要がある
    raise ValueError("環境変数 'DATABASE_URL' が設定されていません。実行前に設定してください。")

# RenderのPostgreSQL接続文字列は 'postgres://' で始まるが、SQLAlchemyは 'postgresql://' を期待するため置換
if database_url.startswith("postgres://"):
    database_url = database_url.replace("postgres://", "postgresql://", 1)


app.config['SQLALCHEMY_DATABASE_URI'] = database_url # ← 環境変数から読み込んだURLを設定
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False # 非推奨なのでFalseに
db = SQLAlchemy(app) # SQLAlchemyインスタンスを作成

# --- モデルクラスの定義 ---
# テーブル構造をPythonクラスで定義
class Word(db.Model):
    __tablename__ = 'words' # テーブル名を指定
    id = db.Column(db.Integer, primary_key=True)
    display = db.Column(db.String(255), nullable=False) # 表示用文字列 (長さを指定)
    hiragana = db.Column(db.String(255), nullable=False) # ひらがな (長さを指定)
    length = db.Column(db.Integer, nullable=False)      # ひらがなの文字数
    theme = db.Column(db.String(50), default='共通')     # テーマ (長さを指定)

    def __repr__(self):
        # デバッグ時に分かりやすい表現を返す
        return f'<Word {self.display}>'

class Ranking(db.Model):
    __tablename__ = 'rankings' # テーブル名を指定
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), nullable=False) # ユーザー名 (長さを指定)
    score = db.Column(db.Integer, nullable=False)      # スコア
    speed = db.Column(db.Float, nullable=False)        # 速度 (Float型)
    theme = db.Column(db.String(50), nullable=False)     # テーマ (長さを指定)
    difficulty = db.Column(db.String(10), nullable=False) # 難易度 (easy/normal/hard, 長さを指定)
    misses = db.Column(db.Integer, nullable=False)      # ミス数
    created_at = db.Column(db.DateTime, server_default=func.now()) # 記録日時 (MySQLのTIMESTAMPはタイムゾーン扱いに注意)

    def __repr__(self):
        # デバッグ時に分かりやすい表現を返す
        return f'<Ranking {self.username} - {self.score}>'

    def to_dict(self):
        # ランキング表示用にデータを辞書形式に変換するメソッド
        return {
            'username': self.username,
            'score': self.score,
            'speed': round(self.speed, 1), # 速度を小数点以下1桁に丸める
            'misses': self.misses
            # 必要に応じて他のカラムも追加可能
        }

# --- データベース初期化関数 (単語ロード) ---
def init_db_data():
    """word_lists.txt から単語データを読み込み、データベースに挿入する"""
    WORD_LIST_FILE = 'word_lists.txt' # 単語リストファイル名
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
    inserted_words = set() # 重複チェック用
    words_to_add = []      # 一括追加用のリスト

    try:
        with open(word_list_path, 'r', encoding='utf-8') as f:
            for line in f:
                hiragana = line.strip()
                if hiragana and hiragana not in inserted_words:
                    display = hiragana # display も hiragana と同じにする
                    length = len(hiragana)
                    theme = '共通' # デフォルトテーマ

                    # モデルで定義したStringの長さを超えないかチェック (任意だが推奨)
                    if len(display) > 255 or len(hiragana) > 255 or len(theme) > 50:
                        print(f"Skipping word due to length limit: {hiragana}")
                        continue

                    # Wordオブジェクトを作成してリストに追加
                    new_word = Word(display=display, hiragana=hiragana, length=length, theme=theme)
                    words_to_add.append(new_word)
                    inserted_words.add(hiragana)
                    count += 1

        # リストに溜めたオブジェクトを一括でセッションに追加 (効率が良い)
        if words_to_add:
            print(f"Adding {len(words_to_add)} words to session...")
            db.session.bulk_save_objects(words_to_add)
            print("Committing word data...")
            db.session.commit() # コミットしてデータベースに保存
            print(f"Inserted {count} unique words from {WORD_LIST_FILE}.")
        else:
            print("No valid words found in the file to insert.")

    except FileNotFoundError:
        # openでエラーになることは通常ないはずだが念のため
        print(f"Error: Could not open {WORD_LIST_FILE}.")
    except Exception as e:
        db.session.rollback() # エラー発生時はロールバック
        print(f"!!!!!!!!!! Error processing or committing words: {e} !!!!!!!!!!!")
        import traceback
        traceback.print_exc() # 詳細なエラーを表示

# --- Flask コマンドラインインターフェース設定 ---
@click.command('init-db')
@with_appcontext
def init_db_command():
    """データベーステーブルを強制的に再作成し、単語データをロードする"""
    print("Initializing database (forcing recreation)...")
    try:
        print("Dropping existing tables (if any)...")
        db.drop_all() # ★★★ 既存テーブルを強制的に削除 ★★★
        print("Existing tables dropped.")

        print("Creating new tables based on models...")
        db.create_all() # ★★★ モデルに基づいてテーブルを作成 ★★★
        print("New tables created.")

        # ★★★ コミットを追加してみる (通常不要だが念のため) ★★★
        print("Committing table creation...")
        db.session.commit()
        print("Table creation committed.")

    except Exception as e:
        db.session.rollback() # エラー時はロールバック
        print(f"!!!!!!!!!! Error during table creation: {e} !!!!!!!!!!!")
        import traceback
        traceback.print_exc() # 詳細なエラーを表示
        return # テーブル作成に失敗したらここで終了

    # 単語データをロード
    print("Loading word data...")
    init_db_data() # この関数内でエラーがあれば表示されるはず
    print("Finished database initialization process.")

# Flask CLIにコマンドを登録
if not hasattr(app, 'cli'):
    from flask.cli import AppGroup
    app.cli = AppGroup()
app.cli.add_command(init_db_command)

# --- 難易度ごとの文字数範囲 ---
DIFFICULTY_LENGTH_RANGES = {
    'easy': (1, 4),
    'normal': (5, 8),
    'hard': (9, 999) # 9文字以上
}

# --- ルート定義 ---
@app.route('/')
def index():
    """メインのゲーム画面をレンダリングする"""
    return render_template('index.html')

# --- 単語取得API ---
@app.route('/get_word')
def get_word():
    """指定された難易度に基づいてランダムな単語を取得する"""
    difficulty = request.args.get('difficulty', 'normal')
    # theme = request.args.get('theme', '共通') # テーマ機能は現在未使用

    # 難易度に応じた文字数範囲を取得
    min_len, max_len = DIFFICULTY_LENGTH_RANGES.get(difficulty, DIFFICULTY_LENGTH_RANGES['normal'])

    try:
        # SQLAlchemyで条件に合う単語をクエリ
        query = db.session.query(Word).filter(
            Word.length >= min_len,
            Word.length <= max_len
        )
        # テーマによるフィルタリングが必要な場合はここに追加
        # if theme != '共通':
        #     query = query.filter(Word.theme == theme)

        # ランダムに1件取得 (OFFSETは大量データで遅くなる可能性あり)
        word_count = query.count()
        if word_count == 0:
            # 条件に合う単語がない場合、フォールバックして normal 難易度で探す
            print(f"No word found for difficulty '{difficulty}'. Falling back to 'normal'.")
            min_len_fb, max_len_fb = DIFFICULTY_LENGTH_RANGES['normal']
            query_fb = db.session.query(Word).filter(Word.length >= min_len_fb, Word.length <= max_len_fb)
            word_count_fb = query_fb.count()
            if word_count_fb == 0:
                 # フォールバックでも見つからない場合
                 print("Fallback failed. No words found in 'normal' range either.")
                 return jsonify({'error': '適切な単語が見つかりませんでした'}), 404
            # フォールバックでランダム取得
            random_offset_fb = random.randint(0, word_count_fb - 1)
            word_data = query_fb.offset(random_offset_fb).first()
        else:
            # 通常のランダム取得
            random_offset = random.randint(0, word_count - 1)
            word_data = query.offset(random_offset).first()

        if word_data:
            # 単語が見つかった場合、JSONで返す
            print(f"Word found: {word_data.display}")
            return jsonify({'display': word_data.display, 'hiragana': word_data.hiragana})
        else:
             # 予期せぬエラー (通常ここには来ないはず)
             print("Word data is None unexpectedly after query.")
             return jsonify({'error': '単語の取得に失敗しました'}), 500

    except Exception as e:
        # データベースエラーなど、予期せぬエラーが発生した場合
        print(f"Error in /get_word: {e}")
        # エラー情報をログに出力し、クライアントには汎用的なエラーメッセージを返す
        return jsonify({'error': f'単語取得中にサーバーエラーが発生しました: {e}'}), 500
    finally:
        # SQLAlchemy + Flask では通常リクエストごとにセッションが管理されるため、
        # ここで明示的にセッションを閉じる必要はないことが多い
        # db.session.remove() # 必要に応じて追加
        pass

# --- スコア送信API ---
@app.route('/submit_score', methods=['POST'])
def submit_score():
    """クライアントから送信されたスコアをデータベースに保存する"""
    if not request.is_json:
        return jsonify({"error": "Request must be JSON"}), 400

    data = request.get_json()
    username = data.get('username')
    score = data.get('score')
    speed = data.get('speed')
    theme = data.get('theme')
    difficulty = data.get('difficulty')
    misses = data.get('misses')

    # --- 入力値のバリデーション ---
    # 必須項目チェック
    required_fields = {'username': username, 'score': score, 'speed': speed,
                       'theme': theme, 'difficulty': difficulty, 'misses': misses}
    if any(value is None for value in required_fields.values()):
        missing = [k for k, v in required_fields.items() if v is None]
        return jsonify({"error": f"Missing data: {', '.join(missing)}"}), 400

    # 型と値の範囲チェック
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
    # --- バリデーションここまで ---

    try:
        # Rankingオブジェクトを作成してデータベースに追加
        new_ranking = Ranking(
            username=username,
            score=score,
            speed=speed,
            theme=theme,
            difficulty=difficulty,
            misses=misses
        )
        db.session.add(new_ranking) # セッションに追加
        db.session.commit()         # データベースにコミット

        print(f"Score submitted: User={username}, Score={score}, Speed={speed:.1f}, Theme={theme}, Difficulty={difficulty}, Misses={misses}")
        return jsonify({"message": "スコアが正常に送信されました"}), 201 # 成功レスポンス (201 Created)

    except Exception as e:
        db.session.rollback() # エラー発生時はロールバック
        print(f"Error in /submit_score: {e}")
        # エラー情報をログに出力し、クライアントには汎用的なエラーメッセージを返す
        return jsonify({"error": f"スコア保存中にサーバーエラーが発生しました: {e}"}), 500

# --- ランキング取得API ---
@app.route('/get_ranking')
def get_ranking():
    """指定された難易度のランキングデータを取得して返す"""
    difficulty = request.args.get('difficulty')

    # 難易度パラメータのチェック
    if not difficulty or difficulty not in ['easy', 'normal', 'hard']:
        return jsonify({"error": "Valid difficulty parameter (easy, normal, hard) is required"}), 400

    try:
        # 指定された難易度でランキングデータを取得し、スコアと速度で降順ソート、上位10件を取得
        rankings = db.session.query(Ranking)\
                                .filter_by(difficulty=difficulty)\
                                .order_by(Ranking.score.desc(), Ranking.speed.desc())\
                                .limit(10)\
                                .all()

        # 取得したデータを辞書のリストに変換 (to_dictメソッドを使用)
        ranking_list = [r.to_dict() for r in rankings]

        print(f"Ranking data fetched for difficulty '{difficulty}': {len(ranking_list)} entries")
        return jsonify(ranking_list) # JSON形式で返す

    except Exception as e:
        # データベースエラーなど、予期せぬエラーが発生した場合
        print(f"Error in /get_ranking: {e}")
        # エラー情報をログに出力し、クライアントには汎用的なエラーメッセージを返す
        return jsonify({"error": f"ランキング取得中にサーバーエラーが発生しました: {e}"}), 500

# ★★★ 統計情報取得API (累計利用者数) を追加 ★★★
@app.route('/get_stats')
def get_stats():
    """累計利用者数（ランキング登録者数）を取得する"""
    try:
        # rankings テーブルからユニークな username の数をカウント
        # func.count(distinct(column)) で指定したカラムのユニークな値の数を取得
        unique_user_count = db.session.query(func.count(distinct(Ranking.username))).scalar()

        # scalar() は結果が1行1列の場合にその値を返す。結果がない (ユーザーが一人もいない) 場合は None を返す。
        if unique_user_count is None:
            unique_user_count = 0 # ユーザーがまだいない場合は 0 とする

        print(f"Total unique users (based on rankings): {unique_user_count}")
        # 累計利用者数をJSONで返す
        return jsonify({"total_users": unique_user_count})

    except Exception as e:
        # データベースエラーなど、予期せぬエラーが発生した場合
        print(f"Error in /get_stats: {e}")
        # エラー情報をログに出力し、クライアントには汎用的なエラーメッセージを返す
        return jsonify({"error": f"統計情報の取得中にサーバーエラーが発生しました: {e}"}), 500
# ★★★ ここまで追加 ★★★

# --- アプリケーション実行 ---
if __name__ == '__main__':
    # このファイルが直接実行された場合 (開発時など)
    # 本番環境では waitress-serve を使うため、通常ここには到達しない
    # 必要であればデバッグ用に app.run() を使うことも可能だが、
    # waitress での動作確認を推奨
    print("Please use 'waitress-serve --host=0.0.0.0 --port=5000 app:app' to run the application.")
    # app.run(debug=True) # デバッグ用
    pass
