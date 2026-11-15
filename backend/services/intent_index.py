"""Lightweight bilingual intent classifier. Abstentions continue to hosted classification."""
from collections import Counter
import math
import re


def features(text):
    result = Counter()
    for word in re.findall(r"[^\W_]+", text.casefold()):
        result[word] += 2
        padded = "^" + word + "$"
        for i in range(len(padded) - 2):
            result["#" + padded[i:i+3]] += 1
    return result


def unit(vector):
    length = math.sqrt(sum(x*x for x in vector.values()))
    return {key: value / length for key, value in vector.items()} if length else {}


class IntentIndex:
    def __init__(self, rows):
        vectors = {}
        for language, intent, text in rows:
            vector = vectors.setdefault(language, {}).setdefault(intent, Counter())
            vector.update(unit(features(text)))
        self.centroids = {lang: {intent: unit(vector) for intent, vector in labels.items()}
                          for lang, labels in vectors.items()}

    def classify(self, language, text):
        query = unit(features(text))
        scores = sorted(((sum(weight * center.get(term, 0) for term, weight in query.items()), intent)
                         for intent, center in self.centroids.get(language, {}).items()), reverse=True)
        if not scores or scores[0][0] < 0.55:
            return None
        if len(scores) > 1 and scores[0][0] - scores[1][0] < 0.12:
            return None
        return scores[0][1]
