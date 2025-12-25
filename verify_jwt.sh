#!/bin/bash

BASE_URL="http://localhost:8787"
USERNAME="testuser_$(date +%s)"
EMAIL="${USERNAME}@example.com"
PASSWORD="password123"

echo "1. Registering user..."
curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d "{\"username\": \"$USERNAME\", \"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}"
echo -e "\n"

echo "2. Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"$EMAIL\", \"password\": \"$PASSWORD\"}")

echo "Login Response: $LOGIN_RESPONSE"

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "Error: Failed to get token"
  exit 1
fi

echo -e "\nToken received: ${TOKEN:0:20}..."

echo "3. Accessing protected route (/auth/me) with token..."
curl -s -X GET "$BASE_URL/auth/me" \
  -H "Authorization: Bearer $TOKEN"

echo -e "\n"

echo "4. Accessing protected route without token (should fail)..."
curl -s -X GET "$BASE_URL/auth/me"
echo -e "\n"
