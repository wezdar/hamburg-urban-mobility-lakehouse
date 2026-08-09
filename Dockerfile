FROM python:3.12-slim AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY pyproject.toml README.md ./
COPY src ./src
RUN pip install ".[dbt]"

COPY scripts ./scripts
COPY transform ./transform
COPY public/data ./public/data
COPY app/data ./app/data

ENTRYPOINT ["hamburg-mobility"]
CMD ["snapshot"]
