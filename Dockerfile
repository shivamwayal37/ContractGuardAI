# Multi-stage build for smaller final image
FROM python:3.11-slim as builder

# Install build dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /app

# Copy and install Python dependencies
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --user -r requirements.txt

# Final stage - minimal runtime image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Copy Python packages from builder
COPY --from=builder /root/.local /root/.local

# Copy application code
COPY backend/ ./backend/
COPY frontend/ ./frontend/

# Create upload directory
RUN mkdir -p /tmp/uploads

# Add Python packages to PATH
ENV PATH=/root/.local/bin:$PATH
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app
ENV PORT=8080

# Non-root user for security (optional but recommended)
RUN useradd -m -u 1000 appuser && \
    chown -R appuser:appuser /app /tmp/uploads
USER appuser

# Expose port
EXPOSE 8080

# Health check (optional but good practice)
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD python -c "import requests; requests.get('http://localhost:8080/health', timeout=2)"

# Run gunicorn
CMD exec gunicorn --bind :$PORT \
    --workers 1 \
    --threads 8 \
    --timeout 300 \
    --worker-class gthread \
    --access-logfile - \
    --error-logfile - \
    --log-level info \
    --chdir /app \
    backend.app:app