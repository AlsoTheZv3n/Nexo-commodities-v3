FROM python:3.11-slim

WORKDIR /app

# System deps for torch + playwright
RUN apt-get update && apt-get install -y \
    gcc g++ git curl \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Pre-download FinBERT model into image (optional, saves cold start time)
# RUN python -c "from transformers import pipeline; pipeline('text-classification', model='ProsusAI/finbert')"

COPY . .

RUN mkdir -p models

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "1"]
