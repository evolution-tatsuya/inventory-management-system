// ============================================================
// bulkPdfExport
// ============================================================
// カテゴリー配下の複数ユニットを1つのPDFにまとめて出力するユーティリティ。
// レイアウト2種（2枚構成 / 混在）、出力項目チェック、画質3段階に対応。
// ブラウザ側で html2canvas → jsPDF によりページを連結する。
// ============================================================

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { diagramImagesApi } from '@/services/api';
import type { DiagramImage } from '@/types';

// ------------------------------------------------------------
// 型定義
// ------------------------------------------------------------

// 出力できる列（項目）
export type ExportColumnKey =
  | 'image'
  | 'unitNumber'
  | 'unitIndividualNumber'
  | 'partNumber'
  | 'partName'
  | 'quantity'
  | 'stock'
  | 'price'
  | 'storageCase'
  | 'orderDate'
  | 'arrivalDate'
  | 'notes';

export const EXPORT_COLUMNS: { key: ExportColumnKey; label: string; en: string }[] = [
  { key: 'image', label: '画像', en: 'Image' },
  { key: 'unitNumber', label: 'ユニット番号', en: 'Unit No.' },
  { key: 'unitIndividualNumber', label: 'ユニット個別番号', en: 'Unit Individual No.' },
  { key: 'partNumber', label: '品番', en: 'Part No.' },
  { key: 'partName', label: '品名', en: 'Part Name' },
  { key: 'quantity', label: '数量', en: 'Units' },
  { key: 'stock', label: '在庫数量', en: 'Stock' },
  { key: 'price', label: '価格', en: 'List Price' },
  { key: 'storageCase', label: '収納ケース', en: 'Storage' },
  { key: 'orderDate', label: '発注日', en: 'Order Date' },
  { key: 'arrivalDate', label: '入荷予定日', en: 'Arrival Date' },
  { key: 'notes', label: '備考', en: 'Notes' },
];

export type ExportLayout = 'two-page' | 'mixed';

export type ExportQuality = 'light' | 'standard' | 'high';

// 画質プリセット：html2canvasのscaleとCloudinary変換幅
export const QUALITY_PRESETS: Record<
  ExportQuality,
  { label: string; scale: number; cloudinaryWidth: number }
> = {
  light: { label: '軽量', scale: 2, cloudinaryWidth: 400 },
  standard: { label: '標準', scale: 3, cloudinaryWidth: 800 },
  high: { label: '高画質', scale: 4, cloudinaryWidth: 1200 },
};

// 1ユニット分の入力データ
export interface ExportUnit {
  unitId: string;
  unitNumber?: string | null;
  unitName?: string | null;
  parts: any[]; // partMaster/unit をincludeしたPartオブジェクト
}

export interface BulkExportOptions {
  categoryName: string;
  units: ExportUnit[];
  columns: ExportColumnKey[];
  layout: ExportLayout;
  quality: ExportQuality;
  includeDiagram: boolean;
  onProgress?: (done: number, total: number, label: string) => void;
}

// ------------------------------------------------------------
// ヘルパー
// ------------------------------------------------------------

// Cloudinary URLに変換パラメータ（幅・自動品質・自動フォーマット）を挿入して軽量化する。
// Cloudinary以外のURLはそのまま返す。
function withCloudinaryTransform(url: string, width: number): string {
  if (!url || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) {
    return url;
  }
  // 既に変換が入っている場合は二重付与を避ける
  const transform = `w_${width},c_limit,q_auto,f_auto`;
  return url.replace('/upload/', `/upload/${transform}/`);
}

function escapeHtml(value: unknown): string {
  const s = value === null || value === undefined ? '' : String(value);
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(value: any): string {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('ja-JP');
  } catch {
    return '';
  }
}

// 1つのセル値をカラムキーから取り出す
function cellValue(part: any, key: ExportColumnKey): string {
  switch (key) {
    case 'unitNumber':
      return escapeHtml(part.unit?.unitNumber || '-');
    case 'unitIndividualNumber':
      return escapeHtml(part.unitNumber || '');
    case 'partNumber':
      return escapeHtml(part.partNumber || '');
    case 'partName':
      return escapeHtml(part.partName || '');
    case 'quantity':
      return escapeHtml(part.quantity ?? '-');
    case 'stock': {
      const stock = part.partMaster?.stockQuantity ?? 0;
      const cls = stock === 0 ? ' class="stock-zero"' : '';
      // stockはtd属性が必要なので特別扱い（呼び出し側で処理）
      return `${cls}__STOCK__${stock}`;
    }
    case 'price':
      return part.price ? `¥${Number(part.price).toLocaleString()}` : '-';
    case 'storageCase':
      return escapeHtml(part.storageCase || '');
    case 'orderDate':
      return formatDate(part.orderDate);
    case 'arrivalDate':
      return formatDate(part.expectedArrivalDate);
    case 'notes':
      return escapeHtml(part.notes || '');
    default:
      return '';
  }
}

// テーブルHTMLを生成
function buildTableHtml(
  unit: ExportUnit,
  columns: ExportColumnKey[],
  quality: ExportQuality,
): string {
  const width = QUALITY_PRESETS[quality].cloudinaryWidth;
  const showImage = columns.includes('image');
  const dataColumns = columns.filter((c) => c !== 'image');

  const headerCells = [
    ...(showImage ? ['<th style="width: 50px;">画像<br/>Image</th>'] : []),
    ...dataColumns.map((c) => {
      const col = EXPORT_COLUMNS.find((x) => x.key === c)!;
      return `<th>${col.label}<br/>${col.en}</th>`;
    }),
  ].join('');

  const rows = unit.parts
    .map((part) => {
      const imgCell = showImage
        ? `<td><img src="${withCloudinaryTransform(
            part.imageUrl || '',
            Math.min(width, 200),
          )}" class="part-image" crossorigin="anonymous" /></td>`
        : '';
      const dataCells = dataColumns
        .map((c) => {
          const raw = cellValue(part, c);
          // stockの赤字対応
          if (typeof raw === 'string' && raw.includes('__STOCK__')) {
            const isZero = raw.includes('class="stock-zero"');
            const num = raw.split('__STOCK__')[1];
            return `<td${isZero ? ' class="stock-zero"' : ''}>${num}</td>`;
          }
          return `<td>${raw}</td>`;
        })
        .join('');
      return `<tr>${imgCell}${dataCells}</tr>`;
    })
    .join('');

  return `
    <table>
      <thead><tr>${headerCells}</tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

// 展開図HTML（メイン＋サブ）
function buildDiagramHtml(diagrams: DiagramImage[], quality: ExportQuality): string {
  if (diagrams.length === 0) return '';
  const width = QUALITY_PRESETS[quality].cloudinaryWidth;
  const imgs = diagrams
    .map(
      (d) =>
        `<img src="${withCloudinaryTransform(
          d.imageUrl,
          width,
        )}" style="max-width: 45%; height: auto; margin: 4px; display: inline-block; vertical-align: top;" crossorigin="anonymous" />`,
    )
    .join('');
  return `<div style="text-align: center; margin-bottom: 12px;">${imgs}</div>`;
}

// 共通のHTMLラッパ
function wrapHtml(inner: string): string {
  return `
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body {
            font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
            margin: 0; padding: 10px;
          }
          h1 { font-size: 10px; margin-bottom: 5px; font-weight: bold; }
          .info { font-size: 6px; margin-bottom: 10px; line-height: 1.4; }
          table { width: 100%; border-collapse: collapse; font-size: 5px; }
          th, td { border: none; padding: 2px 1px; text-align: left; white-space: nowrap; }
          th {
            background-color: #f5f5f5; font-weight: bold; font-size: 5px;
            line-height: 1.2; border-bottom: 0.5px solid #ddd;
          }
          tr:not(:last-child) td { border-bottom: 0.5px solid #f0f0f0; }
          .stock-zero { color: #d32f2f; font-weight: bold; }
          .part-image { width: 40px; height: 30px; object-fit: cover; }
        </style>
      </head>
      <body>${inner}</body>
    </html>
  `;
}

// HTML文字列をiframeでレンダリングしてcanvas化
async function renderHtmlToCanvas(
  html: string,
  scale: number,
): Promise<HTMLCanvasElement> {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'absolute';
  iframe.style.left = '-9999px';
  iframe.style.width = '800px';
  document.body.appendChild(iframe);

  try {
    const doc = iframe.contentDocument || iframe.contentWindow?.document;
    if (!doc) throw new Error('iframe document を取得できませんでした');
    doc.open();
    doc.write(html);
    doc.close();

    // 画像読み込み待ち
    await new Promise((resolve) => setTimeout(resolve, 500));

    return await html2canvas(doc.body, {
      scale,
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff',
    });
  } finally {
    document.body.removeChild(iframe);
  }
}

// canvasをpdfへ（A4縦、複数ページ分割）。isFirstPageがfalseなら先頭でaddPageする。
function addCanvasToPdf(pdf: jsPDF, canvas: HTMLCanvasElement, isFirstPage: boolean) {
  const pdfWidth = 210;
  const pdfHeight = 297;
  const marginX = 10;
  const marginY = 10;
  const maxWidth = pdfWidth - marginX * 2;
  const contentHeight = pdfHeight - marginY * 2;

  const imgWidthInPdf = maxWidth;
  const imgHeightInPdf = (canvas.height * imgWidthInPdf) / canvas.width;
  const xOffset = (pdfWidth - imgWidthInPdf) / 2;

  let remainingHeight = imgHeightInPdf;
  let sourceY = 0;
  let localPage = 0;

  while (remainingHeight > 0) {
    if (!(isFirstPage && localPage === 0)) {
      pdf.addPage();
    }
    const heightInThisPage = Math.min(contentHeight, remainingHeight);
    const sourceHeight = (heightInThisPage * canvas.width) / imgWidthInPdf;

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = canvas.width;
    pageCanvas.height = sourceHeight;
    const ctx = pageCanvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(
        canvas,
        0,
        sourceY,
        canvas.width,
        sourceHeight,
        0,
        0,
        canvas.width,
        sourceHeight,
      );
      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.85);
      pdf.addImage(pageImgData, 'JPEG', xOffset, marginY, imgWidthInPdf, heightInThisPage);
    }

    sourceY += sourceHeight;
    remainingHeight -= heightInThisPage;
    localPage++;
  }
}

// ------------------------------------------------------------
// メイン：カテゴリー配下の複数ユニットを1PDFに出力
// ------------------------------------------------------------
export async function exportBulkPdf(options: BulkExportOptions): Promise<void> {
  const { categoryName, units, columns, layout, quality, includeDiagram, onProgress } =
    options;
  const scale = QUALITY_PRESETS[quality].scale;

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  let isFirstPage = true;
  const total = units.length;

  for (let i = 0; i < units.length; i++) {
    const unit = units[i];
    const label = unit.unitName || unit.unitNumber || `ユニット${i + 1}`;
    onProgress?.(i, total, label);

    // 展開図を取得（含める設定のときのみ）
    let diagrams: DiagramImage[] = [];
    if (includeDiagram) {
      try {
        diagrams = await diagramImagesApi.listDiagramImages(unit.unitId);
      } catch {
        diagrams = [];
      }
    }

    const heading = `
      <h1>${escapeHtml(categoryName)} / ${escapeHtml(label)}</h1>
      <div class="info">
        <div>ユニット: ${escapeHtml(unit.unitName || '')}${
          unit.unitNumber ? `（${escapeHtml(unit.unitNumber)}）` : ''
        }</div>
        <div>件数: ${unit.parts.length}件</div>
      </div>
    `;

    const diagramHtml = includeDiagram ? buildDiagramHtml(diagrams, quality) : '';
    const tableHtml = buildTableHtml(unit, columns, quality);

    if (layout === 'two-page') {
      // 1枚目：見出し＋展開図（展開図が無ければ見出しのみ）
      const page1 = wrapHtml(heading + diagramHtml);
      const canvas1 = await renderHtmlToCanvas(page1, scale);
      addCanvasToPdf(pdf, canvas1, isFirstPage);
      isFirstPage = false;

      // 2枚目：リストのみ
      const page2 = wrapHtml(heading + tableHtml);
      const canvas2 = await renderHtmlToCanvas(page2, scale);
      addCanvasToPdf(pdf, canvas2, false);
    } else {
      // 混在：見出し＋展開図＋リストを1フロー（内容量に応じて自動改ページ）
      const page = wrapHtml(heading + diagramHtml + tableHtml);
      const canvas = await renderHtmlToCanvas(page, scale);
      addCanvasToPdf(pdf, canvas, isFirstPage);
      isFirstPage = false;
    }
  }

  onProgress?.(total, total, '完了');

  const dateStr = new Date().toISOString().slice(0, 10);
  const safeName = categoryName.replace(/[\\/:*?"<>|]/g, '_');
  pdf.save(`${safeName}_一括出力_${dateStr}.pdf`);
}
