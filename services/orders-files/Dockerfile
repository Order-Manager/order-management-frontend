FROM python:3.12-slim
COPY --from=ghcr.io/astral-sh/uv:0.5.11 /uv /usr/local/bin/uv

WORKDIR /srv
COPY pyproject.toml ./
RUN uv pip install --system -r pyproject.toml
COPY app ./app

# Runs unprivileged; the host folder mounted on /data must be owned by uid 10001
RUN useradd --uid 10001 --no-create-home files && mkdir /data && chown files /data
USER files

ENV DATA_DIR=/data
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--proxy-headers"]
