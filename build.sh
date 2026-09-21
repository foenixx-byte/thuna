#!/usr/bin/env bash
# Exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Run database migrations
python manage.py migrate --noinput

# Collect static files for WhiteNoise
python manage.py collectstatic --noinput
