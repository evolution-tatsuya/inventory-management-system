// ============================================================
// 階層型在庫管理システム - エクスポートサービス
// ============================================================
// CSV/PDFエクスポート、CSV一括インポート処理
// ============================================================

import { PrismaClient } from '@prisma/client';
import Papa from 'papaparse';
import PDFDocument from 'pdfkit';

const prisma = new PrismaClient();

// ============================================================
// エクスポートサービス
// ============================================================
export const exportService = {
  // CSVエクスポート（ジャンル内のパーツ一覧）
  async exportToCSV(genreId: string): Promise<string> {
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

    // パーツ一覧取得
    const parts = await prisma.part.findMany({
      where: { genreId },
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
      listNumber: 70,    // リスト番号
      partNumber: 120,   // 品番
      partName: 180,     // 品名（最も広く）
      stock: 60,         // 在庫
      storageCase: 85,   // 収納ケース
      notes: 60,         // 備考
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

  // CSV一括インポート（ジャンル内のパーツ一括作成）
  async importFromCSV(
    genreId: string,
    csvContent: string,
  ): Promise<{ created: number; updated: number; errors: string[] }> {
    // ジャンルの存在確認
    const genre = await prisma.genre.findUnique({
      where: { id: genreId },
    });

    if (!genre) {
      throw new Error('Genre not found');
    }

    // CSVパース
    const parsed = Papa.parse<{
      リスト番号: string;
      品番: string;
      品名: string;
      在庫数: string;
      収納ケース番号: string;
      発注日: string;
      入荷予定日: string;
      備考: string;
    }>(csvContent, {
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
          // 必須項目チェック
          if (!row.リスト番号 || !row.品番 || !row.品名) {
            errors.push(`行${lineNumber}: 必須項目が不足しています`);
            continue;
          }

          const unitNumber = row.リスト番号.trim();
          const partNumber = row.品番.trim();
          const partName = row.品名.trim();
          const stockQuantity = parseInt(row.在庫数 || '0', 10);
          const storageCase = row.収納ケース番号?.trim() || null;
          const notes = row.備考?.trim() || null;

          // 日付パース（YYYY/MM/DD形式）
          const parseDate = (dateStr: string): Date | null => {
            if (!dateStr) return null;
            const parts = dateStr.split('/');
            if (parts.length !== 3) return null;
            return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
          };

          const orderDate = parseDate(row.発注日);
          const expectedArrivalDate = parseDate(row.入荷予定日);

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
                partNumber,
                partName,
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
                unitNumber,
                partNumber,
                partName,
                storageCase,
                notes,
                orderDate,
                expectedArrivalDate,
              },
            });
            created++;
          }

          // PartMaster更新（在庫数）
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
        } catch (error) {
          errors.push(`行${lineNumber}: ${error instanceof Error ? error.message : '不明なエラー'}`);
        }
      }
    });

    return { created, updated, errors };
  },
};
