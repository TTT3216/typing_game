document.addEventListener('DOMContentLoaded', () => {
    // --- 要素取得 (IDを index.html に合わせる) ---
    // ログイン画面
    const loginScreen = document.getElementById('login-screen');
    const usernameInput = document.getElementById('username-input');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');
    const difficultySetting = document.getElementById('difficulty-setting'); // ★ ログイン画面の難易度設定を再取得
    const toggleRulesButton = document.getElementById('toggle-rules-button'); // ★ ルールボタン取得
    const rulesSection = document.getElementById('rules-section'); // ★ ルールセクション取得

    // ゲーム画面全体
    const gameScreen = document.getElementById('game-screen');

    // ゲーム画面内要素
    const wordDisplayElement = document.getElementById('word-display');
    const inputDisplayElement = document.getElementById('input-display');
    const hiraganaDisplayElement = document.getElementById('hiragana-display');
    const romajiHistoryDisplayElement = document.getElementById('romaji-history-display');
    const scoreDisplayElement = document.getElementById('score-display');
    const messageDisplayElement = document.getElementById('message-display');
    const timerDisplayElement = document.getElementById('timer-display');
    const speedDisplayElement = document.getElementById('speed-display');
    const usernameDisplayElement = document.getElementById('username-display');
    const difficultyDisplayElement = document.getElementById('difficulty-display');
    const soundStatusDisplayElement = document.getElementById('sound-status-display');
    const menuButton = document.getElementById('menu-button');

    // ゲームオーバー画面
    const gameOverModal = document.getElementById('game-over-modal');
    const gameOverTitle = document.getElementById('game-over-title');
    const currentRankUsernameOver = document.getElementById('current-rank-username-over');
    const currentRankScoreOver = document.getElementById('current-rank-score-over');
    const currentRankSpeedOver = document.getElementById('current-rank-speed-over');
    const currentRankMissesOver = document.getElementById('current-rank-misses-over');
    const currentRankThemeOver = document.getElementById('current-rank-theme-over');
    const currentRankDifficultyOver = document.getElementById('current-rank-difficulty-over');
    const personalBestScoreOver = document.getElementById('personal-best-score-over');
    const rankingTableOver = document.getElementById('ranking-table-over');
    const rankingTableBodyOver = rankingTableOver ? rankingTableOver.querySelector('tbody') : null;
    const retryButton = document.getElementById('retry-button');
    const backToLoginButton = document.getElementById('back-to-login-button');
    const closeGameOverButton = document.getElementById('close-game-over-button');

    // メニューモーダル要素
    const menuModal = document.getElementById('menu-modal');
    const difficultySelectMenu = document.getElementById('difficulty-select-menu');
    const themeSelectMenu = document.getElementById('theme-select-menu');
    const soundToggleButtonMenu = document.getElementById('sound-toggle-button-menu');
    const logoutButtonMenu = document.getElementById('logout-button-menu');
    const closeMenuButton = document.getElementById('close-menu-button');


    // --- ゲーム状態変数 ---
    let currentWordData = { display: '', hiragana: '' };
    let typedRomaji = '';
    let typedRomajiHistory = '';
    let currentHiraganaIndex = 0;
    let score = 0;
    let correctTypedCount = 0;
    let missTypedCount = 0;
    let currentUsername = '';
    const TIME_LIMITS = { easy: 90, normal: 60, hard: 45 };
    let timerInterval = null;
    let remainingTime = TIME_LIMITS.normal;
    let startTime = null;
    let isGameActive = false;
    let speedCalculationInterval = null;
    let currentTheme = '共通';
    let currentDifficulty = 'normal';
    let isSoundEnabled = false;
    let isMenuOpen = false;
    let pausedTime = 0;
    let audioContextInitialized = false;

    // --- 設定の読み込み (localStorage) ---
    function loadSettings() {
        const savedDifficulty = localStorage.getItem('typingGameDifficulty');
        if (savedDifficulty && ['easy', 'normal', 'hard'].includes(savedDifficulty)) {
            currentDifficulty = savedDifficulty;
            const radioToCheckLogin = difficultySetting?.querySelector(`input[value="${currentDifficulty}"]`);
            if (radioToCheckLogin) radioToCheckLogin.checked = true;
        } else {
            currentDifficulty = 'normal';
            localStorage.setItem('typingGameDifficulty', currentDifficulty);
            const defaultRadioLogin = difficultySetting?.querySelector(`input[value="${currentDifficulty}"]`);
            if (defaultRadioLogin) defaultRadioLogin.checked = true;
        }
        remainingTime = TIME_LIMITS[currentDifficulty] || TIME_LIMITS.normal;

        const savedSoundSetting = localStorage.getItem('typingGameSound');
        isSoundEnabled = savedSoundSetting === 'true';

        updateDifficultyDisplay();
        updateSoundDisplay();
        updateTimerDisplay();
    }

    // --- 設定の保存 (localStorage) ---
    function saveDifficulty(difficulty) {
        if (['easy', 'normal', 'hard'].includes(difficulty)) {
            currentDifficulty = difficulty;
            localStorage.setItem('typingGameDifficulty', difficulty);
            updateDifficultyDisplay();
            if (isMenuOpen && difficultySelectMenu) {
                 difficultySelectMenu.value = currentDifficulty;
            }
            const radioToCheckLogin = difficultySetting?.querySelector(`input[value="${currentDifficulty}"]`);
            if (radioToCheckLogin) radioToCheckLogin.checked = true;

            console.log(`難易度を ${difficulty} に変更しました。次のゲームから適用されます。`);
        } else {
            console.warn(`無効な難易度が指定されました: ${difficulty}`);
        }
    }
    function saveSoundSetting(enabled) {
        isSoundEnabled = enabled;
        localStorage.setItem('typingGameSound', isSoundEnabled);
        updateSoundDisplay();
    }
    function saveTheme(theme) {
        currentTheme = theme;
        updateThemeDisplay();
        if (isMenuOpen && themeSelectMenu) {
            themeSelectMenu.value = currentTheme;
        }
        console.log(`テーマを ${theme} に変更しました。次のゲームから適用されます。`);
    }

    // --- 表示更新 ---
    function updateDifficultyDisplay() {
        let difficultyText = '普通';
        if (currentDifficulty === 'easy') difficultyText = '簡単';
        else if (currentDifficulty === 'hard') difficultyText = '難しい';
        const difficultySpan = document.getElementById('difficulty-display');
        if (difficultySpan) difficultySpan.textContent = difficultyText;
    }
    function updateSoundDisplay() {
        if (soundStatusDisplayElement) soundStatusDisplayElement.textContent = isSoundEnabled ? 'ON' : 'OFF';
        if (soundToggleButtonMenu) soundToggleButtonMenu.textContent = isSoundEnabled ? 'OFF' : 'ON';
    }
    function updateThemeDisplay() {
        const themeSpan = document.getElementById('theme-display');
        if (themeSpan) themeSpan.textContent = currentTheme === '共通' ? '色々' : currentTheme;
    }


    // --- ローマ字変換テーブル ---
    const romajiToHiragana = {
        'a': 'あ', 'i': 'い', 'u': 'う', 'e': 'え', 'o': 'お',
        'ka': 'か', 'ki': 'き', 'ku': 'く', 'ke': 'け', 'ko': 'こ',
        'sa': 'さ', 'si': 'し', 'shi': 'し', 'su': 'す', 'se': 'せ', 'so': 'そ',
        'ta': 'た', 'ti': 'ち', 'chi': 'ち', 'tu': 'つ', 'tsu': 'つ', 'te': 'て', 'to': 'と',
        'na': 'な', 'ni': 'に', 'nu': 'ぬ', 'ne': 'ね', 'no': 'の',
        'ha': 'は', 'hi': 'ひ', 'hu': 'ふ', 'fu': 'ふ', 'he': 'へ', 'ho': 'ほ',
        'ma': 'ま', 'mi': 'み', 'mu': 'む', 'me': 'め', 'mo': 'も',
        'ya': 'や', 'yu': 'ゆ', 'yo': 'よ',
        'ra': 'ら', 'ri': 'り', 'ru': 'る', 're': 'れ', 'ro': 'ろ',
        'wa': 'わ', 'wo': 'を', 'n': 'ん',
        'ga': 'が', 'gi': 'ぎ', 'gu': 'ぐ', 'ge': 'げ', 'go': 'ご',
        'za': 'ざ', 'zi': 'じ', 'ji': 'じ', 'zu': 'ず', 'ze': 'ぜ', 'zo': 'ぞ',
        'da': 'だ', 'di': 'ぢ', 'du': 'づ', 'de': 'で', 'do': 'ど',
        'ba': 'ば', 'bi': 'び', 'bu': 'ぶ', 'be': 'べ', 'bo': 'ぼ',
        'pa': 'ぱ', 'pi': 'ぴ', 'pu': 'ぷ', 'pe': 'ぺ', 'po': 'ぽ',
        'kka': 'っか', 'kki': 'っき', 'kku': 'っく', 'kke': 'っけ', 'kko': 'っこ',
        'ssa': 'っさ', 'ssi': 'っし', 'sshi': 'っし', 'ssu': 'っす', 'sse': 'っせ', 'sso': 'っそ',
        'tta': 'った', 'tti': 'っち', 'tchi': 'っち', 'ttu': 'っつ', 'ttsu': 'っつ', 'tte': 'って', 'tto': 'っと',
        'ppa': 'っぱ', 'ppi': 'っぴ', 'ppu': 'っぷ', 'ppe': 'っぺ', 'ppo': 'っぽ',
        'mma': 'っま', 'mmi': 'っみ', 'mmu': 'っむ', 'mme': 'っめ', 'mmo': 'っも',
        'hha': 'っは', 'hhi': 'っひ', 'hhu': 'っふ', 'hhe': 'っへ', 'hho': 'っほ',
        'rra': 'っら', 'rri': 'っり', 'rru': 'っる', 'rre': 'っれ', 'rro': 'っろ',
        'nna': 'っな', 'nni': 'っに', 'nnu': 'っぬ', 'nne': 'っね', 'nno': 'っの',
        'kkya': 'っきゃ', 'kkyu': 'っきゅ', 'kkyo': 'っきょ',
        'ssha': 'っしゃ', 'sshu': 'っしゅ', 'ssho': 'っしょ',
        'ssya': 'っしゃ', 'ssyu': 'っしゅ', 'ssyo': 'っしょ',
        'tcha': 'っちゃ', 'tchu': 'っちゅ', 'tcho': 'っちょ',
        'ttya': 'っちゃ', 'ttyu': 'っちゅ', 'ttyo': 'っちょ',
        'ppya': 'っぴゃ', 'ppyu': 'っぴゅ', 'ppyo': 'っぴょ',
        'kya': 'きゃ', 'kyu': 'きゅ', 'kyo': 'きょ',
        'sha': 'しゃ', 'shu': 'しゅ', 'sho': 'しょ',
        'sya': 'しゃ', 'syu': 'しゅ', 'syo': 'しょ',
        'cha': 'ちゃ', 'chu': 'ちゅ', 'cho': 'ちょ',
        'tya': 'ちゃ', 'tyu': 'ちゅ', 'tyo': 'ちょ',
        'nya': 'にゃ', 'nyu': 'にゅ', 'nyo': 'にょ',
        'hya': 'ひゃ', 'hyu': 'ひゅ', 'hyo': 'ひょ',
        'mya': 'みゃ', 'myu': 'みゅ', 'myo': 'みょ',
        'rya': 'りゃ', 'ryu': 'りゅ', 'ryo': 'りょ',
        'gya': 'ぎゃ', 'gyu': 'ぎゅ', 'gyo': 'ぎょ',
        'ja': 'じゃ', 'ju': 'じゅ', 'jo': 'じょ',
        'jya': 'じゃ', 'jyu': 'じゅ', 'jyo': 'じょ',
        'dya': 'ぢゃ', 'dyu': 'ぢゅ', 'dyo': 'ぢょ',
        'bya': 'びゃ', 'byu': 'びゅ', 'byo': 'びょ',
        'pya': 'ぴゃ', 'pyu': 'ぴゅ', 'pyo': 'ぴょ',
        '-': 'ー',
        'nn': 'ん',
    };


    // --- ログイン/ログアウト関連 ---
    function checkLoginStatus() {
        loadSettings();
        const savedUsername = localStorage.getItem('typingGameUsername');
        if (savedUsername) {
            currentUsername = savedUsername;
            showGameScreen();
            startGame();
        } else {
            showLoginScreen();
        }
    }

    function login() {
        initAudioContext();
        const name = usernameInput.value.trim();
        const selectedDifficultyRadio = difficultySetting?.querySelector('input[name="difficulty"]:checked');
        const selectedDifficulty = selectedDifficultyRadio ? selectedDifficultyRadio.value : 'normal';

        if (name) {
            currentUsername = name;
            localStorage.setItem('typingGameUsername', name);
            saveDifficulty(selectedDifficulty);
            saveTheme('共通');
            if (loginError) loginError.style.display = 'none';
            showGameScreen();
            startGame();
        } else {
            if (loginError) loginError.textContent = '名前を入力してください。';
            if (loginError) loginError.style.display = 'block';
        }
    }

    function logout() {
        stopGame();
        localStorage.removeItem('typingGameUsername');
        currentUsername = '';
        showLoginScreen();
        if (isMenuOpen) closeMenu();
    }

    // --- ログイン/ログアウト関連 ---
    function showLoginScreen() {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (gameScreen) gameScreen.style.display = 'none';
        if (gameOverModal) gameOverModal.style.display = 'none';
        if (menuModal) menuModal.style.display = 'none';
        if (menuButton) menuButton.style.display = 'none'; // ★★★ 追加: ログイン画面ではメニューボタンを非表示 ★★★
        isMenuOpen = false;
        // ★ ルール表示をリセット
        if (rulesSection) rulesSection.style.display = 'none'; // ルールを隠す
        if (toggleRulesButton) toggleRulesButton.textContent = 'ルールを表示'; // ボタンテキストを戻す
        document.removeEventListener('keydown', keydownHandler);
        console.log("キー入力リスナーを削除しました in showLoginScreen");
    }

    function showGameScreen() {
        if (loginScreen) loginScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'flex';
        if (usernameDisplayElement) usernameDisplayElement.textContent = currentUsername;
        if (menuButton) menuButton.style.display = 'block'; // ★★★ 追加: ゲーム画面ではメニューボタンを表示 (元の表示形式に合わせる) ★★★
        document.removeEventListener('keydown', keydownHandler);
        document.addEventListener('keydown', keydownHandler);
        console.log("キー入力リスナーを登録しました in showGameScreen");
    }



    // --- ゲーム制御 ---
    function startGame() {
        console.log("startGame() が呼ばれました");
        resetGameState();
        isGameActive = true;
        startTime = performance.now();
        updateDifficultyDisplay();
        updateSoundDisplay();
        updateThemeDisplay();
        startTimer();
        startSpeedCalculation();
        getNewWord();
        if (messageDisplayElement) messageDisplayElement.textContent = '';
        if (romajiHistoryDisplayElement) romajiHistoryDisplayElement.textContent = '最後に押したキー:';
        updateRomajiDisplay();
        if (gameOverModal) gameOverModal.style.display = 'none';
        if (menuModal) menuModal.style.display = 'none';
        isMenuOpen = false;
        document.removeEventListener('keydown', keydownHandler);
        document.addEventListener('keydown', keydownHandler);
        console.log("キー入力リスナーを登録しました in startGame");
    }

    function stopGame() {
        console.log("stopGame() が呼ばれました");
        isGameActive = false;
        stopTimer();
        stopSpeedCalculation();
        document.removeEventListener('keydown', keydownHandler);
        console.log("キー入力リスナーを削除しました in stopGame");
    }

    function resetGameState() {
        console.log("resetGameState() が呼ばれました");
        score = 0;
        correctTypedCount = 0;
        missTypedCount = 0;
        const gameTimeLimit = TIME_LIMITS[currentDifficulty] || TIME_LIMITS.normal;
        remainingTime = gameTimeLimit;
        typedRomaji = '';
        typedRomajiHistory = '';
        currentHiraganaIndex = 0;
        startTime = null;
        pausedTime = 0;

        if(scoreDisplayElement) scoreDisplayElement.textContent = `スコア: ${score}`;
        if(timerDisplayElement) timerDisplayElement.textContent = formatTime(remainingTime);
        if(speedDisplayElement) speedDisplayElement.textContent = `1秒間に 0.0 文字`;
        if(wordDisplayElement) wordDisplayElement.textContent = '読み込み中...';
        if(messageDisplayElement) messageDisplayElement.textContent = '';
        if (romajiHistoryDisplayElement) romajiHistoryDisplayElement.textContent = '最後に押したキー:';
        updateRomajiDisplay();
    }

    function restartGame() {
        console.log("restartGame() が呼ばれました");
        if(gameOverModal) gameOverModal.style.display = 'none';
        startGame();
    }

    // --- タイマー関連 ---
    function startTimer() {
        clearInterval(timerInterval);
        const timeToStart = pausedTime > 0 ? pausedTime : (TIME_LIMITS[currentDifficulty] || TIME_LIMITS.normal);
        remainingTime = timeToStart;
        pausedTime = 0;
        updateTimerDisplay();
        console.log(`タイマー開始 (残り ${remainingTime} 秒、難易度: ${currentDifficulty})`);

        timerInterval = setInterval(() => {
            if (isGameActive && !isMenuOpen) {
                remainingTime--;
                updateTimerDisplay();
                if (remainingTime <= 0) {
                    gameOver();
                }
            } else if (!isGameActive) {
                stopTimer();
            }
        }, 1000);
    }
    function stopTimer() {
        clearInterval(timerInterval);
        timerInterval = null;
        console.log("タイマー停止");
    }
    function pauseTimer() {
        if (isGameActive && !isMenuOpen) {
            pausedTime = remainingTime;
            console.log(`タイマー一時停止 (残り ${pausedTime} 秒)`);
        }
    }
    function resumeTimer() {
        console.log(`タイマー再開準備 (startTimer内で処理)`);
    }
    function updateTimerDisplay() {
        if (timerDisplayElement) timerDisplayElement.textContent = formatTime(remainingTime);
    }
    function formatTime(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = seconds % 60;
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }

    // --- 速度計算関連 ---
    function startSpeedCalculation() {
        clearInterval(speedCalculationInterval);
        updateSpeedDisplay();

        speedCalculationInterval = setInterval(() => {
            if (!isGameActive || isMenuOpen) {
                return;
            }
            updateSpeedDisplay();
        }, 1000);
    }
    function stopSpeedCalculation() {
        clearInterval(speedCalculationInterval);
        speedCalculationInterval = null;
    }
    function updateSpeedDisplay(isFinal = false) {
        if (!speedDisplayElement) return;
        if ((!isGameActive || isMenuOpen) && !isFinal) {
             speedDisplayElement.textContent = `1秒間に 0.0 文字`;
             return;
        }
        const currentTime = performance.now();
        const elapsedTime = startTime ? (currentTime - startTime) / 1000 : 0;
        let charsPerSecond = 0;
        if (elapsedTime > 0 && correctTypedCount > 0) {
            charsPerSecond = correctTypedCount / elapsedTime;
        }
        speedDisplayElement.textContent = `1秒間に ${charsPerSecond.toFixed(1)} 文字`;
    }

    // --- 単語取得 ---
    async function getNewWord() {
        console.log(`getNewWord() 呼び出し (難易度: ${currentDifficulty}, テーマ: ${currentTheme})`);
        if (!isGameActive) {
            console.log("ゲーム非アクティブのため単語取得スキップ");
            return;
        }
        try {
            const response = await fetch(`/get_word?difficulty=${currentDifficulty}&theme=${currentTheme}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: `HTTP ${response.status}` }));
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || '不明なエラー'}`);
            }
            const data = await response.json();
            console.log("単語データ受信:", data);
            if (data && data.display && data.hiragana) {
                currentWordData = { display: data.display, hiragana: data.hiragana };
                if (wordDisplayElement) wordDisplayElement.textContent = currentWordData.display;
                typedRomaji = '';
                typedRomajiHistory = '';
                currentHiraganaIndex = 0;
                if (messageDisplayElement) messageDisplayElement.textContent = '';
                if (romajiHistoryDisplayElement) romajiHistoryDisplayElement.textContent = '最後に押したキー:';
                updateRomajiDisplay();
            } else if (data && data.error) {
                console.error("サーバーからのエラー:", data.error);
                if (wordDisplayElement) wordDisplayElement.textContent = `エラー: ${data.error}`;
                currentWordData = { display: 'エラー', hiragana: '' };
            } else {
                console.error("無効な単語データ形式:", data);
                if (wordDisplayElement) wordDisplayElement.textContent = "エラー: 無効な単語";
                currentWordData = { display: 'エラー', hiragana: '' };
            }
        } catch (error) {
            console.error("単語の取得中にエラー:", error);
            if (wordDisplayElement) wordDisplayElement.textContent = "エラー: 単語取得失敗";
            currentWordData = { display: '失敗', hiragana: '' };
        }
    }

    // --- ローマ字表示更新 ---
    function updateRomajiDisplay() {
        if (inputDisplayElement) {
            inputDisplayElement.textContent = typedRomajiHistory + typedRomaji;
        }
        if (hiraganaDisplayElement) {
             // hiraganaDisplayElement.textContent = currentWordData.hiragana.substring(currentHiraganaIndex);
        }
    }

    // --- 自己ベスト関連関数 ---
    function getPersonalBestScore(username, difficulty) {
        const key = `typingGamePersonalBest_${username}_${difficulty}`;
        const bestScore = localStorage.getItem(key);
        const score = bestScore ? parseInt(bestScore, 10) : 0;
        return isNaN(score) ? 0 : score;
    }

    function updatePersonalBestScore(username, currentScore, difficulty) {
        const key = `typingGamePersonalBest_${username}_${difficulty}`;
        const bestScore = getPersonalBestScore(username, difficulty);
        if (currentScore > bestScore) {
            localStorage.setItem(key, currentScore.toString());
            console.log(`自己ベスト更新 (${difficulty}): ${currentScore} (旧記録: ${bestScore})`);
            return currentScore;
        }
        return bestScore;
    }

    // --- ランキング関連関数 ---
    async function submitScoreToServer(username, score, speed, theme) {
        const difficulty = currentDifficulty;
        const misses = missTypedCount;
        console.log("スコア送信開始", { username, score, speed, theme, difficulty, misses });

        try {
            const response = await fetch('/submit_score', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', },
                body: JSON.stringify({ username, score, speed, theme, difficulty, misses }),
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "レスポンス解析失敗" }));
                throw new Error(`スコア送信失敗: ${response.status} ${errorData.error || ''}`);
            }
            const result = await response.json();
            console.log('スコア送信成功:', result.message);
        } catch (error) {
            console.error('スコア送信中にエラー:', error);
        } finally {
            console.log("スコア送信処理完了");
        }
    }
    async function fetchRankingData() {
        const difficulty = currentDifficulty;
        console.log(`ランキング取得開始 (難易度: ${difficulty})`);
        try {
            const response = await fetch(`/get_ranking?difficulty=${difficulty}`);
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: "レスポンス解析失敗" }));
                throw new Error(`ランキング取得失敗: ${response.status} ${errorData.error || ''}`);
            }
            const rankingData = await response.json();
            console.log('ランキング取得成功:', rankingData);
            return rankingData;
        } catch (error) {
            console.error('ランキング取得中にエラー:', error);
            return null;
        } finally {
            console.log("ランキング取得処理完了");
        }
    }
    function displayRanking(elements, currentResult, personalBest, rankingData) {
        console.log("displayRanking 開始", { elements, currentResult, personalBest, rankingData });
        if (!elements || !elements.username || !elements.score || !elements.speed || !elements.misses || !elements.theme || !elements.difficulty || !elements.personalBest || !elements.tableBody) {
            console.error("ランキング表示に必要な要素が見つかりません:", elements);
            if (!elements) console.error("elements オブジェクト自体が null または undefined です。");
            else {
                if (!elements.username) console.error("elements.username が見つかりません。");
                if (!elements.score) console.error("elements.score が見つかりません。");
                if (!elements.speed) console.error("elements.speed が見つかりません。");
                if (!elements.misses) console.error("elements.misses が見つかりません。");
                if (!elements.theme) console.error("elements.theme が見つかりません。");
                if (!elements.difficulty) console.error("elements.difficulty が見つかりません。");
                if (!elements.personalBest) console.error("elements.personalBest が見つかりません。");
                if (!elements.tableBody) console.error("elements.tableBody が見つかりません (tbody要素の取得失敗？)。");
            }
            return;
        }

        elements.username.textContent = currentResult.username;
        elements.score.textContent = currentResult.score;
        elements.speed.textContent = currentResult.speed.toFixed(1);
        elements.misses.textContent = currentResult.misses;
        elements.theme.textContent = currentResult.theme;
        elements.difficulty.textContent = currentDifficulty;
        elements.personalBest.textContent = personalBest > 0 ? personalBest : '記録なし';

        elements.tableBody.innerHTML = '';
        if (rankingData && Array.isArray(rankingData)) {

            // ★★★ 修正箇所 開始 ★★★
            // ランキングデータをソートする (スコア降順 -> 速度降順 -> ミス数昇順)
            rankingData.sort((a, b) => {
                // 1. スコアで降順ソート
                const scoreA = typeof a.score === 'number' ? a.score : -1; // スコアがない場合は最下位に
                const scoreB = typeof b.score === 'number' ? b.score : -1;
                if (scoreB !== scoreA) {
                    return scoreB - scoreA; // 降順
                }

                // 2. スコアが同じなら速度で降順ソート (安全な比較)
                const speedA = typeof a.speed === 'number' ? a.speed : 0;
                const speedB = typeof b.speed === 'number' ? b.speed : 0;
                // 降順比較: bが大きければ正の数、aが大きければ負の数、等しければ0
                if (speedB > speedA) return 1;
                if (speedB < speedA) return -1;

                // 3. スコアも速度も同じならミス数で昇順ソート
                const missesA = typeof a.misses === 'number' ? a.misses : Infinity; // ミス数がない場合は最下位に
                const missesB = typeof b.misses === 'number' ? b.misses : Infinity;
                return missesA - missesB; // 昇順 (少ない方が上)
            });
            // ★★★ 修正箇所 終了 ★★★

            if (rankingData.length === 0) {
                 elements.tableBody.innerHTML = '<tr><td colspan="5">まだランキングデータがありません。</td></tr>';
            } else {
                // ソート済みのデータでテーブルを生成
                rankingData.forEach((entry, index) => {
                    const row = elements.tableBody.insertRow();
                    row.insertCell().textContent = index + 1; // 順位
                    row.insertCell().textContent = entry.username;
                    row.insertCell().textContent = entry.score;
                    const speedValue = typeof entry.speed === 'number' ? entry.speed.toFixed(1) : '0.0';
                    row.insertCell().textContent = speedValue;
                    const missValue = typeof entry.misses === 'number' ? entry.misses : 0;
                    row.insertCell().textContent = missValue;
                });
            }
        } else {
            elements.tableBody.innerHTML = '<tr><td colspan="5">ランキングの取得に失敗しました。</td></tr>';
            console.error("ランキングデータの形式が不正か、取得に失敗しました:", rankingData);
        }
        console.log("displayRanking 完了");
    }

    // --- ゲーム終了処理 ---
    async function handleGameEnd(finalScore, isClear) {
        console.log("handleGameEnd 開始", { finalScore, isClear });
        stopGame();

        const finalSpeedValue = calculateFinalSpeed();
        console.log("最終速度計算結果:", finalSpeedValue);

        const personalBest = updatePersonalBestScore(currentUsername, finalScore, currentDifficulty);
        console.log(`自己ベスト更新後 (${currentDifficulty}):`, personalBest);

        try {
            console.log("スコア送信を開始します...");
            await submitScoreToServer(currentUsername, finalScore, finalSpeedValue, currentTheme);
            console.log("スコア送信が完了しました。");

            console.log("ランキング取得を開始します...");
            const rankingData = await fetchRankingData(); // サーバーからデータを取得
            console.log("ランキング取得が完了しました。", { rankingData });

            // ゲームオーバーモーダル表示処理
            if (!isClear && gameOverModal) {
                const elements = {
                    username: currentRankUsernameOver, score: currentRankScoreOver, speed: currentRankSpeedOver,
                    misses: currentRankMissesOver, theme: currentRankThemeOver, difficulty: currentRankDifficultyOver,
                    personalBest: personalBestScoreOver, tableBody: rankingTableBodyOver
                };
                console.log("表示要素セット (Game Over):", elements);

                const currentResult = {
                    username: currentUsername, score: finalScore, speed: finalSpeedValue,
                    misses: missTypedCount, theme: currentTheme, difficulty: currentDifficulty
                };
                console.log("今回の結果 (Game Over):", currentResult);

                // displayRanking 関数内でソートが行われる
                displayRanking(elements, currentResult, personalBest, rankingData);

                const rankingDifficultySpan = document.getElementById('ranking-difficulty-over');
                if (rankingDifficultySpan) rankingDifficultySpan.textContent = currentDifficulty;

                gameOverModal.style.display = 'flex';
                console.log("ゲームオーバーモーダル表示");

            } else if (isClear) {
                console.warn("ゲームクリア画面の処理は未実装です。");
                // クリア時の処理が必要ならここに追加
            } else {
                 console.error("ゲームオーバーモーダルが見つかりません。");
            }

        } catch (error) {
            console.error("ゲーム終了処理中にエラーが発生しました:", error);
            // エラー発生時も、取得できた情報でランキング表示を試みる
            if (!isClear && gameOverModal) {
                const elements = {
                    username: currentRankUsernameOver, score: currentRankScoreOver, speed: currentRankSpeedOver,
                    misses: currentRankMissesOver, theme: currentRankThemeOver, difficulty: currentRankDifficultyOver,
                    personalBest: personalBestScoreOver, tableBody: rankingTableBodyOver
                };
                 const currentResult = {
                    username: currentUsername, score: finalScore, speed: finalSpeedValue,
                    misses: missTypedCount, theme: currentTheme, difficulty: currentDifficulty
                };
                // エラー時は rankingData が null の可能性があるため、null を渡す
                displayRanking(elements, currentResult, personalBest, null);
                const rankingDifficultySpan = document.getElementById('ranking-difficulty-over');
                if (rankingDifficultySpan) rankingDifficultySpan.textContent = currentDifficulty;
                gameOverModal.style.display = 'flex';
            } else if (isClear) {
                 console.warn("ゲームクリア画面の処理は未実装です。");
            } else {
                 console.error("ゲームオーバーモーダルが見つかりません。");
            }
        } finally {
            console.log("handleGameEnd 完了");
        }
    }

    function calculateFinalSpeed() {
        if (!startTime) {
            console.warn("calculateFinalSpeed: startTime が記録されていません。");
            return 0.0;
        }
        const endTime = performance.now();
        const elapsedTime = (endTime - startTime) / 1000;
        if (elapsedTime <= 0 || correctTypedCount <= 0) {
            console.log(`calculateFinalSpeed: 速度計算スキップ (elapsedTime: ${elapsedTime.toFixed(3)}, correctTypedCount: ${correctTypedCount})`);
            return 0.0;
        }
        const charsPerSecond = correctTypedCount / elapsedTime;
        console.log(`calculateFinalSpeed: ${correctTypedCount} chars / ${elapsedTime.toFixed(3)} sec = ${charsPerSecond.toFixed(3)} chars/sec`);
        return charsPerSecond;
    }
    function showGameClear() {
        console.warn("showGameClear は現在呼び出されません。時間切れで gameOver が呼び出されます。");
        // 必要であればゲームクリア時の処理を実装
        // handleGameEnd(score, true); // 例: クリアフラグを立てて handleGameEnd を呼ぶ
    }
    function gameOver() {
        console.log("ゲームオーバー処理開始 (gameOver)");
        handleGameEnd(score, false); // isClear フラグを false にして handleGameEnd を呼ぶ
    }

    // --- キー入力処理 (keydownHandler) ---
    const keydownHandler = (event) => {
        const isModalVisible = (gameOverModal && gameOverModal.style.display === 'flex');
        if (!isGameActive || isMenuOpen || isModalVisible || !currentWordData.hiragana) {
            console.log("キー入力無視 (非アクティブ or メニュー/モーダル表示中 or 単語未設定)");
            return;
        }

        const key = event.key;

        // Backspace処理
        if (key === 'Backspace') {
            if (typedRomaji.length > 0) {
                typedRomaji = typedRomaji.slice(0, -1);
                updateRomajiDisplay();
                setResult('', ''); // メッセージクリア
                if (romajiHistoryDisplayElement) romajiHistoryDisplayElement.textContent = '最後に押したキー: Backspace';
                console.log("Backspace pressed, typedRomaji:", typedRomaji);
            }
            event.preventDefault(); // デフォルトのBackspace動作を抑制
            return;
        }

        // 有効な入力キーかチェック (a-z, -)
        // 'n' 単独入力も考慮する必要があるため、単純な正規表現だけでは不十分な場合がある
        if (!/^[a-z-]$/i.test(key) || key.length !== 1) {
            // 'n' 以外の特殊キーや複数文字入力は無視 (Shift, Ctrl なども含む)
            if (key.toLowerCase() !== 'n') { // 'n' は後続の処理で判定するためここでは無視しない
                 console.log("無視するキー:", key);
                 // 必要であれば特定のキーでメニューを開くなどの処理を追加
                 // if (['Enter', 'Shift', 'Control', 'Alt', 'Meta', 'Tab', 'Escape'].includes(key)) {
                 //     // if (key === 'Escape') openMenu();
                 // }
                 return;
            }
        }

        const typedKey = key.toLowerCase();
        if (romajiHistoryDisplayElement) romajiHistoryDisplayElement.textContent = `最後に押したキー: ${typedKey}`;

        typedRomaji += typedKey;
        updateRomajiDisplay();
        console.log("Typed:", typedKey, "| Current Romaji:", typedRomaji, "| History:", typedRomajiHistory);

        let matchFound = false;
        const expectedHiragana = currentWordData.hiragana.substring(currentHiraganaIndex);
        let bestMatch = null; // 最長一致で見つかったマッチ情報

        // 1. ローマ字テーブルから一致を探す (最長一致)
        for (const romaji in romajiToHiragana) {
            if (typedRomaji.startsWith(romaji)) {
                const hiragana = romajiToHiragana[romaji];
                // 現在の入力位置から始まるひらがなと一致するか？
                if (expectedHiragana.startsWith(hiragana)) {
                    // より長い一致が見つかったら更新
                    if (bestMatch === null || romaji.length > bestMatch.romaji.length) {
                        bestMatch = { romaji, hiragana, length: romaji.length };
                    }
                }
            }
        }

        // 2. 'n' の特殊処理 ('ん' の判定)
        // 上記で見つからず、入力が 'n' で、期待されるひらがなが 'ん' で始まる場合
        if (!bestMatch && typedRomaji === 'n' && expectedHiragana.startsWith('ん')) {
            const nextHiraganaIndex = currentHiraganaIndex + 1;
            let processNAsSingleN = false; // 'n' を単独の 'ん' として処理するかどうか

            // 単語の末尾の 'ん' か？
            if (nextHiraganaIndex === currentWordData.hiragana.length) {
                processNAsSingleN = true;
            } else {
                // 次の文字が母音(a,i,u,e,o)、や行(y)、な行(n)で始まらない子音の場合
                let nextRomajiStartsWithVowelYN = false;
                let foundNextRomaji = false;
                const nextHiraganaChar = currentWordData.hiragana.substring(nextHiraganaIndex);

                // 次のひらがなに対応するローマ字を探す (効率は良くないが判定のため)
                for (const r in romajiToHiragana) {
                    // 次のひらがなで始まるローマ字を見つける
                    if (nextHiraganaChar.startsWith(romajiToHiragana[r])) {
                         foundNextRomaji = true;
                         // そのローマ字が母音、y、nで始まるかチェック
                         if (/^[aiueoyn]/i.test(r)) {
                             nextRomajiStartsWithVowelYN = true;
                         }
                         // 一致が見つかればループを抜ける (最初の候補で判定)
                         break;
                    }
                }

                // 次の文字が見つからない、または母音/y/nで始まらない場合、'n'を'ん'として確定
                if (!foundNextRomaji || !nextRomajiStartsWithVowelYN) {
                    processNAsSingleN = true;
                }
            }

            // 'n' を 'ん' として処理する場合
            if (processNAsSingleN) {
                bestMatch = { romaji: 'n', hiragana: 'ん', length: 1 };
            }
        }


        // 3. マッチ判定と処理
        if (bestMatch) {
            // --- 正しい入力の場合 ---
            matchFound = true;
            console.log("マッチ:", bestMatch.romaji, "->", bestMatch.hiragana);

            // 正解タイプ数を加算
            correctTypedCount += bestMatch.length;

            // 入力済みローマ字履歴に追加し、現在の入力から削除
            typedRomajiHistory += typedRomaji.slice(0, bestMatch.length);
            typedRomaji = typedRomaji.slice(bestMatch.length);

            // ひらがなのインデックスを進める
            currentHiraganaIndex += bestMatch.hiragana.length;

            updateRomajiDisplay(); // 表示更新
            setResult('OK', 'correct'); // 一時的にOK表示

            // 単語全体をタイプし終えたか？
            if (currentHiraganaIndex === currentWordData.hiragana.length) {
                score++; // スコア加算
                if (scoreDisplayElement) scoreDisplayElement.textContent = `スコア: ${score}`;
                setResult('正解！', 'correct'); // 正解メッセージ
                playSound('correct'); // 正解音
                setTimeout(getNewWord, 200); // 少し待ってから次の単語へ
            } else {
                // まだ単語の途中
                if (typedRomaji.length > 0) {
                    // 残りの入力がある場合 (例: 'kyou' の 'kyo' を入力した直後)
                    setResult('入力中...', 'typing'); // 入力中表示に戻す
                } else {
                    // 残りの入力がない場合 (例: 'ka' を入力した直後)
                    // 少し待ってからメッセージを消す
                    setTimeout(() => {
                        if (messageDisplayElement && messageDisplayElement.textContent === 'OK') {
                            setResult('', '');
                        }
                    }, 150);
                }
            }
        } else {
            // --- 不正解または入力途中の場合 ---
            matchFound = false;

            // 現在の入力が、有効なローマ字の開始部分である可能性はあるか？
            // (例: 'k' と入力した段階ではまだ不正解ではない)
            const canBeValidStart = Object.keys(romajiToHiragana).some(r =>
                r.startsWith(typedRomaji) && expectedHiragana.startsWith(romajiToHiragana[r])
            );

            if (typedRomaji.length > 0) {
                if (canBeValidStart) {
                    // 有効な入力の途中 (例: 'k' や 'sh')
                    setResult('入力中...', 'typing');
                } else {
                    // 明らかに不正解な入力
                    missTypedCount++; // ミスカウント
                    setResult('不正解', 'incorrect');
                    console.log("不正解 (無効な入力)、リセット前:", typedRomaji);
                    playSound('incorrect'); // 不正解音

                    // 最後に入力した一文字を削除してリセット
                    typedRomaji = typedRomaji.slice(0, -1);
                    updateRomajiDisplay();
                    console.log("不正解、リセット後:", typedRomaji);

                    // 少し待ってからメッセージを戻す
                    setTimeout(() => {
                         if (messageDisplayElement && messageDisplayElement.textContent === '不正解') {
                             // リセット後の状態でメッセージを更新
                             setResult(typedRomaji.length > 0 ? '入力中...' : '', typedRomaji.length > 0 ? 'typing' : '');
                         }
                     }, 400);
                }
            } else {
                // 入力が空になった場合 (Backspaceで全部消した場合など)
                setResult('', '');
            }
        }
    };

    // --- 結果表示の補助関数 ---
    function setResult(message, className) {
        if (messageDisplayElement) {
            messageDisplayElement.textContent = message;
            // クラス名を適切に設定 (基本クラス + 状態クラス)
            if (className) {
                messageDisplayElement.className = `message-display ${className}`; // IDではなくクラス名でスタイル指定する場合
            } else {
                messageDisplayElement.className = 'message-display';
            }
        }
    }

    // --- メニュー関連処理 ---
    function openMenu() {
        if (!isGameActive) return; // ゲーム中でなければ開かない
        pauseTimer(); // タイマー一時停止
        // 現在の設定をメニューに反映
        if (difficultySelectMenu) {
            difficultySelectMenu.value = currentDifficulty;
        }
        if (themeSelectMenu) {
            themeSelectMenu.value = currentTheme;
        }
        if (menuModal) menuModal.style.display = 'flex'; // メニュー表示
        isMenuOpen = true;
        console.log("メニューを開きました");
    }

    function closeMenu() {
        if (menuModal) menuModal.style.display = 'none'; // メニュー非表示
        isMenuOpen = false;
        resumeTimer(); // タイマー再開準備
        startTimer(); // タイマー再開
        console.log("メニューを閉じました");
    }

    function toggleSound() {
        initAudioContext(); // AudioContext初期化確認
        const newState = !isSoundEnabled;
        saveSoundSetting(newState); // 設定を保存
        console.log(`効果音を ${newState ? 'ON' : 'OFF'} にしました`);
        if (newState) {
            playSound('toggle_on'); // ONにしたときに音を鳴らす
        }
    }


    // --- 効果音再生関数 ---
    const sounds = {
        correct: new Audio('/static/sounds/correct.mp3'),
        incorrect: new Audio('/static/sounds/incorrect.mp3'),
        toggle_on: new Audio('/static/sounds/toggle_on.mp3'), // メニューのON/OFF音など
    };
    // 事前ロードと音量設定
    Object.values(sounds).forEach(sound => {
        sound.load(); // ファイルを読み込んでおく
        sound.volume = 0.5; // 音量を50%に設定 (調整可能)
    });
    // AudioContextの初期化 (ブラウザの自動再生ポリシー対策)
    function initAudioContext() {
        if (audioContextInitialized) return; // 初期化済みなら何もしない
        try {
            // ユーザー操作（例: ログインボタンクリック）に関連付けてダミー音を再生
            const dummySound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            dummySound.volume = 0; // 聞こえないように音量0
            dummySound.play().then(() => {
                console.log("Audio context initialized by dummy play.");
                audioContextInitialized = true;
            }).catch(error => {
                // ユーザー操作なしで呼ばれた場合など、失敗することがある
                console.warn("Dummy sound play failed, audio might require further interaction.", error);
            });
        } catch (e) {
            console.error("Error initializing audio context:", e);
        }
    }
    function playSound(soundName) {
        if (!audioContextInitialized) {
            console.warn(`効果音 ${soundName} 再生スキップ: Audio context not initialized.`);
            // 再生できなかった場合、再度初期化を試みる（ユーザー操作後なら成功する可能性）
            initAudioContext();
            return;
        }
        if (isSoundEnabled && sounds[soundName]) {
            sounds[soundName].currentTime = 0; // 再生位置を先頭に戻す
            sounds[soundName].play().catch(error => {
                // まれに再生に失敗することがある (例: 短時間に連続再生しすぎた場合)
                console.warn(`効果音 ${soundName} の再生に失敗しました:`, error);
            });
        }
    }


    // --- イベントリスナー設定 ---
    // ログイン画面
    if (loginButton) loginButton.addEventListener('click', login);
    if (usernameInput) {
        // Enterキーでもログインできるように
        usernameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault(); // フォーム送信を抑制
                login();
            }
        });
    }
    if (difficultySetting) {
        // ログイン画面での難易度選択をログに出力 (デバッグ用)
        difficultySetting.addEventListener('change', (event) => {
            if (event.target.type === 'radio' && event.target.checked) {
                console.log(`ログイン画面で難易度 ${event.target.value} を選択`);
                // ここで saveDifficulty を呼ぶ必要はない (ログイン時に保存される)
            }
        });
    }
    // ★ ルール表示切り替えボタンのイベントリスナーを追加
    if (toggleRulesButton && rulesSection) {
        toggleRulesButton.addEventListener('click', () => {
            const isHidden = rulesSection.style.display === 'none' || rulesSection.style.display === '';
            rulesSection.style.display = isHidden ? 'block' : 'none'; // 表示/非表示を切り替え
            toggleRulesButton.textContent = isHidden ? 'ルールを隠す' : 'ルールを表示'; // ボタンテキスト変更
        });
    }

    // ゲーム画面
    if (menuButton) menuButton.addEventListener('click', openMenu);

    // ゲームオーバー画面
    if (retryButton) retryButton.addEventListener('click', restartGame);
    if (backToLoginButton) backToLoginButton.addEventListener('click', logout);
    // 右上の×ボタンでも閉じられるように
    if (closeGameOverButton) closeGameOverButton.addEventListener('click', () => {
        if (gameOverModal) gameOverModal.style.display = 'none';
    });

    // メニューモーダル
    if (closeMenuButton) closeMenuButton.addEventListener('click', closeMenu);
    if (soundToggleButtonMenu) soundToggleButtonMenu.addEventListener('click', toggleSound);
    if (logoutButtonMenu) logoutButtonMenu.addEventListener('click', logout);
    // モーダルの外側をクリックしても閉じるように
    if (menuModal) {
        menuModal.addEventListener('click', (event) => {
            // クリックされた要素がモーダル自身 (背景部分) なら閉じる
            if (event.target === menuModal) {
                closeMenu();
            }
        });
    }
    // メニュー内の難易度変更
    if (difficultySelectMenu) {
        difficultySelectMenu.addEventListener('change', (event) => {
            saveDifficulty(event.target.value); // 選択された難易度を保存
            console.log("メニューで難易度変更。次のゲームから適用されます。");
            // ゲーム中に変更しても即時には反映されない (次のゲームから)
        });
    }
    // メニュー内のテーマ変更
    if (themeSelectMenu) {
        themeSelectMenu.addEventListener('change', (event) => {
            saveTheme(event.target.value); // 選択されたテーマを保存
            console.log("メニューでテーマ変更。次のゲームから適用されます。");
            // ゲーム中に変更しても即時には反映されない (次のゲームから)
        });
    }


    // --- 初期化処理 ---
    checkLoginStatus(); // ページ読み込み時にログイン状態を確認して画面を表示

}); // DOMContentLoaded の終わり
