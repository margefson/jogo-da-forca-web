from flask import Flask, request, jsonify
from flask_cors import CORS
import random
import os

app = Flask(__name__)
CORS(app)

# Configurações
DATA_DIR = os.path.join(os.path.dirname(__file__), 'data')
WORDS_FILE = os.path.join(DATA_DIR, 'palavras.txt')
SCORES_FILE = os.path.join(DATA_DIR, 'placar.txt')

# Garante que o diretório data existe
os.makedirs(DATA_DIR, exist_ok=True)

class FileManager:
    """Versão simplificada do FileManager para web"""
    
    @staticmethod
    def read_words():
        """Lê palavras do arquivo"""
        try:
            with open(WORDS_FILE, 'r', encoding='utf-8') as file:
                return [line.strip().lower() for line in file if line.strip()]
        except FileNotFoundError:
            # Retorna palavras padrão se o arquivo não existir
            default_words = [
                'python', 'programacao', 'computador', 'algoritmo', 'variavel',
                'funcao', 'classe', 'objeto', 'heranca', 'polimorfismo'
            ]
            # Cria o arquivo com palavras padrão
            with open(WORDS_FILE, 'w', encoding='utf-8') as file:
                for word in default_words:
                    file.write(word + '\n')
            return default_words
    
    @staticmethod
    def save_score(player_name, score):
        """Salva pontuação no arquivo de placar"""
        with open(SCORES_FILE, 'a', encoding='utf-8') as file:
            file.write(f"{player_name}: {score}\n")
    
    @staticmethod
    def read_scores():
        """Lê o placar do arquivo"""
        try:
            with open(SCORES_FILE, 'r', encoding='utf-8') as file:
                return [line.strip() for line in file if line.strip()]
        except FileNotFoundError:
            return []

class GameSession:
    """Representa uma sessão de jogo"""
    
    def __init__(self, session_id, player_name):
        self.session_id = session_id
        self.player_name = player_name
        self.word = ""
        self.correct_letters = set()
        self.used_letters = set()
        self.errors = 0
        self.max_errors = 6
        self.game_over = False
        self.won = False
        self.score = 0
        
    def start_new_game(self):
        """Inicia um novo jogo"""
        words = FileManager.read_words()
        self.word = random.choice(words) if words else "python"
        self.correct_letters = set()
        self.used_letters = set()
        self.errors = 0
        self.game_over = False
        self.won = False
        
        return {
            "word_length": len(self.word),
            "max_errors": self.max_errors,
            "session_id": self.session_id
        }
    
    def make_guess(self, letter):
        """Faz uma tentativa de letra"""
        if self.game_over:
            return {"error": "Jogo já terminou"}
        
        if letter in self.used_letters:
            return {"error": "Letra já usada"}
        
        self.used_letters.add(letter)
        
        if letter in self.word:
            self.correct_letters.add(letter)
            # Verifica se ganhou
            if all(l in self.correct_letters for l in self.word):
                self.won = True
                self.game_over = True
                self.score = 10 + len(self.word)  # Pontuação base + bônus por letra
                FileManager.save_score(self.player_name, self.score)
        else:
            self.errors += 1
            if self.errors >= self.max_errors:
                self.game_over = True
        
        return self.get_game_state()
    
    def get_game_state(self):
        """Retorna o estado atual do jogo"""
        word_state = [letter if letter in self.correct_letters else '_' for letter in self.word]
        
        return {
            "word_state": word_state,
            "word": self.word if self.game_over else None,  # Só revela a palavra se o jogo acabou
            "correct_word": self.word,
            "used_letters": list(self.used_letters),
            "correct_letters": list(self.correct_letters),
            "errors": self.errors,
            "max_errors": self.max_errors,
            "game_over": self.game_over,
            "won": self.won,
            "score": self.score
        }

# Armazena sessões ativas (em produção usar Redis ou database)
game_sessions = {}

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint de saúde da API"""
    return jsonify({"status": "OK", "message": "API do Jogo da Forca funcionando!"})

@app.route('/api/new-game', methods=['POST'])
def new_game():
    """Cria um novo jogo"""
    try:
        data = request.json or {}
        player_name = data.get('player_name', 'Jogador').strip()
        if not player_name:
            player_name = 'Jogador'
        
        # Cria ID único para a sessão
        session_id = f"{player_name}_{os.urandom(4).hex()}"
        
        # Cria nova sessão
        game_session = GameSession(session_id, player_name)
        game_sessions[session_id] = game_session
        
        # Inicia o jogo
        game_info = game_session.start_new_game()
        
        return jsonify({
            **game_info,
            "player_name": player_name,
            "message": "Jogo iniciado com sucesso!"
        })
        
    except Exception as e:
        return jsonify({"error": f"Erro ao criar jogo: {str(e)}"}), 500

@app.route('/api/guess', methods=['POST'])
def make_guess():
    """Faz uma tentativa de letra"""
    try:
        data = request.json or {}
        session_id = data.get('session_id')
        letter = data.get('letter', '').lower().strip()
        
        if not session_id:
            return jsonify({"error": "Session ID é obrigatório"}), 400
        
        if session_id not in game_sessions:
            return jsonify({"error": "Sessão não encontrada"}), 404
        
        if len(letter) != 1 or not letter.isalpha():
            return jsonify({"error": "Digite apenas uma letra"}), 400
        
        game_session = game_sessions[session_id]
        result = game_session.make_guess(letter)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"Erro ao processar tentativa: {str(e)}"}), 500

@app.route('/api/game-state/<session_id>', methods=['GET'])
def get_game_state(session_id):
    """Retorna o estado atual do jogo"""
    try:
        if session_id not in game_sessions:
            return jsonify({"error": "Sessão não encontrada"}), 404
        
        game_session = game_sessions[session_id]
        return jsonify(game_session.get_game_state())
        
    except Exception as e:
        return jsonify({"error": f"Erro ao obter estado do jogo: {str(e)}"}), 500

@app.route('/api/scores', methods=['GET'])
def get_scores():
    """Retorna o placar"""
    try:
        scores = FileManager.read_scores()
        return jsonify({"scores": scores[-10:]})  # Últimos 10 scores
    except Exception as e:
        return jsonify({"error": f"Erro ao carregar placar: {str(e)}"}), 500

@app.route('/api/words', methods=['GET'])
def get_words():
    """Retorna a lista de palavras disponíveis"""
    try:
        words = FileManager.read_words()
        return jsonify({
            "words": words,
            "total_words": len(words)
        })
    except Exception as e:
        return jsonify({"error": f"Erro ao carregar palavras: {str(e)}"}), 500

@app.route('/api/session/<session_id>', methods=['DELETE'])
def end_game(session_id):
    """Finaliza uma sessão de jogo"""
    try:
        if session_id in game_sessions:
            del game_sessions[session_id]
            return jsonify({"message": "Sessão finalizada"})
        else:
            return jsonify({"error": "Sessão não encontrada"}), 404
    except Exception as e:
        return jsonify({"error": f"Erro ao finalizar sessão: {str(e)}"}), 500

if __name__ == '__main__':
    print("🎮 Iniciando API do Jogo da Forca...")
    print("📁 Diretório de dados:", DATA_DIR)
    print("🔧 Verificando arquivos de dados...")
    
    # Garante que os arquivos existem
    FileManager.read_words()  # Isso cria o arquivo se não existir
    
    print("🚀 Servidor iniciando na porta 5000...")
    print("📋 Endpoints disponíveis:")
    print("   POST /api/new-game - Iniciar novo jogo")
    print("   POST /api/guess - Fazer tentativa")
    print("   GET  /api/scores - Ver placar")
    print("   GET  /api/health - Status da API")
    
    app.run(debug=True, host='0.0.0.0', port=5000)