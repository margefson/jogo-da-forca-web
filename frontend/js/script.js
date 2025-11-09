// Interface do Jogo - Integração com backend
class GameInterface {
    constructor() {
        this.controller = new GameController();
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log("Inicializando interface do jogo...");
            
            // Configura interface básica primeiro
            this.createKeyboard();
            this.setupEventListeners();
            
            // Tenta inicializar o controlador
            const success = await this.controller.init();
            if (!success) {
                throw new Error('Falha ao inicializar controlador');
            }

            // Carrega categorias
            await this.loadCategories();
            
            // Inicia primeiro jogo
            await this.newGame();
            
            this.isInitialized = true;
            console.log('Jogo inicializado com sucesso');
            
        } catch (error) {
            console.error('Erro na inicialização:', error);
            this.showError('Erro ao carregar o jogo. Verifique se o servidor está rodando na porta 5000.');
            
            // Fallback: mostra categorias padrão
            this.showFallbackCategories();
        }
    }

    setupEventListeners() {
        // Teclado físico
        document.addEventListener('keydown', (event) => {
            if (event.key.match(/[a-z]/i)) {
                this.handleGuess(event.key.toUpperCase());
            }
        });

        // Botões
        document.getElementById('newGameBtn').addEventListener('click', () => {
            this.newGame();
        });

        document.getElementById('hintBtn').addEventListener('click', () => {
            this.hint();
        });

        // Modal de game over
        document.querySelector('.game-over .btn-primary').addEventListener('click', () => {
            this.newGame();
        });
    }

    async loadCategories() {
        try {
            console.log("Carregando categorias...");
            const categories = await this.controller.getCategories();
            console.log("Categorias recebidas:", categories);
            
            const container = document.querySelector('.category-buttons');
            container.innerHTML = '';

            if (categories && categories.length > 0) {
                categories.forEach(category => {
                    const button = document.createElement('button');
                    button.className = `category-btn ${category === this.controller.getCurrentCategory() ? 'active' : ''}`;
                    button.textContent = category;
                    button.addEventListener('click', (e) => this.setCategory(category, e));
                    container.appendChild(button);
                });
            } else {
                this.showFallbackCategories();
            }
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            this.showFallbackCategories();
        }
    }

    showFallbackCategories() {
        // Fallback para categorias padrão
        const fallbackCategories = ['Anatomia', 'Biologia', 'Medicina', 'Programacao'];
        const container = document.querySelector('.category-buttons');
        container.innerHTML = '';

        fallbackCategories.forEach(category => {
            const button = document.createElement('button');
            button.className = `category-btn ${category === 'Anatomia' ? 'active' : ''}`;
            button.textContent = category;
            button.addEventListener('click', (e) => this.setCategory(category, e));
            container.appendChild(button);
        });

        this.controller.setCategory('Anatomia');
    }

    async setCategory(category, event = null) {
        console.log(`Mudando categoria para: ${category}`);
        this.controller.setCategory(category);
        
        // Atualiza botões
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            // Encontra o botão correspondente à categoria
            const buttons = document.querySelectorAll('.category-btn');
            buttons.forEach(btn => {
                if (btn.textContent === category) {
                    btn.classList.add('active');
                }
            });
        }
        
        // Reinicia jogo com nova categoria
        await this.newGame();
    }

    createKeyboard() {
        const keyboard = document.getElementById('keyboard');
        keyboard.innerHTML = '';
        
        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        
        letters.split('').forEach(letter => {
            const key = document.createElement('div');
            key.className = 'key';
            key.textContent = letter;
            key.addEventListener('click', () => this.handleGuess(letter));
            keyboard.appendChild(key);
        });
    }

    async handleGuess(letter) {
        if (!this.isInitialized) {
            this.showMessage('Jogo ainda não inicializado', 'warning');
            return;
        }

        try {
            console.log(`Processando palpite: ${letter}`);
            const result = await this.controller.guessLetter(letter);
            
            // Atualizar teclado
            this.updateKeyboard(letter, result.result.correct);
            
            // Atualizar display
            this.updateDisplay(result.result.game_state, result.stats);
            
            // Verificar fim de jogo
            if (result.result.game_state.is_game_over) {
                await this.handleGameEnd(result.result.game_state, result.stats);
            }
            
        } catch (error) {
            console.error('Erro no palpite:', error);
            if (error.message.includes('já terminou')) {
                this.showMessage('O jogo já terminou! Inicie um novo jogo.', 'warning');
            } else if (error.message.includes('já utilizada')) {
                this.showMessage('Letra já utilizada!', 'warning');
            } else {
                this.showMessage('Erro ao processar palpite. Tente novamente.', 'warning');
            }
        }
    }

    updateKeyboard(letter, isCorrect) {
        const keyElement = Array.from(document.querySelectorAll('.key')).find(
            key => key.textContent === letter
        );
        
        if (keyElement) {
            keyElement.classList.add('used');
            keyElement.classList.add(isCorrect ? 'correct' : 'wrong');
        }
    }

    updateDisplay(gameState, stats) {
        // Display da palavra
        let display = '';
        if (gameState.word) {
            gameState.word.split('').forEach(letter => {
                if (gameState.guessed_letters.includes(letter)) {
                    display += `<span class="letter">${letter}</span>`;
                } else {
                    display += `<span class="letter">&nbsp;</span>`;
                }
            });
        }
        document.getElementById('wordDisplay').innerHTML = display;

        // Estatísticas - CORREÇÃO: garantir que não passe de 6/6
        const displayErrors = Math.min(gameState.errors, gameState.max_errors);
        document.getElementById('errors').textContent = `${displayErrors}/${gameState.max_errors}`;
        document.getElementById('score').textContent = stats.score || 0;
        document.getElementById('streak').textContent = stats.streak || 0;

        // Display anatômico
        const anatomyDisplay = document.getElementById('anatomyDisplay');
        if (gameState.anatomy_stage) {
            anatomyDisplay.innerHTML = `<img src="../img/${gameState.anatomy_stage}" alt="Estágio ${gameState.errors + 1}" style="max-height: 250px;">`;
        }

        // Progresso dos estágios
        this.updateProgressStages(gameState.errors);

        // Desabilitar teclado se o jogo terminou
        this.toggleKeyboard(!gameState.is_game_over);
    }

    updateProgressStages(errors) {
        document.querySelectorAll('.stage-indicator').forEach((indicator, index) => {
            if (index < errors) {
                indicator.classList.add('active');
            } else {
                indicator.classList.remove('active');
            }
        });
    }

    toggleKeyboard(enabled) {
        const keys = document.querySelectorAll('.key');
        keys.forEach(key => {
            if (enabled) {
                key.style.pointerEvents = 'auto';
                key.style.opacity = '1';
            } else {
                key.style.pointerEvents = 'none';
                key.style.opacity = '0.6';
            }
        });

        // Desabilitar botão de dica também
        const hintBtn = document.getElementById('hintBtn');
        if (hintBtn) {
            hintBtn.disabled = !enabled;
        }
    }

    async handleGameEnd(gameState, stats) {
        console.log("Jogo terminado:", gameState.is_winner ? "Vitória" : "Derrota");
        if (gameState.is_winner) {
            this.showGameOver(true, gameState.word, stats.score);
        } else {
            this.showGameOver(false, gameState.word, stats.score);
        }
    }

    async newGame() {
        if (!this.isInitialized) {
            this.showMessage('Aguarde a inicialização do jogo', 'warning');
            return;
        }

        try {
            console.log("Iniciando novo jogo...");
            const result = await this.controller.startNewGame();
            this.resetKeyboard();
            this.updateDisplay(result.game_state, result.stats);
            this.hideGameOver();
            this.toggleKeyboard(true); // Reabilita o teclado
            this.showMessage('Novo jogo iniciado!', 'info');
        } catch (error) {
            console.error('Erro ao iniciar novo jogo:', error);
            this.showError('Erro ao iniciar novo jogo. Tente novamente.');
        }
    }

    resetKeyboard() {
        document.querySelectorAll('.key').forEach(key => {
            key.className = 'key';
        });
    }

    async hint() {
        if (!this.isInitialized) {
            this.showMessage('Jogo ainda não inicializado', 'warning');
            return;
        }

        try {
            const result = await this.controller.getHint();
            this.updateKeyboard(result.result.letter, result.result.correct);
            this.updateDisplay(result.result.game_state, result.stats);
            
            if (result.result.game_state.is_game_over) {
                await this.handleGameEnd(result.result.game_state, result.stats);
            }
        } catch (error) {
            console.error('Erro na dica:', error);
            if (error.message.includes('insufficient_score')) {
                this.showMessage('Pontuação insuficiente para dica!', 'warning');
            } else {
                this.showMessage('Erro ao obter dica. Tente novamente.', 'warning');
            }
        }
    }

    showGameOver(isWin, word, score) {
        const gameOver = document.getElementById('gameOver');
        const gameResult = document.getElementById('gameResult');
        const gameMessage = document.getElementById('gameMessage');
        const correctWord = document.getElementById('correctWord');

        if (isWin) {
            gameResult.textContent = 'Você Venceu!';
            gameResult.className = 'win';
            gameMessage.textContent = `Parabéns! Você descobriu a palavra:`;
        } else {
            gameResult.textContent = 'Game Over!';
            gameResult.className = 'lose';
            gameMessage.textContent = `A palavra era:`;
        }

        correctWord.textContent = word;
        gameOver.style.display = 'flex';

        // Mostrar opção para salvar pontuação se for alta
        if (score > 100) {
            this.showScoreSaveOption(score);
        }
    }

    showScoreSaveOption(score) {
        setTimeout(() => {
            const name = prompt(`Pontuação alta: ${score} pontos! Digite seu nome para o placar:`);
            if (name && name.trim()) {
                this.controller.saveScore(name.trim(), score);
            }
        }, 1000);
    }

    hideGameOver() {
        document.getElementById('gameOver').style.display = 'none';
    }

    showMessage(message, type = 'info') {
        // Implementação simples de mensagem
        console.log(`${type}: ${message}`);
        alert(message); // Substitua por um toast mais elegante se preferir
    }

    showError(message) {
        console.error(message);
        this.showMessage(message, 'error');
    }
}

// Inicializar o jogo
const gameInterface = new GameInterface();

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM carregado, inicializando jogo...");
    gameInterface.init();
});