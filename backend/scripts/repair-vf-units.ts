// ============================================================
// VFユニット不足パーツ補完スクリプト（一回限りのデータ修正）
// ============================================================
// ANTI SKID CONT (VF) / BRAKE PIPING (VF) は取り込み時に
// パーツが大量に欠落していた。展開図画像の一覧表を正として
// 不足パーツを補完する。price は画像に無いため null のまま。
//
// 使い方:
//   DATABASE_URL=... npx ts-node scripts/repair-vf-units.ts --dry-run
//   DATABASE_URL=... npx ts-node scripts/repair-vf-units.ts --apply
// ============================================================

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface CorrectPart {
  no: string; // 個別番号（unitNumber）
  partNumber: string;
  partName: string;
  pc: number; // 数量（quantity）
}

// 画像から書き起こした「正しい」一覧
const ANTI_SKID_VF: CorrectPart[] = [
  { no: '1', partNumber: '47660 RT10A', partName: 'UNIT ASSY-ANTI SKID', pc: 1 },
  { no: '2', partNumber: '47842 RT10B', partName: 'PLATE-ANTI SKID MTG', pc: 1 },
  { no: '3', partNumber: '47931 RT10A', partName: 'SENS ASSY-YAW', pc: 1 },
  { no: '4', partNumber: '47932 RTR5A', partName: 'MTG PLATE-SENS, YAW', pc: 1 },
  { no: '5', partNumber: '47900 RTR5B', partName: 'SENS ASSY-W/SPEED, RR', pc: 4 },
  { no: '6', partNumber: '47844 RTR5A', partName: 'BUSH-ABS UNIT MTG', pc: 4 },
  { no: '7', partNumber: '47934 RTR5A', partName: 'SPCR-SENS MTG', pc: 2 },
  { no: '8', partNumber: '47240 RT10A', partName: 'SENS ASSY-PRESS', pc: 2 },
  { no: '102', partNumber: '08006 RS020', partName: 'BOLT-CAP, M6 L=20', pc: 2 },
  { no: '103', partNumber: '08006 RS015', partName: 'BOLT-CAP, M6 L=15', pc: 2 },
  { no: '104', partNumber: '081A6 6165M', partName: 'BOLT-FLG', pc: 4 },
  { no: '105', partNumber: '08D10 RS015', partName: 'BOLT-CAP M10x1.0 L=15 TH=15', pc: 1 },
  { no: '201', partNumber: '08911 10510', partName: 'NUT, M5', pc: 4 },
  { no: '301', partNumber: '01131 RR050', partName: 'WASH-PLAIN, M5', pc: 4 },
  { no: '302', partNumber: '01131 RR060', partName: 'WASH-PLAIN, M6', pc: 4 },
  { no: '303', partNumber: '01131 RR100', partName: 'WASH-PLAIN, M10', pc: 1 },
];

const BRAKE_PIPING_VF: CorrectPart[] = [
  { no: '1', partNumber: '46250 RT10B', partName: 'TUBE-BRAKE SENS,FR', pc: 1 },
  { no: '2', partNumber: '46251 RT10B', partName: 'TUBE-BRAKE SENS,RR', pc: 1 },
  { no: '3', partNumber: '46262 RT10B', partName: 'TUBE-BRAKE FR CTR,LH', pc: 1 },
  { no: '4', partNumber: '46263 RT10B', partName: 'TUBE-BRAKE FR CTR,RH', pc: 1 },
  { no: '5', partNumber: '46264 RT10B', partName: 'TUBE-BRAKE RR FWD,LH', pc: 1 },
  { no: '6', partNumber: '46265 RT10B', partName: 'TUBE-BRAKE RR FWD,RH', pc: 1 },
  { no: '7', partNumber: '46258 RT10A', partName: 'TUBE-BRAKE FR,RH', pc: 1 },
  { no: '8', partNumber: '46259 RT10A', partName: 'TUBE-BRAKE FR,LH', pc: 1 },
  { no: '9', partNumber: '46260 RT10A', partName: 'TUBE-BRAKE RR,LH', pc: 1 },
  { no: '10', partNumber: '46261 RT10A', partName: 'TUBE-BRAKE RR,RH', pc: 1 },
  { no: '11', partNumber: '050C1 RR03D', partName: 'ADPT-BULKHEAD', pc: 4 },
  { no: '12', partNumber: '46288 RTR5A', partName: 'WASH-BULKHEAD,RR', pc: 2 },
  { no: '13', partNumber: '050D0 RR10D', partName: 'CONN-BRAKE TUBE', pc: 2 },
  { no: '14', partNumber: '050C2 RR10D', partName: 'ADPT-BULKHEAD 90DEG', pc: 2 },
  { no: '15', partNumber: '05009 RR310-D1', partName: 'ADPT', pc: 2 },
  { no: '16', partNumber: '05301 RRB10', partName: 'WASH', pc: 4 },
  { no: '17', partNumber: '46366 RTR5A', partName: 'WASH-BULKHEAD', pc: 2 },
  { no: '18', partNumber: '46255 RT10C', partName: 'CONN-BRAKE & CLUTCH', pc: 1 },
  { no: '21', partNumber: '46212 RT10A', partName: 'HOSE-FR CALIPER,RH', pc: 1 },
  { no: '22', partNumber: '46213 RT10A', partName: 'HOSE-FR CALIPER,LH', pc: 1 },
  { no: '23', partNumber: '46280 RT10B', partName: 'HOSE-RR CALIPER', pc: 2 },
  { no: '100', partNumber: '08006 RS015', partName: 'BOLT-CAP M6x1.0 L=15', pc: 2 },
  { no: '300', partNumber: '01131 RR060', partName: 'WASH-PLAIN M6', pc: 2 },
];

const TARGETS: { unitName: string; correct: CorrectPart[] }[] = [
  { unitName: 'ANTI SKID CONT (VF)', correct: ANTI_SKID_VF },
  { unitName: 'BRAKE PIPING (VF)', correct: BRAKE_PIPING_VF },
];

async function ensurePartMaster(tx: any, partNumber: string) {
  const existing = await tx.partMaster.findUnique({ where: { partNumber } });
  if (!existing) {
    await tx.partMaster.create({ data: { partNumber, stockQuantity: 0 } });
  }
}

async function main() {
  const apply = process.argv.includes('--apply');
  console.log(apply ? '=== APPLY モード ===' : '=== DRY-RUN モード ===');

  for (const target of TARGETS) {
    const unit = await prisma.unit.findFirst({
      where: { unitName: target.unitName },
      include: { parts: true },
    });
    if (!unit) {
      console.log(`❌ ユニットが見つかりません: ${target.unitName}`);
      continue;
    }

    const existingByNo = new Set(unit.parts.map((p) => p.unitNumber));
    const missing = target.correct.filter((c) => !existingByNo.has(c.no));

    console.log(
      `\n■ ${target.unitName}: 現在${unit.parts.length}件 / 正${target.correct.length}件 / 不足${missing.length}件`,
    );
    if (missing.length === 0) {
      console.log('  → 不足なし。スキップ');
      continue;
    }
    missing.forEach((m) =>
      console.log(`  + [${m.no}] ${m.partNumber}  ${m.partName}  x${m.pc}`),
    );

    if (!apply) continue;

    // 末尾のsortOrderから続ける
    let sortOrder =
      unit.parts.reduce((mx, p) => Math.max(mx, p.sortOrder), -1) + 1;

    await prisma.$transaction(async (tx) => {
      for (const m of missing) {
        await ensurePartMaster(tx, m.partNumber);
        await tx.part.create({
          data: {
            genreId: unit.genreId,
            unitId: unit.id,
            unitNumber: m.no,
            partNumber: m.partNumber,
            partName: m.partName,
            quantity: m.pc,
            price: null, // 画像に価格が無いため未設定
            sortOrder: sortOrder++,
          },
        });
      }
    });
    console.log(`  ✅ ${missing.length}件を追加しました`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
