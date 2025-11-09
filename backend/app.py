from flask import Flask, jsonify, request
from flask_cors import CORS
import os
from game.game_logic import HangmanGame

app = Flask(__name__)
CORS(app)  # Permite requisições do frontend

# Configurações
WORDS_FILE = os.path.join('data', 'palavras.txt')
SCORES_FILE = os.path.join('data', 'placar.txt')

# Instância do jogo
game = HangmanGame(WORDS_FILE)

# Inicializa o jogo
def initialize_game():
    print("Inicializando jogo...")
    success = game.initialize()
    if success:
        print("Jogo inicializado com sucesso!")
        categories = game.word_loader.get_categories()
        print(f"Categorias disponíveis: {categories}")
    else:
        print("Falha ao inicializar o jogo")
    return success

# Chama a inicialização
initialize_game()

@app.route('/api/game/start', methods=['POST'])
def start_game():
    """Inicia um novo jogo"""
    try:
        data = request.get_json() or {}
        category = data.get('category')
        
        print(f"Iniciando novo jogo com categoria: {category}")  # Debug
        
        if game.start_new_game(category):
            game_state = game.get_game_state()
            return jsonify({
                "success": True,
                "game_state": game_state,
                "stats": game.get_stats()
            })
        else:
            return jsonify({
                "success": False,
                "error": "Não foi possível iniciar um novo jogo"
            }), 400
            
    except Exception as e:
        print(f"Erro em start_game: {e}")  # Debug
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}"
        }), 500

@app.route('/api/game/guess', methods=['POST'])
def make_guess():
    """Processa um palpite de letra"""
    try:
        data = request.get_json()
        if not data or 'letter' not in data:
            return jsonify({
                "success": False,
                "error": "Letra não fornecida"
            }), 400
            
        letter = data['letter']
        print(f"Processando palpite: {letter}")  # Debug
        
        result = game.guess_letter(letter)
        
        if not result['valid']:
            error_msg = {
                'already_used': 'Letra já utilizada',
                'invalid_letter': 'Letra inválida',
                'game_over': 'Jogo já terminou'
            }.get(result['reason'], 'Erro desconhecido')
            
            return jsonify({
                "success": False,
                "error": error_msg
            }), 400
            
        return jsonify({
            "success": True,
            "result": result,
            "stats": game.get_stats()
        })
        
    except Exception as e:
        print(f"Erro em make_guess: {e}")  # Debug
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}"
        }), 500

@app.route('/api/game/hint', methods=['POST'])
def get_hint():
    """Fornece uma dica"""
    try:
        result = game.get_hint()
        
        if not result['valid']:
            return jsonify({
                "success": False,
                "error": result.get('reason', 'Não foi possível fornecer dica')
            }), 400
            
        return jsonify({
            "success": True,
            "result": result,
            "stats": game.get_stats()
        })
        
    except Exception as e:
        print(f"Erro em get_hint: {e}")  # Debug
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}"
        }), 500

@app.route('/api/game/state', methods=['GET'])
def get_game_state():
    """Retorna o estado atual do jogo"""
    try:
        return jsonify({
            "success": True,
            "game_state": game.get_game_state(),
            "stats": game.get_stats()
        })
    except Exception as e:
        print(f"Erro em get_game_state: {e}")  # Debug
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}"
        }), 500

@app.route('/api/categories', methods=['GET'])
def get_categories():
    """Retorna a lista de categorias disponíveis"""
    try:
        categories = game.word_loader.get_categories()
        print(f"Retornando categorias: {categories}")  # Debug
        return jsonify({
            "success": True,
            "categories": categories
        })
    except Exception as e:
        print(f"Erro em get_categories: {e}")  # Debug
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}"
        }), 500

@app.route('/api/scores', methods=['GET'])
def get_scores():
    """Retorna o placar de melhores pontuações"""
    try:
        scores = []
        if os.path.exists(SCORES_FILE):
            with open(SCORES_FILE, 'r', encoding='utf-8') as file:
                for line in file:
                    if ',' in line:
                        name, score = line.strip().split(',')
                        scores.append({"name": name, "score": int(score)})
        
        # Ordena por pontuação (decrescente)
        scores.sort(key=lambda x: x['score'], reverse=True)
        return jsonify({"success": True, "scores": scores[:10]})
        
    except Exception as e:
        print(f"Erro em get_scores: {e}")  # Debug
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}"
        }), 500

@app.route('/api/scores', methods=['POST'])
def save_score():
    """Salva uma nova pontuação no placar"""
    try:
        data = request.get_json()
        if not data or 'name' not in data or 'score' not in data:
            return jsonify({
                "success": False,
                "error": "Dados incompletos"
            }), 400
            
        name = data['name']
        score = data['score']
        
        # Adiciona ao arquivo
        with open(SCORES_FILE, 'a', encoding='utf-8') as file:
            file.write(f"{name},{score}\n")
            
        return jsonify({"success": True})
        
    except Exception as e:
        print(f"Erro em save_score: {e}")  # Debug
        return jsonify({
            "success": False,
            "error": f"Erro interno: {str(e)}"
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Endpoint para verificar se o servidor está rodando"""
    categories_loaded = len(game.word_loader.get_categories()) > 0
    return jsonify({
        "success": True,
        "message": "Servidor rodando",
        "categories_loaded": categories_loaded,
        "categories_count": len(game.word_loader.get_categories())
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)