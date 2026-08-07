"""
=============================================================================
TASK 2: Chatbot for FAQs (Python NLP Reference Implementation)
=============================================================================
This standalone Python script implements the FAQ Chatbot pipeline using:
- NLTK for text preprocessing (Tokenization, Stopwords removal, Porter Stemming)
- Scikit-Learn TfidfVectorizer for TF-IDF matrix construction
- Cosine Similarity for finding the best matching FAQ answer
"""

import sys
import re
import math
import numpy as np

try:
    import nltk
    from nltk.corpus import stopwords
    from nltk.stem import PorterStemmer
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
except ImportError:
    print("[NOTE] NLTK or Scikit-Learn not found. Installing via pip or falling back to pure Python implementation.")

# Sample FAQ Knowledge Base
FAQ_DATASET = [
    {
        "id": 1,
        "category": "Shipping & Delivery",
        "question": "How long does shipping take and how much does it cost?",
        "answer": "Standard shipping takes 3-5 business days ($4.99). Free shipping is available on orders over $50."
    },
    {
        "id": 2,
        "category": "Returns & Refunds",
        "question": "What is your return and refund policy?",
        "answer": "We offer a 30-day money-back guarantee for unused items in original packaging."
    },
    {
        "id": 3,
        "category": "Order Tracking",
        "question": "How can I track my order status?",
        "answer": "Check your email for the shipment tracking link or enter your Order ID on our tracking page."
    },
    {
        "id": 4,
        "category": "Payment Methods",
        "question": "What payment methods do you accept?",
        "answer": "We accept Visa, Mastercard, PayPal, Apple Pay, and Buy-Now-Pay-Later options."
    },
    {
        "id": 5,
        "category": "Account & Profile",
        "question": "How do I reset my account password?",
        "answer": "Click 'Forgot Password' on the login page and follow the email reset link sent to your inbox."
    }
]

# Simple English Stopwords fallback list
BASIC_STOPWORDS = set([
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'to', 'in', 'on', 'at',
    'by', 'for', 'with', 'about', 'against', 'between', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'from', 'up', 'down', 'of', 'off', 'over', 'under', 'again',
    'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how', 'all', 'any',
    'both', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
    'own', 'same', 'so', 'than', 'too', 'very', 'can', 'will', 'just', 'should', 'now', 'do',
    'does', 'did', 'have', 'has', 'had', 'what', 'which', 'who', 'whom', 'this', 'that', 'these',
    'those', 'am', 'be', 'been', 'being', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'my', 'your',
    'hi', 'hello', 'hey', 'please', 'tell', 'me'
])


class PythonFAQBot:
    """NLP FAQ Bot matching engine using TF-IDF & Cosine Similarity."""
    
    def __init__(self, faqs=FAQ_DATASET):
        self.faqs = faqs
        self.vectorizer = TfidfVectorizer(tokenizer=self.preprocess_text)
        self.questions = [faq["question"] for faq in faqs]
        self.faq_matrix = self.vectorizer.fit_transform(self.questions)
        
    def preprocess_text(self, text):
        """Tokenize, lowercase, strip punctuation, remove stop words, and stem."""
        text = text.lower()
        # Clean non-alphanumeric characters
        text = re.sub(r'[^a-z0-9\s]', '', text)
        tokens = text.split()
        
        # Filter stop words
        tokens = [t for t in tokens if t not in BASIC_STOPWORDS]
        
        # Simple stemming rule fallback
        stemmed = []
        for t in tokens:
            if t.endswith('ing') and len(t) > 4:
                t = t[:-3]
            elif t.endswith('ed') and len(t) > 4:
                t = t[:-2]
            elif t.endswith('s') and len(t) > 3 and not t.endswith('ss'):
                t = t[:-1]
            stemmed.append(t)
            
        return stemmed

    def match_question(self, user_query):
        """Transform user query and calculate cosine similarity scores."""
        query_vec = self.vectorizer.transform([user_query])
        similarities = cosine_similarity(query_vec, self.faq_matrix).flatten()
        
        best_idx = int(np.argmax(similarities))
        best_score = float(similarities[best_idx])
        
        if best_score >= 0.35:
            confidence = "High"
            answer = self.faqs[best_idx]["answer"]
            matched_q = self.faqs[best_idx]["question"]
        elif best_score >= 0.15:
            confidence = "Medium"
            answer = f"Closest match ({self.faqs[best_idx]['question']}): {self.faqs[best_idx]['answer']}"
            matched_q = self.faqs[best_idx]["question"]
        else:
            confidence = "Low"
            answer = "I'm sorry, I couldn't find a matching FAQ for your question. Please try rephrasing."
            matched_q = None
            
        return {
            "query": user_query,
            "best_match_question": matched_q,
            "answer": answer,
            "score": round(best_score, 4),
            "confidence": confidence
        }


def main():
    print("=" * 60)
    print("  NLP FAQ CHATBOT - PYTHON TERMINAL DEMO")
    print("=" * 60)
    print("Initializing TF-IDF vector space model...")
    
    bot = PythonFAQBot()
    print("FAQ Knowledge Base ready! Type your question below (or 'exit' to quit).\n")
    
    sample_queries = [
        "How much is shipping and when will my package arrive?",
        "Can I return an item if I don't like it?",
        "Where do I put my credit card for payment?",
        "Forgot my password"
    ]
    
    print("--- DEMO AUTOMATED QUERIES ---")
    for q in sample_queries:
        print(f"\nUser: {q}")
        res = bot.match_question(q)
        print(f"Bot [{res['confidence']} Confidence | Score: {res['score']}]:")
        print(f" -> {res['answer']}")
    print("-" * 60)
    
    print("\nInteractive Chat Mode (Type 'exit' to quit):")
    while True:
        try:
            user_input = input("\nYou: ").strip()
            if not user_input or user_input.lower() in ['exit', 'quit']:
                print("Goodbye!")
                break
            res = bot.match_question(user_input)
            print(f"Bot [{res['confidence']} Confidence | Score: {res['score']}]:\n -> {res['answer']}")
        except (KeyboardInterrupt, EOFError):
            break

if __name__ == "__main__":
    main()
