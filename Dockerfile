# Dockerfile
FROM python:3.11-slim

# System deps (kept minimal)
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# App layout is explicit: code & assets go under /app
WORKDIR /app
COPY app/ /app/

# Python deps
RUN pip install -r requirements.txt

# Flask served by Gunicorn on 8000; templates/static/data are under /app
EXPOSE 5000
# replace your current CMD with:
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]

