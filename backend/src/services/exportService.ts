// ============================================================
// 階層型在庫管理システム - エクスポートサービス
// ============================================================
// CSV/PDFエクスポート、CSV一括インポート処理
// ============================================================

import { PrismaClient } from '@prisma/client';
import Papa from 'papaparse';
import PDFDocument from 'pdfkit';
import * as XLSX from 'xlsx';

const prisma = new PrismaClient();

// ============================================================
// エクスポートサービス
// ============================================================
export const exportService = {
  // CSVエクスポート（ジャンル内のパーツ一覧またはユニット別パーツ一覧）
  async exportToCSV(genreId: string, unitId?: string): Promise<string> {
    // ジャンルの存在確認
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
      include: {
        category: true,
      },
    });

    if (!genre) {
      throw new Error('Genre not found');
    }

    // パーツ一覧取得（unitIdが指定されている場合はそのユニットのみ）
    const parts = await prisma.part.findMany({
      where: unitId ? { genreId, unitId } : { genreId },
      include: {
        partMaster: true,
      },
      orderBy: { unitNumber: 'asc' },
    });

    // CSVデータ作成
    const csvData = parts.map((part) => ({
      リスト番号: part.unitNumber,
      品番: part.partNumber,
      品名: part.partName,
      数量: part.quantity ?? 0,
      在庫数: part.partMaster?.stockQuantity ?? 0,
      収納ケース番号: part.storageCase || '',
      発注日: part.orderDate ? new Date(part.orderDate).toLocaleDateString('ja-JP') : '',
      入荷予定日: part.expectedArrivalDate
        ? new Date(part.expectedArrivalDate).toLocaleDateString('ja-JP')
        : '',
      備考: part.notes || '',
    }));

    // CSV文字列生成
    const csv = Papa.unparse(csvData, {
      header: true,
    });

    // UTF-8 BOM を追加（Excel対応）
    return '\uFEFF' + csv;
  },

  // PDFエクスポート（ジャンル内のパーツ一覧またはユニット別パーツ一覧）
  async exportToPDF(genreId: string, unitId?: string): Promise<PDFKit.PDFDocument> {
    // ジャンルの存在確認
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
      include: {
        category: true,
      },
    });

    if (!genre) {
      throw new Error('Genre not found');
    }

    // ユニット情報取得（unitIdが指定されている場合）
    let unit = null;
    if (unitId) {
      unit = await prisma.unit.findUnique({
        where: { id: unitId },
      });
    }

    // パーツ一覧取得
    const parts = await prisma.part.findMany({
      where: unitId ? { genreId, unitId } : { genreId },
      include: {
        partMaster: true,
        unit: {
          select: { id: true, unitNumber: true, unitName: true },
        },
      },
      orderBy: { unitNumber: 'asc' },
    });

    // PDF生成（A4縦）
    const pdfOptions = { size: 'A4', margin: 10 };
    console.log('📄 PDF生成オプション:', pdfOptions);
    console.log('📐 A4縦サイズ: 595pt x 842pt（margin: 10pt）');
    const doc = new PDFDocument(pdfOptions);

    // フォント設定（日本語対応のため）
    // 注意: 実際の本番環境では日本語フォントをインストール必要
    // doc.font('path/to/japanese-font.ttf');

    // タイトル
    let title = `パーツリスト: ${genre.category.name} > ${genre.name}`;
    if (unit) {
      title += ` > ${unit.unitName} (Unit Code: ${unit.unitNumber})`;
    } else if (parts.length > 0 && parts[0].unit) {
      // ユニットIDが指定されていなくても、パーツにユニット情報がある場合は表示
      const firstUnit = parts[0].unit;
      title += ` > ${firstUnit.unitName} (Unit Code: ${firstUnit.unitNumber})`;
    }

    doc.fontSize(16).text(title, {
      align: 'center',
    });

    doc.moveDown();
    doc.fontSize(10).text(`作成日: ${new Date().toLocaleDateString('ja-JP')}`, {
      align: 'right',
    });

    doc.moveDown();

    // テーブルヘッダー
    const tableTop = doc.y;
    // A4縦 595pt - 左右余白20pt = 575pt を各列に配分
    const colWidths = {
      listNumber: 60,    // リスト番号
      partNumber: 100,   // 品番
      partName: 160,     // 品名
      quantity: 50,      // 数量
      stock: 50,         // 在庫
      storageCase: 80,   // 収納ケース
      notes: 75,         // 備考
    };

    const totalWidth = Object.values(colWidths).reduce((sum, w) => sum + w, 0);
    console.log('📊 テーブル列幅合計:', totalWidth, 'pt');
    console.log('📍 ページ幅:', doc.page.width, 'pt, 高さ:', doc.page.height, 'pt');

    doc.fontSize(9).font('Helvetica-Bold');

    const startX = doc.page.margins.left;  // 左余白から開始
    let x = startX;
    doc.text('リスト番号', x, tableTop, { width: colWidths.listNumber });
    x += colWidths.listNumber;
    doc.text('品番', x, tableTop, { width: colWidths.partNumber });
    x += colWidths.partNumber;
    doc.text('品名', x, tableTop, { width: colWidths.partName });
    x += colWidths.partName;
    doc.text('数量', x, tableTop, { width: colWidths.quantity });
    x += colWidths.quantity;
    doc.text('在庫', x, tableTop, { width: colWidths.stock });
    x += colWidths.stock;
    doc.text('収納ケース', x, tableTop, { width: colWidths.storageCase });
    x += colWidths.storageCase;
    doc.text('備考', x, tableTop, { width: colWidths.notes });

    // 線引き（A4縦幅 = 595ポイント、margin考慮）
    const lineY = doc.y + 5;
    doc
      .moveTo(startX, lineY)
      .lineTo(doc.page.width - doc.page.margins.right, lineY)
      .stroke();

    doc.moveDown();

    // データ行
    doc.font('Helvetica');
    parts.forEach((part, index) => {
      // 改ページチェック
      if (doc.y > 700) {
        doc.addPage();
        doc.fontSize(9);
      }

      const rowY = doc.y;
      x = startX;  // 左余白から開始

      doc.text(part.unitNumber, x, rowY, { width: colWidths.listNumber });
      x += colWidths.listNumber;
      doc.text(part.partNumber, x, rowY, { width: colWidths.partNumber });
      x += colWidths.partNumber;
      doc.text(part.partName, x, rowY, { width: colWidths.partName });
      x += colWidths.partName;
      doc.text(String(part.quantity ?? 0), x, rowY, {
        width: colWidths.quantity,
      });
      x += colWidths.quantity;
      doc.text(String(part.partMaster?.stockQuantity ?? 0), x, rowY, {
        width: colWidths.stock,
      });
      x += colWidths.stock;
      doc.text(part.storageCase || '-', x, rowY, { width: colWidths.storageCase });
      x += colWidths.storageCase;
      doc.text(part.notes || '-', x, rowY, { width: colWidths.notes });

      doc.moveDown(0.5);
    });

    // PDFストリーム終了
    doc.end();

    return doc;
  },

  // Excel → CSV変換ヘルパー関数
  convertExcelToCSV(buffer: Buffer): string {
    try {
      // Excelファイルを読み込み
      const workbook = XLSX.read(buffer, { type: 'buffer' });

      // 最初のシートを取得
      const firstSheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[firstSheetName];

      // CSV形式に変換
      const csv = XLSX.utils.sheet_to_csv(worksheet, { FS: ',', RS: '\n' });

      return csv;
    } catch (error) {
      throw new Error(
        `Excel parse error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
    }
  },

  // CSV一括インポート（ユニット内のパーツ一括作成）
  async importFromCSV(
    genreId: string,
    csvContent: string,
    targetUnitId?: string,
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    // ジャンルの存在確認
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      throw new Error('Genre not found');
    }

    // ユニットIDが指定されている場合、そのユニットの存在確認
    let targetUnit = null;
    if (targetUnitId) {
      targetUnit = await prisma.unit.findUnique({
        where: { id: targetUnitId },
      });
      if (!targetUnit) {
        throw new Error('Unit not found');
      }
    }

    // CSVパース（any型で受け取り、後で柔軟に処理）
    const parsed = Papa.parse<any>(csvContent, {
      header: true,
      skipEmptyLines: true,
    });

    if (parsed.errors && parsed.errors.length > 0) {
      throw new Error(`CSV parse error: ${parsed.errors[0].message}`);
    }

    const errors: string[] = [];
    let created = 0;
    let updated = 0;

    if (!parsed.data || parsed.data.length === 0) {
      throw new Error('No data found in CSV');
    }

    // トランザクション処理
    await prisma.$transaction(async (tx) => {
      for (const [index, row] of parsed.data.entries()) {
        const lineNumber = index + 2; // ヘッダー行を考慮

        try {
          // 列名の柔軟な取得（新旧フォーマット両対応）
          const unitNumber = (row['ユニット個別番号'] || row['リスト番号'] || '').trim();
          const partNumber = (row['品番'] || '').trim();
          const partName = (row['品名'] || '').trim();

          // 必須項目チェック
          if (!unitNumber || !partNumber || !partName) {
            errors.push(`行${lineNumber}: 必須項目が不足しています（ユニット個別番号、品番、品名）`);
            continue;
          }

          // 数量・在庫数量の取得（新フォーマット対応）
          const quantity = parseInt(row['数量'] || '0', 10);
          const stockQuantity = parseInt(row['在庫数量'] || row['在庫数'] || '0', 10);

          // 価格の取得（￥記号やカンマを除去）
          const priceStr = (row['価格'] || '0').toString().replace(/[￥¥,]/g, '');
          const price = parseFloat(priceStr) || 0;

          const storageCase = (row['収納ケース番号'] || '').trim() || null;
          const notes = (row['備考'] || '').trim() || null;

          // 日付パース（YYYY/MM/DD形式、M/D/YY形式、または Excelシリアル番号）
          const parseDate = (dateValue: any): Date | null => {
            if (!dateValue) return null;

            // Excelシリアル番号（数値）の場合
            if (typeof dateValue === 'number') {
              // Excelの基準日は1899年12月30日（シリアル番号0の日）
              // 1日 = 86400000ミリ秒
              const excelEpoch = new Date(Date.UTC(1899, 11, 30));
              const msPerDay = 24 * 60 * 60 * 1000;

              // Excelには1900年のうるう年バグがあるため、60日以降は1日引く
              let adjustedValue = dateValue;
              if (dateValue > 59) {
                adjustedValue = dateValue - 1;
              }

              const resultDate = new Date(excelEpoch.getTime() + adjustedValue * msPerDay);

              // UTCからローカルタイムゾーンに変換
              return new Date(resultDate.getUTCFullYear(), resultDate.getUTCMonth(), resultDate.getUTCDate());
            }

            // 文字列の場合
            const dateStr = String(dateValue).trim();
            if (!dateStr) return null;

            const parts = dateStr.split('/');
            if (parts.length !== 3) return null;

            // M/D/YY形式（例: "5/30/24"）の場合
            if (parts[0].length <= 2 && parts[1].length <= 2 && parts[2].length === 2) {
              const month = parseInt(parts[0]);
              const day = parseInt(parts[1]);
              let year = parseInt(parts[2]);

              // 2桁年を4桁に変換（00-49 → 2000-2049, 50-99 → 1950-1999）
              year += year < 50 ? 2000 : 1900;

              // 時刻を正午に設定（タイムゾーン問題回避）
              return new Date(year, month - 1, day, 12, 0, 0);
            }

            // YYYY/MM/DD形式の場合（時刻を正午に設定）
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]), 12, 0, 0);
          };

          // デバッグ: Excelから読み取った生の値を確認
          console.log(`🔍 行${lineNumber}: 発注日 = ${JSON.stringify(row.発注日)} (型: ${typeof row.発注日})`);
          console.log(`🔍 行${lineNumber}: 入荷予定日 = ${JSON.stringify(row.入荷予定日)} (型: ${typeof row.入荷予定日})`);

          const orderDate = parseDate(row.発注日);
          const expectedArrivalDate = parseDate(row.入荷予定日);

          console.log(`✅ 行${lineNumber}: 変換後の発注日 = ${orderDate?.toLocaleDateString('ja-JP')}`);
          console.log(`✅ 行${lineNumber}: 変換後の入荷予定日 = ${expectedArrivalDate?.toLocaleDateString('ja-JP')}`);

          // ⚠️ 重要: PartMasterを先に作成/更新（外部キー制約のため）
          await tx.partMaster.upsert({
            where: { partNumber },
            create: {
              partNumber,
              stockQuantity,
            },
            update: {
              stockQuantity,
            },
          });

          // ユニットIDを取得（targetUnitIdが指定されている場合はそれを使用）
          let unitId: string | null = null;
          if (targetUnitId) {
            // 指定されたユニットに限定
            unitId = targetUnitId;
          } else {
            // ユニット番号から検索
            const unit = await tx.unit.findFirst({
              where: {
                genreId,
                unitNumber,
              },
            });
            unitId = unit?.id || null;
          }

          // 既存パーツチェック（ジャンルID + ユニット番号 + パーツ番号で検索）
          const existingPart = await tx.part.findFirst({
            where: {
              genreId,
              unitNumber,
              partNumber,
            },
          });

          if (existingPart) {
            // 更新処理
            await tx.part.update({
              where: { id: existingPart.id },
              data: {
                unitId,
                partNumber,
                partName,
                quantity,
                price,
                storageCase,
                notes,
                orderDate,
                expectedArrivalDate,
              },
            });
            updated++;
          } else {
            // 新規作成
            await tx.part.create({
              data: {
                genreId,
                unitId,
                unitNumber,
                partNumber,
                partName,
                quantity,
                price,
                storageCase,
                notes,
                orderDate,
                expectedArrivalDate,
              },
            });
            created++;
          }
        } catch (error) {
          errors.push(`行${lineNumber}: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      }
    });

    return { created, updated, errors };
  },
};
