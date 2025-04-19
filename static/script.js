// script.js (累計利用者数表示機能を追加)

document.addEventListener('DOMContentLoaded', () => {
    // --- 要素取得 (IDを index.html に合わせる) ---
    // ログイン画面
    const loginScreen = document.getElementById('login-screen');
    const usernameInput = document.getElementById('username-input');
    const loginButton = document.getElementById('login-button');
    const loginError = document.getElementById('login-error');
    const difficultySetting = document.getElementById('difficulty-setting');
    const toggleRulesButton = document.getElementById('toggle-rules-button');
    const rulesSection = document.getElementById('rules-section');
    const totalUsersDisplay = document.getElementById('total-users-display'); // ★★★ 累計利用者数表示要素を取得 ★★★

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

    // ★★★ 累計利用者数を取得して表示する関数 ★★★
    async function fetchAndDisplayTotalUsers() {
        if (!totalUsersDisplay) {
            // 要素がない場合は何もしない (ゲーム画面などでは表示しない想定)
            // console.error('累計利用者数表示要素が見つかりません。');
            return;
        }
        totalUsersDisplay.textContent = '累計利用者数: 読み込み中...'; // 読み込み中表示

        try {
            const response = await fetch('/get_stats'); // APIエンドポイントを呼び出し
            if (!response.ok) {
                throw new Error(`APIエラー: ${response.status} ${response.statusText}`);
            }
            const data = await response.json(); // JSONレスポンスをパース

            if (data && typeof data.total_users === 'number') {
                totalUsersDisplay.textContent = `累計利用者数: ${data.total_users} 人`; // 表示を更新
            } else {
                console.error('APIからの累計利用者数データが無効です:', data);
                totalUsersDisplay.textContent = '累計利用者数: 取得失敗';
            }
        } catch (error) {
            console.error('累計利用者数の取得に失敗しました:', error);
            totalUsersDisplay.textContent = '累計利用者数: 取得失敗'; // エラー表示
        }
    }
    // ★★★ ここまで追加 ★★★


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

    // --- 画面表示切り替え --- // ★★★ 関数名を修正 ★★★
    function showLoginScreen() {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (gameScreen) gameScreen.style.display = 'none';
        if (gameOverModal) gameOverModal.style.display = 'none';
        if (menuModal) menuModal.style.display = 'none';
        if (menuButton) menuButton.style.display = 'none';
        isMenuOpen = false;
        if (rulesSection) rulesSection.style.display = 'none';
        if (toggleRulesButton) toggleRulesButton.textContent = 'ルールを表示';
        document.removeEventListener('keydown', keydownHandler);
        console.log("キー入力リスナーを削除しました in showLoginScreen");
        // ★★★ ログイン画面表示時に累計利用者数を取得・表示 ★★★
        fetchAndDisplayTotalUsers();
    }

    function showGameScreen() {
        if (loginScreen) loginScreen.style.display = 'none';
        if (gameScreen) gameScreen.style.display = 'flex';
        if (usernameDisplayElement) usernameDisplayElement.textContent = currentUsername;
        if (menuButton) menuButton.style.display = 'block';
        // ★★★ ゲーム画面では累計利用者数表示を隠す (必要に応じて) ★★★
        if (totalUsersDisplay) totalUsersDisplay.textContent = ''; // または display = 'none'

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
        elements.difficulty.textContent = currentDifficulty; // difficulty は currentResult ではなく、現在のゲーム設定を使う
        elements.personalBest.textContent = personalBest > 0 ? personalBest : '記録なし';

        elements.tableBody.innerHTML = '';
        if (rankingData && Array.isArray(rankingData)) {

            // ランキングデータをソートする (スコア降順 -> 速度降順 -> ミス数昇順)
            rankingData.sort((a, b) => {
                const scoreA = typeof a.score === 'number' ? a.score : -1;
                const scoreB = typeof b.score === 'number' ? b.score : -1;
                if (scoreB !== scoreA) return scoreB - scoreA;

                const speedA = typeof a.speed === 'number' ? a.speed : 0;
                const speedB = typeof b.speed === 'number' ? b.speed : 0;
                if (speedB > speedA) return 1;
                if (speedB < speedA) return -1;

                const missesA = typeof a.misses === 'number' ? a.misses : Infinity;
                const missesB = typeof b.misses === 'number' ? b.misses : Infinity;
                return missesA - missesB;
            });

            if (rankingData.length === 0) {
                 elements.tableBody.innerHTML = '<tr><td colspan="5">まだランキングデータがありません。</td></tr>';
            } else {
                rankingData.forEach((entry, index) => {
                    const row = elements.tableBody.insertRow();
                    row.insertCell().textContent = index + 1;
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
            const rankingData = await fetchRankingData();
            console.log("ランキング取得が完了しました。", { rankingData });

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

                displayRanking(elements, currentResult, personalBest, rankingData);

                const rankingDifficultySpan = document.getElementById('ranking-difficulty-over');
                if (rankingDifficultySpan) rankingDifficultySpan.textContent = currentDifficulty; // 難易度表示を更新

                gameOverModal.style.display = 'flex';
                console.log("ゲームオーバーモーダル表示");

            } else if (isClear) {
                console.warn("ゲームクリア画面の処理は未実装です。");
            } else {
                 console.error("ゲームオーバーモーダルが見つかりません。");
            }

        } catch (error) {
            console.error("ゲーム終了処理中にエラーが発生しました:", error);
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
                displayRanking(elements, currentResult, personalBest, null); // エラー時は null を渡す
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
        // handleGameEnd(score, true);
    }
    function gameOver() {
        console.log("ゲームオーバー処理開始 (gameOver)");
        handleGameEnd(score, false);
    }

    // --- キー入力処理 (keydownHandler) ---
    const keydownHandler = (event) => {
        const isModalVisible = (gameOverModal && gameOverModal.style.display === 'flex');
        if (!isGameActive || isMenuOpen || isModalVisible || !currentWordData.hiragana) {
            console.log("キー入力無視 (非アクティブ or メニュー/モーダル表示中 or 単語未設定)");
            return;
        }

        const key = event.key;

        if (key === 'Backspace') {
            if (typedRomaji.length > 0) {
                typedRomaji = typedRomaji.slice(0, -1);
                updateRomajiDisplay();
                setResult('', '');
                if (romajiHistoryDisplayElement) romajiHistoryDisplayElement.textContent = '最後に押したキー: Backspace';
                console.log("Backspace pressed, typedRomaji:", typedRomaji);
            }
            event.preventDefault();
            return;
        }

        if (!/^[a-z-]$/i.test(key) || key.length !== 1) {
            if (key.toLowerCase() !== 'n') {
                 console.log("無視するキー:", key);
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
        let bestMatch = null;

        for (const romaji in romajiToHiragana) {
            if (typedRomaji.startsWith(romaji)) {
                const hiragana = romajiToHiragana[romaji];
                if (expectedHiragana.startsWith(hiragana)) {
                    if (bestMatch === null || romaji.length > bestMatch.romaji.length) {
                        bestMatch = { romaji, hiragana, length: romaji.length };
                    }
                }
            }
        }

        if (!bestMatch && typedRomaji === 'n' && expectedHiragana.startsWith('ん')) {
            const nextHiraganaIndex = currentHiraganaIndex + 1;
            let processNAsSingleN = false;

            if (nextHiraganaIndex === currentWordData.hiragana.length) {
                processNAsSingleN = true;
            } else {
                let nextRomajiStartsWithVowelYN = false;
                let foundNextRomaji = false;
                const nextHiraganaChar = currentWordData.hiragana.substring(nextHiraganaIndex);

                for (const r in romajiToHiragana) {
                    if (nextHiraganaChar.startsWith(romajiToHiragana[r])) {
                         foundNextRomaji = true;
                         if (/^[aiueoyn]/i.test(r)) {
                             nextRomajiStartsWithVowelYN = true;
                         }
                         break;
                    }
                }
                if (!foundNextRomaji || !nextRomajiStartsWithVowelYN) {
                    processNAsSingleN = true;
                }
            }
            if (processNAsSingleN) {
                bestMatch = { romaji: 'n', hiragana: 'ん', length: 1 };
            }
        }

        if (bestMatch) {
            matchFound = true;
            console.log("マッチ:", bestMatch.romaji, "->", bestMatch.hiragana);
            correctTypedCount += bestMatch.length;
            typedRomajiHistory += typedRomaji.slice(0, bestMatch.length);
            typedRomaji = typedRomaji.slice(bestMatch.length);
            currentHiraganaIndex += bestMatch.hiragana.length;
            updateRomajiDisplay();
            setResult('OK', 'correct');

            if (currentHiraganaIndex === currentWordData.hiragana.length) {
                score++;
                if (scoreDisplayElement) scoreDisplayElement.textContent = `スコア: ${score}`;
                setResult('正解！', 'correct');
                playSound('correct');
                setTimeout(getNewWord, 200);
            } else {
                if (typedRomaji.length > 0) {
                    setResult('入力中...', 'typing');
                } else {
                    setTimeout(() => {
                        if (messageDisplayElement && messageDisplayElement.textContent === 'OK') {
                            setResult('', '');
                        }
                    }, 150);
                }
            }
        } else {
            matchFound = false;
            const canBeValidStart = Object.keys(romajiToHiragana).some(r =>
                r.startsWith(typedRomaji) && expectedHiragana.startsWith(romajiToHiragana[r])
            );

            if (typedRomaji.length > 0) {
                if (canBeValidStart) {
                    setResult('入力中...', 'typing');
                } else {
                    missTypedCount++;
                    setResult('不正解', 'incorrect');
                    console.log("不正解 (無効な入力)、リセット前:", typedRomaji);
                    playSound('incorrect');
                    typedRomaji = typedRomaji.slice(0, -1);
                    updateRomajiDisplay();
                    console.log("不正解、リセット後:", typedRomaji);
                    setTimeout(() => {
                         if (messageDisplayElement && messageDisplayElement.textContent === '不正解') {
                             setResult(typedRomaji.length > 0 ? '入力中...' : '', typedRomaji.length > 0 ? 'typing' : '');
                         }
                     }, 400);
                }
            } else {
                setResult('', '');
            }
        }
    };

    // --- 結果表示の補助関数 ---
    function setResult(message, className) {
        if (messageDisplayElement) {
            messageDisplayElement.textContent = message;
            if (className) {
                messageDisplayElement.className = `message-display ${className}`;
            } else {
                messageDisplayElement.className = 'message-display';
            }
        }
    }

    // --- メニュー関連処理 ---
    function openMenu() {
        if (!isGameActive) return;
        pauseTimer();
        if (difficultySelectMenu) difficultySelectMenu.value = currentDifficulty;
        if (themeSelectMenu) themeSelectMenu.value = currentTheme;
        if (menuModal) menuModal.style.display = 'flex';
        isMenuOpen = true;
        console.log("メニューを開きました");
    }

    function closeMenu() {
        if (menuModal) menuModal.style.display = 'none';
        isMenuOpen = false;
        resumeTimer();
        startTimer();
        console.log("メニューを閉じました");
    }

    function toggleSound() {
        initAudioContext();
        const newState = !isSoundEnabled;
        saveSoundSetting(newState);
        console.log(`効果音を ${newState ? 'ON' : 'OFF'} にしました`);
        if (newState) {
            playSound('toggle_on');
        }
    }


    // --- 効果音再生関数 ---
    const sounds = {
        correct: new Audio('/static/sounds/correct.mp3'),
        incorrect: new Audio('/static/sounds/incorrect.mp3'),
        toggle_on: new Audio('/static/sounds/toggle_on.mp3'),
    };
    Object.values(sounds).forEach(sound => {
        sound.load();
        sound.volume = 0.5;
    });
    function initAudioContext() {
        if (audioContextInitialized) return;
        try {
            const dummySound = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA');
            dummySound.volume = 0;
            dummySound.play().then(() => {
                console.log("Audio context initialized by dummy play.");
                audioContextInitialized = true;
            }).catch(error => {
                console.warn("Dummy sound play failed, audio might require further interaction.", error);
            });
        } catch (e) {
            console.error("Error initializing audio context:", e);
        }
    }
    function playSound(soundName) {
        if (!audioContextInitialized) {
            console.warn(`効果音 ${soundName} 再生スキップ: Audio context not initialized.`);
            initAudioContext();
            return;
        }
        if (isSoundEnabled && sounds[soundName]) {
            sounds[soundName].currentTime = 0;
            sounds[soundName].play().catch(error => {
                console.warn(`効果音 ${soundName} の再生に失敗しました:`, error);
            });
        }
    }


    // --- イベントリスナー設定 ---
    // ログイン画面
    if (loginButton) loginButton.addEventListener('click', login);
    if (usernameInput) {
        usernameInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                login();
            }
        });
    }
    if (difficultySetting) {
        difficultySetting.addEventListener('change', (event) => {
            if (event.target.type === 'radio' && event.target.checked) {
                console.log(`ログイン画面で難易度 ${event.target.value} を選択`);
            }
        });
    }
    if (toggleRulesButton && rulesSection) {
        toggleRulesButton.addEventListener('click', () => {
            const isHidden = rulesSection.style.display === 'none' || rulesSection.style.display === '';
            rulesSection.style.display = isHidden ? 'block' : 'none';
            toggleRulesButton.textContent = isHidden ? 'ルールを隠す' : 'ルールを表示';
        });
    }

    // ゲーム画面
    if (menuButton) menuButton.addEventListener('click', openMenu);

    // ゲームオーバー画面
    if (retryButton) retryButton.addEventListener('click', restartGame);
    if (backToLoginButton) backToLoginButton.addEventListener('click', logout);
    if (closeGameOverButton) closeGameOverButton.addEventListener('click', () => {
        if (gameOverModal) gameOverModal.style.display = 'none';
    });

    // メニューモーダル
    if (closeMenuButton) closeMenuButton.addEventListener('click', closeMenu);
    if (soundToggleButtonMenu) soundToggleButtonMenu.addEventListener('click', toggleSound);
    if (logoutButtonMenu) logoutButtonMenu.addEventListener('click', logout);
    if (menuModal) {
        menuModal.addEventListener('click', (event) => {
            if (event.target === menuModal) {
                closeMenu();
            }
        });
    }
    if (difficultySelectMenu) {
        difficultySelectMenu.addEventListener('change', (event) => {
            saveDifficulty(event.target.value);
            console.log("メニューで難易度変更。次のゲームから適用されます。");
        });
    }
    if (themeSelectMenu) {
        themeSelectMenu.addEventListener('change', (event) => {
            saveTheme(event.target.value);
            console.log("メニューでテーマ変更。次のゲームから適用されます。");
        });
    }


    // --- 初期化処理 ---
    // ★★★ ページ読み込み時に累計利用者数を取得・表示 ★★★
    fetchAndDisplayTotalUsers();
    checkLoginStatus(); // ログイン状態を確認して画面を表示

}); // DOMContentLoaded の終わり
