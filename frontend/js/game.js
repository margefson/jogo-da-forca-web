class HangmanWeb {
    constructor() {
        this.apiBase = 'http://localhost:5000/api';
        this.currentSession = null;
        this.gameState = null;
        
        this.initializeEventListeners();
        this.loadScores();
    }
    
    initializeEventListeners() {
        // Botões da tela inicial
        document.getElementById('startBtn').addEventListener('click', () => this.startGame());
        document.getElementById('showScores').addEventListener('click', () => this.showScores());
        
        // Controles do jogo
        document.getElementById('new-game-btn').addEventListener('click', () => this.startGame());
        document.getElementById('quit-game').addEventListener('click', () => this.showStartScreen());
        document.getElementById('playAgainBtn').addEventListener('click', () => this.startGame());
        
        // Teclado físico
        document.addEventListener('keydown', (e) => this.handlePhysicalKeyboard(e));
    }
    
    async startGame() {
        const playerName = document.getElementById('playerName').value || 'Jogador';
        
        try {
            const response = await fetch(`${this.apiBase}/new-game`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ player_name: playerName })
            });
            
            if (!response.ok) throw new Error('Erro ao iniciar jogo');
            
            this.currentSession = await response.json();
            this.showGameScreen();
            this.initializeGame();
            
        } catch (error) {
            console.error('Erro:', error);
            alert('Erro ao conectar com o servidor');
        }
    }
    
    showGameScreen() {
        document.getElementById('start-screen').classList.add('d-none');
        document.getElementById('game-screen').classList.remove('d-none');
    }
    
    showStartScreen() {
        document.getElementById('start-screen').classList.remove('d-none');
        document.getElementById('game-screen').classList.add('d-none');
    }
    
    initializeGame() {
        this.createVirtualKeyboard();
        this.updatePlayerInfo();
        this.updateHangmanDisplay(0);
        this.updateWordDisplay(Array(this.currentSession.word_length).fill('_'));
    }
    
    createVirtualKeyboard() {
        const keyboard = document.getElementById('virtual-keyboard');
        const letters = 'abcdefghijklmnopqrstuvwxyz'.split('');
        
        keyboard.innerHTML = letters.map(letter => `
            <button class="btn key-btn" data-letter="${letter}">
                ${letter.toUpperCase()}
            </button>
        `).join('');
        
        // Adiciona event listeners aos botões do teclado virtual
        keyboard.querySelectorAll('.key-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.makeGuess(e.target.dataset.letter);
            });
        });
    }
    
    async makeGuess(letter) {
        if (!this.currentSession) return;
        
        try {
            const response = await fetch(`${this.apiBase}/guess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    session_id: this.currentSession.session_id,
                    letter: letter
                })
            });
            
            if (!response.ok) throw new Error('Erro ao fazer tentativa');
            
            const result = await response.json();
            
            if (result.error) {
                alert(result.error);
                return;
            }
            
            this.updateGameState(result);
            
        } catch (error) {
            console.error('Erro:', error);
        }
    }
    
    updateGameState(gameState) {
        this.gameState = gameState;
        
        // Atualiza interface
        this.updateHangmanDisplay(gameState.errors);
        this.updateWordDisplay(gameState.word_state);
        this.updateUsedLetters(gameState.used_letters);
        this.updateKeyboard(gameState.used_letters, gameState.correct_letters);
        
        // Verifica fim de jogo
        if (gameState.game_over) {
            this.showGameOver(gameState.won, gameState.correct_word);
        }
    }
    
    updateHangmanDisplay(errors) {
        const hangmanStages = [
            `⠀
               -----
               |   |
                   |
                   |
                   |
                   |
            =========`,
            `⠀
               -----
               |   |
               O   |
                   |
                   |
                   |
            =========`,
            `⠀
               -----
               |   |
               O   |
               |   |
                   |
                   |
            =========`,
            `⠀
               -----
               |   |
               O   |
              /|   |
                   |
                   |
            =========`,
            `⠀
               -----
               |   |
               O   |
              /|\\  |
                   |
                   |
            =========`,
            `⠀
               -----
               |   |
               O   |
              /|\\  |
              /    |
                   |
            =========`,
            `⠀
               -----
               |   |
               O   |
              /|\\  |
              / \\  |
                   |
            =========`
        ];
        
        document.getElementById('hangman-display').textContent = hangmanStages[errors];
        document.getElementById('errors').textContent = errors;
    }
    
    updateWordDisplay(wordState) {
        const wordDisplay = wordState.join(' ');
        document.getElementById('word-display').textContent = wordDisplay;
    }
    
    updateUsedLetters(usedLetters) {
        const usedLettersDiv = document.getElementById('used-letters');
        if (usedLetters && usedLetters.length > 0) {
            usedLettersDiv.innerHTML = usedLetters.map(letter => 
                `<span class="used-letter">${letter.toUpperCase()}</span>`
            ).join('');
        } else {
            usedLettersDiv.innerHTML = '<em>Nenhuma letra usada ainda</em>';
        }
    }
    
    updateKeyboard(usedLetters = [], correctLetters = []) {
        document.querySelectorAll('.key-btn').forEach(btn => {
            const letter = btn.dataset.letter;
            
            if (usedLetters.includes(letter)) {
                btn.disabled = true;
                if (correctLetters.includes(letter)) {
                    btn.classList.add('correct');
                } else {
                    btn.classList.add('incorrect');
                }
            } else {
                btn.disabled = false;
                btn.classList.remove('correct', 'incorrect');
            }
        });
    }
    
    showGameOver(won, correctWord) {
        const modal = new bootstrap.Modal(document.getElementById('gameOverModal'));
        const title = document.getElementById('gameOverTitle');
        const icon = document.getElementById('gameOverIcon');
        const message = document.getElementById('gameOverMessage');
        const correctWordEl = document.getElementById('correctWord');
        
        if (won) {
            title.textContent = 'Parabéns! 🎉';
            icon.className = 'fas fa-trophy text-success';
            message.textContent = 'Você venceu!';
        } else {
            title.textContent = 'Fim de Jogo 💀';
            icon.className = 'fas fa-skull-crossbones text-danger';
            message.textContent = 'A forca está completa!';
        }
        
        correctWordEl.textContent = `Palavra correta: ${correctWord}`;
        modal.show();
    }
    
    async loadScores() {
        try {
            const response = await fetch(`${this.apiBase}/scores`);
            const data = await response.json();
            this.displayScores(data.scores);
        } catch (error) {
            console.error('Erro ao carregar placar:', error);
        }
    }
    
    displayScores(scores) {
        const scoresList = document.getElementById('scores-list');
        
        if (!scores || scores.length === 0) {
            scoresList.innerHTML = '<p class="text-muted">Nenhuma pontuação ainda</p>';
            return;
        }
        
        scoresList.innerHTML = scores.map((score, index) => `
            <div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                <span>${index + 1}. ${score}</span>
            </div>
        `).join('');
    }
    
    showScores() {
        this.loadScores();
        const modal = new bootstrap.Modal(document.getElementById('scoresModal'));
        modal.show();
    }
    
    handlePhysicalKeyboard(event) {
        if (event.key.length === 1 && event.key.match(/[a-z]/i)) {
            this.makeGuess(event.key.toLowerCase());
        }
    }
    
    updatePlayerInfo() {
        const playerName = document.getElementById('playerName').value || 'Jogador';
        document.getElementById('player-info').textContent = playerName;
    }
}

// Inicializa o jogo quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    window.hangmanGame = new HangmanWeb();
});