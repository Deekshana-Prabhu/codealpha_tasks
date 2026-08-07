/**
 * NLP Engine for FAQ Chatbot
 * Implements: Tokenization, Stop Word Removal, Porter Stemmer, Synonym Normalization, TF-IDF Vectorization, and Cosine Similarity.
 */

// Common English Stop Words
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'can\'t', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t', 'down', 'during',
  'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t', 'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'how\'s',
  'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if', 'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself',
  'let\'s', 'me', 'more', 'most', 'mustn\'t', 'my', 'myself',
  'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'shan\'t', 'she', 'she\'d', 'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such',
  'than', 'that', 'that\'s', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d', 'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what', 'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why', 'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t',
  'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve', 'your', 'yours', 'yourself', 'yourselves', 'yes',
  'please', 'tell', 'help', 'know', 'want', 'need', 'give', 'hi', 'hello', 'hey'
]);

// Domain Synonym Dictionary for Intent Canonicalization
const SYNONYM_MAP = {
  'cost': 'price',
  'price': 'price',
  'fee': 'price',
  'charge': 'price',
  'rate': 'price',
  'payment': 'payment',
  'pay': 'payment',
  'buy': 'purchase',
  'purchase': 'purchase',
  'order': 'order',
  'track': 'tracking',
  'tracking': 'tracking',
  'shipment': 'shipping',
  'shipping': 'shipping',
  'delivery': 'shipping',
  'deliver': 'shipping',
  'refund': 'refund',
  'return': 'return',
  'cancel': 'cancellation',
  'cancellation': 'cancellation',
  'reset': 'reset',
  'password': 'password',
  'login': 'account',
  'signin': 'account',
  'account': 'account',
  'support': 'support',
  'contact': 'support',
  'call': 'support',
  'phone': 'support',
  'email': 'support',
  'trial': 'trial',
  'security': 'security',
  'privacy': 'security',
  'api': 'api',
  'integration': 'api',
  'tuition': 'tuition',
  'scholarship': 'scholarship',
  'housing': 'housing',
  'dorm': 'housing',
  'major': 'major',
  'degree': 'major'
};

// Porter Stemmer implementation
function porterStemmer(word) {
  word = word.toLowerCase().trim();
  if (word.length < 3) return word;

  if (SYNONYM_MAP[word]) return SYNONYM_MAP[word];

  if (word.endsWith('sses')) word = word.slice(0, -2);
  else if (word.endsWith('ies')) word = word.slice(0, -2);
  else if (word.endsWith('ss')) {}
  else if (word.endsWith('s')) word = word.slice(0, -1);

  if (word.endsWith('eed')) {
    if (word.length > 4) word = word.slice(0, -1);
  } else if ((word.endsWith('ing') || word.endsWith('ed')) && word.length > 4) {
    if (word.endsWith('ing')) word = word.slice(0, -3);
    else if (word.endsWith('ed')) word = word.slice(0, -2);
    
    if (word.endsWith('at') || word.endsWith('bl') || word.endsWith('iz')) word += 'e';
    else if (word.length >= 2 && word[word.length-1] === word[word.length-2] && !['l','s','z'].includes(word[word.length-1])) {
      word = word.slice(0, -1);
    }
  }

  if (word.endsWith('ational')) word = word.replace('ational', 'ate');
  else if (word.endsWith('tional')) word = word.replace('tional', 'tion');
  else if (word.endsWith('ization')) word = word.replace('ization', 'ize');
  else if (word.endsWith('ment')) word = word.slice(0, -4);
  else if (word.endsWith('ness')) word = word.slice(0, -4);
  else if (word.endsWith('ful')) word = word.slice(0, -3);
  else if (word.endsWith('able')) word = word.slice(0, -4);
  else if (word.endsWith('ible')) word = word.slice(0, -4);
  else if (word.endsWith('ly')) word = word.slice(0, -2);

  return SYNONYM_MAP[word] || word;
}

class NLPEngine {
  constructor() {
    this.faqs = [];
    this.vocabulary = new Set();
    this.idfMap = new Map();
    this.faqVectors = [];
  }

  tokenize(text) {
    if (!text) return [];
    return text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter(token => token.length > 0);
  }

  preprocess(text) {
    const rawTokens = this.tokenize(text);
    const cleanedTokens = rawTokens.filter(token => !STOP_WORDS.has(token));
    const stemmedTokens = cleanedTokens.map(token => porterStemmer(token));

    return {
      raw: text,
      rawTokens,
      cleanedTokens,
      stemmedTokens
    };
  }

  train(faqList) {
    this.faqs = faqList;
    this.vocabulary.clear();
    this.idfMap.clear();
    this.faqVectors = [];

    if (!faqList || faqList.length === 0) return;

    const docTokensList = faqList.map(faq => {
      const combinedText = `${faq.question} ${faq.answer || ''} ${faq.keywords || ''} ${faq.category || ''}`;
      const processed = this.preprocess(combinedText);
      return processed.stemmedTokens;
    });

    const docCount = faqList.length;
    const dfMap = new Map();

    docTokensList.forEach(tokens => {
      const uniqueTokensInDoc = new Set(tokens);
      uniqueTokensInDoc.forEach(token => {
        this.vocabulary.add(token);
        dfMap.set(token, (dfMap.get(token) || 0) + 1);
      });
    });

    this.vocabulary.forEach(token => {
      const df = dfMap.get(token) || 0;
      const idf = Math.log((1 + docCount) / (1 + df)) + 1;
      this.idfMap.set(token, idf);
    });

    this.faqVectors = docTokensList.map(tokens => {
      return this.computeTfIdfVector(tokens);
    });
  }

  computeTfIdfVector(tokens) {
    const vector = new Map();
    if (tokens.length === 0) return vector;

    const tfMap = new Map();
    tokens.forEach(token => {
      tfMap.set(token, (tfMap.get(token) || 0) + 1);
    });

    tfMap.forEach((count, token) => {
      if (this.idfMap.has(token)) {
        const tf = count / tokens.length;
        const idf = this.idfMap.get(token);
        vector.set(token, tf * idf);
      }
    });

    return vector;
  }

  cosineSimilarity(vecA, vecB) {
    if (vecA.size === 0 || vecB.size === 0) return 0;

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    vecA.forEach((valA, term) => {
      normA += valA * valA;
      if (vecB.has(term)) {
        dotProduct += valA * vecB.get(term);
      }
    });

    vecB.forEach(valB => {
      normB += valB * valB;
    });

    if (normA === 0 || normB === 0) return 0;

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  jaccardSimilarity(tokensA, tokensB) {
    if (tokensA.length === 0 || tokensB.length === 0) return 0;
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    let intersection = 0;
    setA.forEach(item => {
      if (setB.has(item)) intersection++;
    });
    const union = new Set([...setA, ...setB]).size;
    return union === 0 ? 0 : intersection / union;
  }

  findBestMatch(userQuery) {
    const queryProcessed = this.preprocess(userQuery);
    const queryVector = this.computeTfIdfVector(queryProcessed.stemmedTokens);

    if (this.faqs.length === 0 || queryProcessed.stemmedTokens.length === 0) {
      return {
        bestMatch: null,
        score: 0,
        confidence: 'none',
        topMatches: [],
        pipelineDetails: {
          userQuery,
          rawTokens: queryProcessed.rawTokens,
          cleanedTokens: queryProcessed.cleanedTokens,
          stemmedTokens: queryProcessed.stemmedTokens,
          vectorTerms: Array.from(queryVector.entries()).map(([t, v]) => ({ term: t, weight: parseFloat(v.toFixed(4)) })),
          scores: []
        }
      };
    }

    const matches = this.faqs.map((faq, idx) => {
      const faqVector = this.faqVectors[idx];
      let cosSim = this.cosineSimilarity(queryVector, faqVector);

      const faqProcessed = this.preprocess(`${faq.question} ${faq.keywords || ''}`);
      const jaccardSim = this.jaccardSimilarity(queryProcessed.stemmedTokens, faqProcessed.stemmedTokens);

      let boost = 0;
      if (faq.keywords) {
        const kwList = faq.keywords.toLowerCase().split(/,\s*/);
        kwList.forEach(kw => {
          if (userQuery.toLowerCase().includes(kw.trim())) {
            boost += 0.15;
          }
        });
      }

      let finalScore = (cosSim * 0.65) + (jaccardSim * 0.35) + boost;
      finalScore = Math.min(1.0, Math.max(0, finalScore));

      return {
        faq,
        score: finalScore,
        cosSim: cosSim,
        jaccardSim: jaccardSim,
        boost: boost
      };
    });

    matches.sort((a, b) => b.score - a.score);

    const best = matches[0];
    let confidence = 'none';

    // Lower confidence threshold slightly so valid questions get answered accurately
    if (best && best.score >= 0.25) {
      confidence = 'high';
    } else if (best && best.score >= 0.12) {
      confidence = 'medium';
    } else if (best && best.score > 0.05) {
      confidence = 'low';
    }

    return {
      bestMatch: confidence !== 'none' ? best.faq : null,
      score: best ? best.score : 0,
      confidence,
      topMatches: matches.slice(0, 4),
      pipelineDetails: {
        userQuery,
        rawTokens: queryProcessed.rawTokens,
        cleanedTokens: queryProcessed.cleanedTokens,
        stemmedTokens: queryProcessed.stemmedTokens,
        vectorTerms: Array.from(queryVector.entries()).map(([t, v]) => ({ term: t, weight: parseFloat(v.toFixed(4)) })),
        scores: matches.slice(0, 6).map(m => ({
          question: m.faq.question,
          id: m.faq.id,
          category: m.faq.category,
          totalScore: parseFloat(m.score.toFixed(4)),
          cosSim: parseFloat(m.cosSim.toFixed(4)),
          jaccardSim: parseFloat(m.jaccardSim.toFixed(4)),
          boost: parseFloat(m.boost.toFixed(4))
        }))
      }
    };
  }
}

window.nlpEngine = new NLPEngine();
