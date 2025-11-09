import os
import json
from typing import Dict, List, Set
from .utils.word_loader import WordLoader

class HangmanGame:
    def __init__(self, words_file: str):
        self.word_loader = WordLoader(words_file)
        self.current_word = ""
        self.guessed_letters: Set[str] = set()
        self.wrong_letters: Set[str] = set()
        self.max_errors = 6
        self.errors = 0
        self.score = 0
        self.streak = 0
        self.current_category = "Anatomia"
        self.game_active = True  # Novo campo para controlar estado do jogo
        
        # Estágios anatômicos - nomes dos arquivos de imagem
        self.anatomy_stages = [
            "forca0.png", # estrtura da forca
            "esqueleto1.png",  # Só a cabeça
            "esqueleto2.png",  # Cabeça + tronco
            "esqueleto3.png",  # + braço esquerdo
            "esqueleto4.png",  # + braço direito
            "esqueleto5.png",  # + perna esquerda
            "esqueleto6.png"   # Completo
        ]
        
    def initialize(self) -> bool:
        """Inicializa o jogo carregando as palavras"""
        return self.word_loader.load_words()
        
    def start_new_game(self, category: str = None) -> bool:
        """Inicia um novo jogo"""
        if category:
            self.current_category = category
            
        self.current_word = self.word_loader.get_random_word(self.current_category)
        if not self.current_word:
            return False
            
        self.guessed_letters = set()
        self.wrong_letters = set()
        self.errors = 0
        self.game_active = True  # Reinicia o estado do jogo
        
        return True
        
    def guess_letter(self, letter: str) -> Dict:
        """Processa um palpite de letra"""
        if not self.game_active:
            return {"valid": False, "reason": "game_over"}
            
        if not letter or len(letter) != 1:
            return {"valid": False, "reason": "invalid_letter"}
            
        upper_letter = letter.upper()
        
        # Verifica se a letra já foi usada
        if upper_letter in self.guessed_letters or upper_letter in self.wrong_letters:
            return {"valid": False, "reason": "already_used"}
            
        # Verifica se a letra está na palavra
        if upper_letter in self.current_word:
            self.guessed_letters.add(upper_letter)
            
            # Verifica se ganhou após acertar a letra
            is_winner = self._check_winner()
            game_state = self.get_game_state()
            
            if is_winner:
                self.game_active = False
                self.update_score(True)
                
            return {
                "valid": True,
                "correct": True,
                "letter": upper_letter,
                "game_state": game_state
            }
        else:
            self.wrong_letters.add(upper_letter)
            self.errors += 1
            
            # Verifica se perdeu após errar a letra
            is_game_over = self.errors >= self.max_errors
            game_state = self.get_game_state()
            
            if is_game_over:
                self.game_active = False
                self.update_score(False)
                
            return {
                "valid": True,
                "correct": False,
                "letter": upper_letter,
                "game_state": game_state
            }
            
    def _check_winner(self) -> bool:
        """Verifica se o jogador venceu"""
        return all(letter in self.guessed_letters for letter in self.current_word)
            
    def get_game_state(self) -> Dict:
        """Retorna o estado atual do jogo"""
        word_progress = [
            letter if letter in self.guessed_letters else "_"
            for letter in self.current_word
        ]
        
        is_game_over = self.errors >= self.max_errors or not self.game_active
        is_winner = self._check_winner()
        
        # Garante que o estágio não ultrapasse o máximo
        current_stage = min(self.errors, len(self.anatomy_stages) - 1)
        
        return {
            "word": self.current_word,
            "word_progress": " ".join(word_progress),
            "guessed_letters": list(self.guessed_letters),
            "wrong_letters": list(self.wrong_letters),
            "errors": self.errors,
            "max_errors": self.max_errors,
            "is_game_over": is_game_over,
            "is_winner": is_winner,
            "game_active": self.game_active,
            "remaining_letters": self.get_remaining_letters(),
            "anatomy_stage": self.anatomy_stages[current_stage],
            "category": self.current_category
        }
        
    def get_remaining_letters(self) -> List[str]:
        """Retorna letras ainda não utilizadas"""
        if not self.game_active:
            return []  # Não mostra letras restantes se o jogo acabou
            
        all_letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        used_letters = self.guessed_letters.union(self.wrong_letters)
        return [letter for letter in all_letters if letter not in used_letters]
        
    def get_hint(self) -> Dict:
        """Fornece uma dica (revela uma letra)"""
        if not self.game_active:
            return {"valid": False, "reason": "game_over"}
            
        if self.score < 10:
            return {"valid": False, "reason": "insufficient_score"}
            
        missing_letters = [
            letter for letter in self.current_word
            if letter not in self.guessed_letters
        ]
        
        if not missing_letters:
            return {"valid": False, "reason": "no_missing_letters"}
            
        hint_letter = missing_letters[0]  # Pega a primeira letra faltante
        self.score -= 10
        return self.guess_letter(hint_letter)
        
    def update_score(self, victory: bool):
        """Atualiza a pontuação baseado no resultado"""
        if victory:
            self.score += 100 + (self.streak * 10)
            self.streak += 1
        else:
            self.streak = 0
            
    def get_stats(self) -> Dict:
        """Retorna estatísticas do jogo"""
        return {
            "score": self.score,
            "streak": self.streak,
            "categories": self.word_loader.get_categories(),
            "game_active": self.game_active
        }
        
    def set_category(self, category: str) -> bool:
        """Define a categoria atual"""
        if category in self.word_loader.get_categories():
            self.current_category = category
            return True
        return False