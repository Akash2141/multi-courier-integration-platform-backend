#!/bin/bash
# ==============================================================================
# Multi-Courier Integration Platform - cURL Examples
# ==============================================================================
# Base URL configuration
BASE_URL="http://localhost:3000"

echo "=========================================================="
echo "1. Health Check"
echo "=========================================================="
curl -s -X GET "${BASE_URL}/health" | jq .

echo -e "\n=========================================================="
echo "2. List Supported Couriers"
echo "=========================================================="
curl -s -X GET "${BASE_URL}/api/v1/couriers" | jq .

echo -e "\n=========================================================="
echo "3. User Registration (JWT Auth)"
echo "=========================================================="
REGISTER_RESP=$(curl -s -X POST "${BASE_URL}/api/v1/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "engineer_'$(date +%s)'@example.com",
    "password": "Password123!",
    "role": "ADMIN"
  }')
echo "$REGISTER_RESP" | jq .
TOKEN=$(echo "$REGISTER_RESP" | jq -r '.data.token // empty')

if [ -z "$TOKEN" ]; then
  # Fallback to login if already registered
  LOGIN_RESP=$(curl -s -X POST "${BASE_URL}/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{
      "email": "engineer@futurevision.com",
      "password": "SecurePassword123!"
    }')
  TOKEN=$(echo "$LOGIN_RESP" | jq -r '.data.token // empty')
fi

echo -e "\nObtained Bearer Token: ${TOKEN:0:20}..."

ORDER_ID="ORD-CURL-$(date +%s)"

echo -e "\n=========================================================="
echo "4. Create Single Shipment with UrbaneBolt (Idempotent)"
echo "=========================================================="
curl -s -X POST "${BASE_URL}/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "order_id": "'"${ORDER_ID}"'",
    "courier_partner": "urbanebolt",
    "sender": {
      "name": "Rohit Athaley",
      "phone": "9425018023",
      "email": "bhopal@mbdgroup.com",
      "address": "Plot No. 137 Sector-1 Spl Industrial Area",
      "city": "Govindpura",
      "state": "BHOPAL",
      "pincode": "122001",
      "country": "India",
      "address_type": "Seller"
    },
    "recipient": {
      "name": "Satyam Convent School",
      "phone": "8320226438",
      "email": "satyam@example.com",
      "address": "Plot No. 26-27 Om Nagar Society",
      "city": "Surat",
      "state": "GUJARAT",
      "pincode": "122017",
      "country": "India",
      "address_type": "Home"
    },
    "package_details": {
      "weight_kg": 1.1,
      "length_cm": 12,
      "breadth_cm": 10,
      "height_cm": 10,
      "items_count": 1,
      "item_description": "Educational Books"
    },
    "payment_details": {
      "payment_mode": "COD",
      "collectable_amount": 500,
      "declared_value": 500
    },
    "invoice_details": {
      "invoice_number": "INV-001",
      "invoice_date": "2026-08-18",
      "invoice_value": 500
    },
    "service_type": "SDD"
  }' | jq .

echo -e "\n=========================================================="
echo "5. Create Single Shipment with Mock Courier"
echo "=========================================================="
MOCK_ORDER_ID="ORD-MOCK-$(date +%s)"
curl -s -X POST "${BASE_URL}/api/v1/orders" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "order_id": "'"${MOCK_ORDER_ID}"'",
    "courier_partner": "mock",
    "sender": {
      "name": "Warehouse Alpha",
      "phone": "9876543210",
      "address": "Electronic City",
      "city": "Bengaluru",
      "state": "Karnataka",
      "pincode": "560100"
    },
    "recipient": {
      "name": "Alice Smith",
      "phone": "9123456780",
      "address": "Sector 62",
      "city": "Noida",
      "state": "Uttar Pradesh",
      "pincode": "201301"
    },
    "package_details": {
      "weight_kg": 0.8,
      "length_cm": 10,
      "breadth_cm": 10,
      "height_cm": 5,
      "items_count": 1,
      "item_description": "Wireless Earbuds"
    },
    "payment_details": {
      "payment_mode": "PREPAID",
      "collectable_amount": 0,
      "declared_value": 1999
    }
  }' | jq .

echo -e "\n=========================================================="
echo "6. Track Order (${MOCK_ORDER_ID})"
echo "=========================================================="
curl -s -X GET "${BASE_URL}/api/v1/orders/${MOCK_ORDER_ID}/track" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

echo -e "\n=========================================================="
echo "7. Get Order Details from Local DB (${MOCK_ORDER_ID})"
echo "=========================================================="
curl -s -X GET "${BASE_URL}/api/v1/orders/${MOCK_ORDER_ID}" \
  -H "Authorization: Bearer ${TOKEN}" | jq .

echo -e "\n=========================================================="
echo "8. Cancel Order (${MOCK_ORDER_ID})"
echo "=========================================================="
curl -s -X POST "${BASE_URL}/api/v1/orders/${MOCK_ORDER_ID}/cancel" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{"reason": "Customer cancelled before shipment dispatch"}' | jq .

echo -e "\n=========================================================="
echo "9. Bulk Create Orders (Multi-Partner Concurrency)"
echo "=========================================================="
curl -s -X POST "${BASE_URL}/api/v1/orders/bulk" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d '{
    "orders": [
      {
        "order_id": "BULK-A-'$(date +%s)'",
        "courier_partner": "mock",
        "sender": {"name": "Shipper A", "phone": "9876543210", "address": "Hub A", "city": "Delhi", "state": "Delhi", "pincode": "110001"},
        "recipient": {"name": "User A", "phone": "9123456781", "address": "Home A", "city": "Mumbai", "state": "MH", "pincode": "400001"},
        "package_details": {"weight_kg": 1, "length_cm": 10, "breadth_cm": 10, "height_cm": 10, "items_count": 1, "item_description": "Item A"},
        "payment_details": {"payment_mode": "PREPAID", "collectable_amount": 0, "declared_value": 500}
      },
      {
        "order_id": "BULK-B-'$(date +%s)'",
        "courier_partner": "mock",
        "sender": {"name": "Shipper B", "phone": "9876543210", "address": "Hub B", "city": "Delhi", "state": "Delhi", "pincode": "110001"},
        "recipient": {"name": "User B", "phone": "9123456782", "address": "Home B", "city": "Pune", "state": "MH", "pincode": "411001"},
        "package_details": {"weight_kg": 2, "length_cm": 15, "breadth_cm": 10, "height_cm": 10, "items_count": 1, "item_description": "Item B"},
        "payment_details": {"payment_mode": "COD", "collectable_amount": 750, "declared_value": 750}
      }
    ]
  }' | jq .

echo -e "\n=========================================================="
echo "10. Error Case: Unknown Courier Partner"
echo "=========================================================="
curl -s -X POST "${BASE_URL}/api/v1/orders" \
  -H "Content-Type: application/json" \
  -d '{
    "order_id": "ERR-COURIER-01",
    "courier_partner": "unknown_speed_courier",
    "sender": {"name": "Shipper", "phone": "9876543210", "address": "Hub", "city": "Delhi", "state": "Delhi", "pincode": "110001"},
    "recipient": {"name": "User", "phone": "9123456781", "address": "Home", "city": "Mumbai", "state": "MH", "pincode": "400001"},
    "package_details": {"weight_kg": 1, "length_cm": 10, "breadth_cm": 10, "height_cm": 10, "items_count": 1, "item_description": "Item"},
    "payment_details": {"payment_mode": "PREPAID", "collectable_amount": 0, "declared_value": 100}
  }' | jq .

echo -e "\n=========================================================="
echo "11. Error Case: AJV Schema Validation Failure"
echo "=========================================================="
curl -s -X POST "${BASE_URL}/api/v1/orders" \
  -H "Content-Type: application/json" \
  -d '{"order_id": "INVALID-PAYLOAD"}' | jq .
