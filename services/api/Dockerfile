# Build context: repository root (the API seeds from packages/catalog).
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 PIP_NO_CACHE_DIR=1
WORKDIR /srv
COPY services/api/requirements.txt ./requirements.txt
RUN pip install -r requirements.txt
COPY services/api/app ./app
COPY packages/catalog/catalog.json ./catalog/catalog.json
ENV CATALOG_PATH=/srv/catalog/catalog.json
RUN useradd --system --uid 10001 thread
USER thread
EXPOSE 8000
HEALTHCHECK --interval=15s --timeout=3s CMD python -c "import urllib.request;urllib.request.urlopen('http://localhost:8000/healthz')"
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers", "--forwarded-allow-ips", "*"]
