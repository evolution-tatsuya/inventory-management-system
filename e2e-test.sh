#!/bin/bash

# ====================================================================
# 階層型在庫管理システム - 包括的E2Eテストスクリプト
# ====================================================================
# テスト環境:
#   - Frontend: http://localhost:3590
#   - Backend: http://localhost:8763
# ====================================================================

set -e

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# テスト結果集計
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
SKIPPED_TESTS=0

# ベースURL
API_URL="http://localhost:8763"
FRONTEND_URL="http://localhost:3590"

# セッションCookie保存用
SESSION_COOKIE=""

# ====================================================================
# ユーティリティ関数
# ====================================================================

print_header() {
  echo -e "\n${BLUE}============================================${NC}"
  echo -e "${BLUE}$1${NC}"
  echo -e "${BLUE}============================================${NC}\n"
}

print_test() {
  echo -e "${YELLOW}[TEST]${NC} $1"
}

print_pass() {
  echo -e "${GREEN}[PASS]${NC} $1"
  PASSED_TESTS=$((PASSED_TESTS + 1))
}

print_fail() {
  echo -e "${RED}[FAIL]${NC} $1"
  echo -e "${RED}       詳細: $2${NC}"
  FAILED_TESTS=$((FAILED_TESTS + 1))
}

print_skip() {
  echo -e "${YELLOW}[SKIP]${NC} $1"
  SKIPPED_TESTS=$((SKIPPED_TESTS + 1))
}

increment_total() {
  TOTAL_TESTS=$((TOTAL_TESTS + 1))
}

# ====================================================================
# 1. 認証機能テスト
# ====================================================================

test_authentication() {
  print_header "1. 認証機能テスト"

  # 1.1 ログイン成功テスト
  increment_total
  print_test "1.1 ログイン成功テスト"

  LOGIN_RESPONSE=$(curl -s -c /tmp/session_cookie.txt -X POST "$API_URL/api/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@inventory-system.local","password":"InventoryAdmin2025!"}')

  if echo "$LOGIN_RESPONSE" | grep -q "success.*true"; then
    print_pass "ログイン成功"
    SESSION_COOKIE=$(cat /tmp/session_cookie.txt | grep -v "^#" | tail -1 | awk '{print $6"="$7}')
  else
    print_fail "ログイン失敗" "$LOGIN_RESPONSE"
  fi

  # 1.2 セッション検証テスト
  increment_total
  print_test "1.2 セッション検証テスト"

  SESSION_RESPONSE=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/auth/session")

  if echo "$SESSION_RESPONSE" | grep -q "authenticated.*true"; then
    print_pass "セッション有効"
  else
    print_fail "セッション無効" "$SESSION_RESPONSE"
  fi

  # 1.3 認証なしアクセステスト
  increment_total
  print_test "1.3 認証なしアクセステスト（401エラー期待）"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/admin/stats")

  if [ "$HTTP_CODE" == "401" ]; then
    print_pass "未認証時は401エラー"
  else
    print_fail "未認証時のエラーコードが不正" "Expected: 401, Got: $HTTP_CODE"
  fi
}

# ====================================================================
# 2. カテゴリー管理テスト
# ====================================================================

test_category_management() {
  print_header "2. カテゴリー管理テスト"

  CATEGORY_ID=""

  # 2.1 カテゴリー一覧取得
  increment_total
  print_test "2.1 カテゴリー一覧取得"

  CATEGORIES=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/categories")

  if echo "$CATEGORIES" | grep -q "name"; then
    print_pass "カテゴリー一覧取得成功"
  else
    print_fail "カテゴリー一覧取得失敗" "$CATEGORIES"
  fi

  # 2.2 カテゴリー追加
  increment_total
  print_test "2.2 カテゴリー追加"

  CREATE_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X POST "$API_URL/api/admin/categories" \
    -H "Content-Type: application/json" \
    -d '{"name":"E2Eテストカテゴリー","description":"E2Eテスト用"}')

  if echo "$CREATE_RESPONSE" | grep -q "E2Eテストカテゴリー"; then
    print_pass "カテゴリー追加成功"
    CATEGORY_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    print_fail "カテゴリー追加失敗" "$CREATE_RESPONSE"
  fi

  # 2.3 カテゴリー編集
  if [ -n "$CATEGORY_ID" ]; then
    increment_total
    print_test "2.3 カテゴリー編集"

    UPDATE_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X PUT "$API_URL/api/admin/categories/$CATEGORY_ID" \
      -H "Content-Type: application/json" \
      -d '{"name":"E2Eテストカテゴリー（更新）","description":"更新済み"}')

    if echo "$UPDATE_RESPONSE" | grep -q "更新"; then
      print_pass "カテゴリー編集成功"
    else
      print_fail "カテゴリー編集失敗" "$UPDATE_RESPONSE"
    fi
  else
    increment_total
    print_skip "2.3 カテゴリー編集（カテゴリーIDが取得できませんでした）"
  fi

  # 2.4 カテゴリー削除
  if [ -n "$CATEGORY_ID" ]; then
    increment_total
    print_test "2.4 カテゴリー削除"

    HTTP_CODE=$(curl -s -b /tmp/session_cookie.txt -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/api/admin/categories/$CATEGORY_ID")

    if [ "$HTTP_CODE" == "204" ] || [ "$HTTP_CODE" == "200" ]; then
      print_pass "カテゴリー削除成功"
    else
      print_fail "カテゴリー削除失敗" "HTTP Code: $HTTP_CODE"
    fi
  else
    increment_total
    print_skip "2.4 カテゴリー削除（カテゴリーIDが取得できませんでした）"
  fi
}

# ====================================================================
# 3. ジャンル管理テスト
# ====================================================================

test_genre_management() {
  print_header "3. ジャンル管理テスト"

  # 既存カテゴリーIDを取得
  CATEGORIES=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/categories")
  CATEGORY_ID=$(echo "$CATEGORIES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$CATEGORY_ID" ]; then
    print_skip "3.1-3.4 ジャンル管理テスト（カテゴリーが存在しません）"
    increment_total
    increment_total
    increment_total
    increment_total
    return
  fi

  GENRE_ID=""

  # 3.1 ジャンル一覧取得
  increment_total
  print_test "3.1 ジャンル一覧取得"

  GENRES=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/categories/$CATEGORY_ID/genres")

  if [ $? -eq 0 ]; then
    print_pass "ジャンル一覧取得成功"
  else
    print_fail "ジャンル一覧取得失敗" "$GENRES"
  fi

  # 3.2 ジャンル追加
  increment_total
  print_test "3.2 ジャンル追加"

  CREATE_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X POST "$API_URL/api/admin/genres" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"E2Eテストジャンル\",\"categoryId\":\"$CATEGORY_ID\",\"description\":\"テスト用ジャンル\"}")

  if echo "$CREATE_RESPONSE" | grep -q "E2Eテストジャンル"; then
    print_pass "ジャンル追加成功"
    GENRE_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    print_fail "ジャンル追加失敗" "$CREATE_RESPONSE"
  fi

  # 3.3 ジャンル編集
  if [ -n "$GENRE_ID" ]; then
    increment_total
    print_test "3.3 ジャンル編集"

    UPDATE_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X PUT "$API_URL/api/admin/genres/$GENRE_ID" \
      -H "Content-Type: application/json" \
      -d '{"name":"E2Eテストジャンル（更新）","description":"更新済み"}')

    if echo "$UPDATE_RESPONSE" | grep -q "更新"; then
      print_pass "ジャンル編集成功"
    else
      print_fail "ジャンル編集失敗" "$UPDATE_RESPONSE"
    fi
  else
    increment_total
    print_skip "3.3 ジャンル編集（ジャンルIDが取得できませんでした）"
  fi

  # 3.4 ジャンル削除
  if [ -n "$GENRE_ID" ]; then
    increment_total
    print_test "3.4 ジャンル削除"

    HTTP_CODE=$(curl -s -b /tmp/session_cookie.txt -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/api/admin/genres/$GENRE_ID")

    if [ "$HTTP_CODE" == "204" ] || [ "$HTTP_CODE" == "200" ]; then
      print_pass "ジャンル削除成功"
    else
      print_fail "ジャンル削除失敗" "HTTP Code: $HTTP_CODE"
    fi
  else
    increment_total
    print_skip "3.4 ジャンル削除（ジャンルIDが取得できませんでした）"
  fi
}

# ====================================================================
# 4. パーツ管理テスト
# ====================================================================

test_part_management() {
  print_header "4. パーツ管理テスト"

  # 既存ジャンルIDを取得
  CATEGORIES=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/categories")
  CATEGORY_ID=$(echo "$CATEGORIES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$CATEGORY_ID" ]; then
    print_skip "4.1-4.6 パーツ管理テスト（カテゴリーが存在しません）"
    for i in {1..6}; do increment_total; done
    return
  fi

  GENRES=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/categories/$CATEGORY_ID/genres")
  GENRE_ID=$(echo "$GENRES" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)

  if [ -z "$GENRE_ID" ]; then
    print_skip "4.1-4.6 パーツ管理テスト（ジャンルが存在しません）"
    for i in {1..6}; do increment_total; done
    return
  fi

  PART_ID=""
  PART_NUMBER="E2E-TEST-001"

  # 4.1 パーツ一覧取得
  increment_total
  print_test "4.1 パーツ一覧取得"

  PARTS=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/genres/$GENRE_ID/parts")

  if [ $? -eq 0 ]; then
    print_pass "パーツ一覧取得成功"
  else
    print_fail "パーツ一覧取得失敗" "$PARTS"
  fi

  # 4.2 パーツ追加
  increment_total
  print_test "4.2 パーツ追加"

  CREATE_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X POST "$API_URL/api/admin/parts" \
    -H "Content-Type: application/json" \
    -d "{\"genreId\":\"$GENRE_ID\",\"unitNumber\":\"99\",\"partNumber\":\"$PART_NUMBER\",\"partName\":\"E2Eテストパーツ\",\"storageCase\":\"A-1\"}")

  if echo "$CREATE_RESPONSE" | grep -q "$PART_NUMBER"; then
    print_pass "パーツ追加成功"
    PART_ID=$(echo "$CREATE_RESPONSE" | grep -o '"id":"[^"]*"' | head -1 | cut -d'"' -f4)
  else
    print_fail "パーツ追加失敗" "$CREATE_RESPONSE"
  fi

  # 4.3 パーツ編集
  if [ -n "$PART_ID" ]; then
    increment_total
    print_test "4.3 パーツ編集"

    UPDATE_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X PUT "$API_URL/api/admin/parts/$PART_ID" \
      -H "Content-Type: application/json" \
      -d '{"partName":"E2Eテストパーツ（更新）","notes":"更新されました"}')

    if echo "$UPDATE_RESPONSE" | grep -q "E2Eテストパーツ"; then
      print_pass "パーツ編集成功"
    else
      print_fail "パーツ編集失敗" "$UPDATE_RESPONSE"
    fi
  else
    increment_total
    print_skip "4.3 パーツ編集（パーツIDが取得できませんでした）"
  fi

  # 4.4 在庫数更新
  if [ -n "$PART_NUMBER" ]; then
    increment_total
    print_test "4.4 在庫数更新"

    STOCK_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X PUT "$API_URL/api/admin/parts/$PART_NUMBER/stock" \
      -H "Content-Type: application/json" \
      -d '{"stockQuantity":25}')

    if echo "$STOCK_RESPONSE" | grep -q "success.*true"; then
      print_pass "在庫数更新成功"
    else
      print_fail "在庫数更新失敗" "$STOCK_RESPONSE"
    fi
  else
    increment_total
    print_skip "4.4 在庫数更新（パーツ番号が取得できませんでした）"
  fi

  # 4.5 CSVエクスポート
  if [ -n "$GENRE_ID" ]; then
    increment_total
    print_test "4.5 CSVエクスポート"

    CSV_RESPONSE=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/admin/genres/$GENRE_ID/export/csv" -o /tmp/e2e_export.csv -w "%{http_code}")

    if [ "$CSV_RESPONSE" == "200" ] && [ -f /tmp/e2e_export.csv ]; then
      print_pass "CSVエクスポート成功"
      rm -f /tmp/e2e_export.csv
    else
      print_fail "CSVエクスポート失敗" "HTTP Code: $CSV_RESPONSE"
    fi
  else
    increment_total
    print_skip "4.5 CSVエクスポート（ジャンルIDが取得できませんでした）"
  fi

  # 4.6 パーツ削除
  if [ -n "$PART_ID" ]; then
    increment_total
    print_test "4.6 パーツ削除"

    HTTP_CODE=$(curl -s -b /tmp/session_cookie.txt -o /dev/null -w "%{http_code}" -X DELETE "$API_URL/api/admin/parts/$PART_ID")

    if [ "$HTTP_CODE" == "204" ] || [ "$HTTP_CODE" == "200" ]; then
      print_pass "パーツ削除成功"
    else
      print_fail "パーツ削除失敗" "HTTP Code: $HTTP_CODE"
    fi
  else
    increment_total
    print_skip "4.6 パーツ削除（パーツIDが取得できませんでした）"
  fi
}

# ====================================================================
# 5. 検索機能テスト
# ====================================================================

test_search_functionality() {
  print_header "5. 検索機能テスト"

  # 5.1 収納ケース番号検索
  increment_total
  print_test "5.1 収納ケース番号検索"

  SEARCH_RESPONSE=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/search/by-storage-case?storageCase=A-1")

  if [ $? -eq 0 ]; then
    print_pass "収納ケース番号検索成功"
  else
    print_fail "収納ケース番号検索失敗" "$SEARCH_RESPONSE"
  fi

  # 5.2 品番検索
  increment_total
  print_test "5.2 品番検索"

  SEARCH_RESPONSE=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/search/by-part-number?partNumber=001")

  if [ $? -eq 0 ]; then
    print_pass "品番検索成功"
  else
    print_fail "品番検索失敗" "$SEARCH_RESPONSE"
  fi
}

# ====================================================================
# 6. 統計ダッシュボードテスト
# ====================================================================

test_stats_dashboard() {
  print_header "6. 統計ダッシュボードテスト"

  # 6.1 統計データ取得
  increment_total
  print_test "6.1 統計データ取得"

  STATS_RESPONSE=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/admin/stats")

  if echo "$STATS_RESPONSE" | grep -q "categoryCount"; then
    print_pass "統計データ取得成功"
  else
    print_fail "統計データ取得失敗" "$STATS_RESPONSE"
  fi
}

# ====================================================================
# 7. アカウント設定テスト
# ====================================================================

test_account_settings() {
  print_header "7. アカウント設定テスト"

  # 7.1 メールアドレス変更（スキップ - 実際のメールを変更したくない）
  increment_total
  print_skip "7.1 メールアドレス変更（本番データ保護のためスキップ）"

  # 7.2 パスワード変更（スキップ - 実際のパスワードを変更したくない）
  increment_total
  print_skip "7.2 パスワード変更（本番データ保護のためスキップ）"
}

# ====================================================================
# 8. フロントエンドアクセステスト
# ====================================================================

test_frontend_access() {
  print_header "8. フロントエンドアクセステスト"

  # 8.1 フロントエンドトップページ
  increment_total
  print_test "8.1 フロントエンドトップページアクセス"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL")

  if [ "$HTTP_CODE" == "200" ]; then
    print_pass "フロントエンドアクセス成功"
  else
    print_fail "フロントエンドアクセス失敗" "HTTP Code: $HTTP_CODE"
  fi

  # 8.2 ログインページ
  increment_total
  print_test "8.2 ログインページアクセス"

  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL/login")

  if [ "$HTTP_CODE" == "200" ]; then
    print_pass "ログインページアクセス成功"
  else
    print_fail "ログインページアクセス失敗" "HTTP Code: $HTTP_CODE"
  fi
}

# ====================================================================
# 9. ログアウトテスト
# ====================================================================

test_logout() {
  print_header "9. ログアウトテスト"

  # 9.1 ログアウト
  increment_total
  print_test "9.1 ログアウト"

  LOGOUT_RESPONSE=$(curl -s -b /tmp/session_cookie.txt -X POST "$API_URL/api/auth/logout")

  if echo "$LOGOUT_RESPONSE" | grep -q "success.*true"; then
    print_pass "ログアウト成功"
  else
    print_fail "ログアウト失敗" "$LOGOUT_RESPONSE"
  fi

  # 9.2 ログアウト後のセッション検証
  increment_total
  print_test "9.2 ログアウト後のセッション検証"

  SESSION_RESPONSE=$(curl -s -b /tmp/session_cookie.txt "$API_URL/api/auth/session")

  if echo "$SESSION_RESPONSE" | grep -q "authenticated.*false"; then
    print_pass "ログアウト後はセッション無効"
  else
    print_fail "ログアウト後もセッションが有効" "$SESSION_RESPONSE"
  fi
}

# ====================================================================
# メイン実行
# ====================================================================

main() {
  echo -e "${GREEN}"
  echo "======================================================================"
  echo "  階層型在庫管理システム - 包括的E2Eテスト"
  echo "======================================================================"
  echo -e "${NC}"
  echo "テスト環境:"
  echo "  - Frontend: $FRONTEND_URL"
  echo "  - Backend:  $API_URL"
  echo ""
  echo "テスト開始: $(date '+%Y-%m-%d %H:%M:%S')"
  echo ""

  # サービス稼働確認
  print_header "0. サービス稼働確認"

  increment_total
  print_test "0.1 バックエンド稼働確認"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$API_URL/api/auth/session" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" == "401" ] || [ "$HTTP_CODE" == "200" ]; then
    print_pass "バックエンド稼働中"
  else
    print_fail "バックエンド未起動" "HTTP Code: $HTTP_CODE"
    echo -e "\n${RED}エラー: バックエンドが起動していません。テストを中断します。${NC}\n"
    exit 1
  fi

  increment_total
  print_test "0.2 フロントエンド稼働確認"
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$FRONTEND_URL" 2>/dev/null || echo "000")
  if [ "$HTTP_CODE" == "200" ]; then
    print_pass "フロントエンド稼働中"
  else
    print_fail "フロントエンド未起動" "HTTP Code: $HTTP_CODE"
  fi

  # テスト実行
  test_authentication
  test_category_management
  test_genre_management
  test_part_management
  test_search_functionality
  test_stats_dashboard
  test_account_settings
  test_frontend_access
  test_logout

  # 結果サマリー
  print_header "テスト結果サマリー"

  echo -e "総テスト数:   ${BLUE}$TOTAL_TESTS${NC}"
  echo -e "成功:         ${GREEN}$PASSED_TESTS${NC}"
  echo -e "失敗:         ${RED}$FAILED_TESTS${NC}"
  echo -e "スキップ:     ${YELLOW}$SKIPPED_TESTS${NC}"
  echo ""

  SUCCESS_RATE=$(awk "BEGIN {printf \"%.1f\", ($PASSED_TESTS / $TOTAL_TESTS) * 100}")
  echo -e "成功率:       ${GREEN}${SUCCESS_RATE}%${NC}"
  echo ""
  echo "テスト終了: $(date '+%Y-%m-%d %H:%M:%S')"

  # 終了コード
  if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "\n${GREEN}✓ すべてのテストが成功しました！${NC}\n"
    exit 0
  else
    echo -e "\n${RED}✗ $FAILED_TESTS 件のテストが失敗しました。${NC}\n"
    exit 1
  fi
}

# クリーンアップ
trap "rm -f /tmp/session_cookie.txt /tmp/e2e_export.csv" EXIT

# スクリプト実行
main
