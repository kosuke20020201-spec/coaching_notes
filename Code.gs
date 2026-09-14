/**
 * Session OS - クラウドバックアップ用 Apps Script
 *
 * セットアップ:
 * 1. 新しいGoogleスプレッドシートを作成する
 * 2. 拡張機能 → Apps Script を開く
 * 3. デフォルトのコードを全部消して、このファイルの内容を貼り付ける
 * 4. 上部の「デプロイ」→「新しいデプロイ」
 *    - 種類: ウェブアプリ
 *    - 実行するユーザー: 自分
 *    - アクセスできるユーザー: 全員
 * 5. デプロイ後に表示される「ウェブアプリのURL」をコピー
 * 6. Session OSの設定（⚙アイコン）にそのURLを貼り付ける
 *
 * コードを更新した場合は「デプロイ」→「デプロイを管理」→ 編集 → バージョン「新バージョン」で再デプロイすること。
 * (URLは変わらないので、Session OS側の設定はそのままでOK)
 */

const SHEET_NAME = "Backup";
const KEEP_ROWS = 30; // 直近何件の履歴を残すか

function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheet = getSheet_();
    sheet.appendRow([
      new Date().toISOString(),
      (payload.notes || []).length,
      (payload.folders || []).length,
      JSON.stringify(payload),
    ]);
    trimSheet_(sheet);
    return jsonOutput_({ ok: true });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function doGet(e) {
  try {
    const sheet = getSheet_();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) {
      return jsonOutput_({ ok: true, payload: null });
    }
    const row = sheet.getRange(lastRow, 1, 1, 4).getValues()[0];
    return jsonOutput_({
      ok: true,
      timestamp: row[0],
      payload: JSON.parse(row[3]),
    });
  } catch (err) {
    return jsonOutput_({ ok: false, error: String(err) });
  }
}

function getSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.appendRow(["timestamp", "note_count", "folder_count", "payload_json"]);
  }
  return sheet;
}

function trimSheet_(sheet) {
  const lastRow = sheet.getLastRow();
  const dataRows = lastRow - 1;
  if (dataRows > KEEP_ROWS) {
    sheet.deleteRows(2, dataRows - KEEP_ROWS);
  }
}

function jsonOutput_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
