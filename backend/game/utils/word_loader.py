import os
import random
from typing import Dict, List

class WordLoader:
    def __init__(self, file_path: str):
        self.file_path = file_path
        self.categories: Dict[str, List[str]] = {}
        
    def load_words(self) -> bool:
        """Carrega palavras do arquivo categorizado"""
        try:
            if not os.path.exists(self.file_path):
                print(f"Arquivo {self.file_path} não encontrado")
                return False
                
            with open(self.file_path, 'r', encoding='utf-8') as file:
                content = file.read().strip()
                
            if not content:
                print("Arquivo de palavras vazio")
                return False
                
            self._parse_categories(content)
            print(f"Categorias carregadas: {list(self.categories.keys())}")  # Debug
            return True
            
        except Exception as e:
            print(f"Erro ao carregar palavras: {e}")
            return False
            
    def _parse_categories(self, content: str):
        """Parse do conteúdo do arquivo para categorias"""
        current_category = None
        
        for line in content.split('\n'):
            line = line.strip()
            if not line:
                continue
                
            if line.startswith('[') and line.endswith(']'):
                # Nova categoria
                current_category = line[1:-1]
                self.categories[current_category] = []
            elif current_category and line:
                # Adiciona palavra à categoria atual
                self.categories[current_category].append(line.upper())
                
    def get_categories(self) -> List[str]:
        """Retorna lista de categorias disponíveis"""
        return list(self.categories.keys())
        
    def get_random_word(self, category: str = None) -> str:
        """Retorna uma palavra aleatória da categoria especificada"""
        if not self.categories:
            print("Nenhuma categoria carregada")  # Debug
            return None
            
        if category and category in self.categories:
            words = self.categories[category]
        else:
            # Se nenhuma categoria especificada, pega de todas
            all_words = []
            for cat_words in self.categories.values():
                all_words.extend(cat_words)
            words = all_words
            
        if not words:
            print(f"Nenhuma palavra encontrada para categoria: {category}")  # Debug
            return None
            
        word = random.choice(words)
        print(f"Palavra selecionada: {word}")  # Debug
        return word
        
    def get_words_by_category(self, category: str) -> List[str]:
        """Retorna todas as palavras de uma categoria"""
        return self.categories.get(category, [])