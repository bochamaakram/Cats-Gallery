#!/bin/bash

# Base URL
URL="http://localhost:8787"

echo "1. Registering user..."
curl -s -X POST "$URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"username":"jwtuser","email":"jwt@example.com","password":"password123"}' | tee register_output.json
echo ""

echo "2. Logging in..."
curl -s -c cookies.txt -X POST "$URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jwt@example.com","password":"password123"}' | tee login_output.json
echo ""

echo "3. Checking /auth/me with cookie..."
curl -s -b cookies.txt "$URL/auth/me" | tee me_output.json
echo ""

echo "4. Logging out..."
curl -s -b cookies.txt -c cookies.txt -X POST "$URL/auth/logout"
echo ""

echo "5. Checking /auth/me without cookie (should fail)..."
curl -s -b cookies.txt "$URL/auth/me"
echo ""
