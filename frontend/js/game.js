// Frontend Game Controller
class GameController {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.currentCategory = 'Anatomia';
        this.isInitialized = false;
    }

    async init() {
        try {
            console.log("Inicializando controlador...");
            
            // Testa a conexão com o servidor primeiro
            await this.healthCheck();
            
            // Carrega categorias disponíveis
            const categories = await this.getCategories();
            console.log("Categorias disponíveis:", categories);
            
            if (categories.length > 0) {
                this.currentCategory = categories[0];
            }
            
            this.isInitialized = true;
            console.log("Controlador inicializado com sucesso");
            return true;
            
        } catch (error) {
            console.error('Erro na inicialização do controlador:', error);
            this.isInitialized = false;
            return false;
        }
    }

    async healthCheck() {
        try {
            const response = await fetch(`${this.baseURL}/health`);
            const data = await response.json();
            
            if (!data.success) {
                throw new Error('Servidor não está respondendo corretamente');
            }
            
            console.log("Health check:", data);
            return data;
        } catch (error) {
            throw new Error(`Não foi possível conectar ao servidor: ${error.message}`);
        }
    }

    async apiCall(endpoint, options = {}) {
        try {
            console.log(`Fazendo requisição para: ${endpoint}`);
            const response = await fetch(`${this.baseURL}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            
            if (!data.success) {
                throw new Error(data.error || 'Erro na requisição');
            }
            
            return data;
        } catch (error) {
            console.error(`Erro na API call ${endpoint}:`, error);
            throw error;
        }
    }

    async startNewGame(category = null) {
        if (category) {
            this.currentCategory = category;
        }
        
        const data = await this.apiCall('/game/start', {
            method: 'POST',
            body: JSON.stringify({ category: this.currentCategory })
        });
        
        return data;
    }

    async guessLetter(letter) {
        const data = await this.apiCall('/game/guess', {
            method: 'POST',
            body: JSON.stringify({ letter })
        });
        
        return data;
    }

    async getHint() {
        const data = await this.apiCall('/game/hint', {
            method: 'POST'
        });
        
        return data;
    }

    async getGameState() {
        const data = await this.apiCall('/game/state');
        return data;
    }

    async getCategories() {
        try {
            const data = await this.apiCall('/categories');
            return data.categories || [];
        } catch (error) {
            console.error('Erro ao carregar categorias:', error);
            return ['Anatomia', 'Biologia', 'Medicina', 'Programacao'];
        }
    }

    async getScores() {
        try {
            const data = await this.apiCall('/scores');
            return data.scores || [];
        } catch (error) {
            console.error('Erro ao carregar placar:', error);
            return [];
        }
    }

    async saveScore(name, score) {
        try {
            const data = await this.apiCall('/scores', {
                method: 'POST',
                body: JSON.stringify({ name, score })
            });
            return data.success;
        } catch (error) {
            console.error('Erro ao salvar pontuação:', error);
            return false;
        }
    }

    setCategory(category) {
        this.currentCategory = category;
    }

    getCurrentCategory() {
        return this.currentCategory;
    }
}