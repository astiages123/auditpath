import sys
import json
import spacy

import warnings
# spaCy'nin versiyon uyarılarını tamamen susturur
warnings.filterwarnings("ignore", message=r".*Model 'tr_core_news_md'.*specifies an under-constrained spaCy version requirement.*")

def analyze_density():
    # Load the Turkish model
    try:
        nlp = spacy.load("tr_core_news_md")
    except OSError:
        error_msg = {
            "error": "Model 'tr_core_news_md' not found.",
            "detail": "Please run: pip3 install https://huggingface.co/turkish-nlp-suite/tr_core_news_md/resolve/main/tr_core_news_md-1.0-py3-none-any.whl"
        }
        print(json.dumps(error_msg))
        sys.exit(1)

    # Read input from stdin
    try:
        input_data = sys.stdin.read()
    except Exception as e:
        print(json.dumps({"error": f"Failed to read input: {str(e)}"}))
        sys.exit(1)

    if not input_data or not input_data.strip():
        # Return 0 density for empty input
        print(json.dumps({
            "density_score": 0.0,
            "meaningful_word_count": 0,
            "total_word_count": 0
        }))
        return

    doc = nlp(input_data)

    meaningful_pos = {"NOUN", "PROPN", "NUM", "VERB"}
    meaningful_count = 0
    total_count = 0

    for token in doc:
        # Ignore punctuation and space for total word count
        if not token.is_punct and not token.is_space:
            total_count += 1
            if token.pos_ in meaningful_pos:
                meaningful_count += 1

    density_score = (meaningful_count / total_count) if total_count > 0 else 0.0

    result = {
        "density_score": density_score,
        "meaningful_word_count": meaningful_count,
        "total_word_count": total_count
    }

    print(json.dumps(result))

if __name__ == "__main__":
    analyze_density()
