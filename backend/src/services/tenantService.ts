// ============================================================
// tenantService: テナント管理（master運営者用）
// ============================================================
// テナントの発行・一覧・複製・状態変更・キー再発行・削除・バックアップ、
// および購入者用のライセンスキー有効化。
// ============================================================

import crypto from 'crypto';
import bcrypt from 'bcrypt';
import { prisma } from '../lib/prisma';

// 紛らわしい文字（I/O/0/1）を除いた Crockford Base32 相当
const KEY_ALPHABET = '23456789ABCDEFGHJKMNPQRSTVWXYZ';

// XXXX-XXXX-XXXX-XXXX 形式のライセンスキーを生成
function generateLicenseKey(): string {
  const bytes = crypto.randomBytes(16);
  const chars: string[] = [];
  for (let i = 0; i < 16; i++) {
    chars.push(KEY_ALPHABET[bytes[i] % KEY_ALPHABET.length]);
  }
  return [
    chars.slice(0, 4).join(''),
    chars.slice(4, 8).join(''),
    chars.slice(8, 12).join(''),
    chars.slice(12, 16).join(''),
  ].join('-');
}

// ユニークな licenseKey で create を試行（P2002衝突時リトライ）
async function createWithUniqueKey<T>(
  fn: (key: string) => Promise<T>,
  maxRetry = 5,
): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < maxRetry; i++) {
    try {
      return await fn(generateLicenseKey());
    } catch (e: any) {
      if (e?.code === 'P2002' && Array.isArray(e?.meta?.target) &&
          e.meta.target.includes('licenseKey')) {
        lastErr = e;
        continue; // キー衝突 → 再生成してリトライ
      }
      throw e;
    }
  }
  throw lastErr;
}

const SLUG_RE = /^[a-z0-9-]+$/;

export const tenantService = {
  // テナント一覧（件数サマリー＋admin一覧付き。パスワードは含めない）
  async listTenants() {
    const tenants = await prisma.tenant.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { categories: true, genres: true, units: true, parts: true },
        },
        admins: {
          select: {
            id: true,
            email: true,
            name: true,
            companyName: true,
            department: true,
            role: true,
            createdAt: true,
            lastLoginAt: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    // 画像枚数を集計（imageUrl が入っている genre/unit/part ＋ 全 diagramImage）。
    // Cloudinary容量の目安。テナント数は少ないので個別集計で十分。
    const withImages = await Promise.all(
      tenants.map(async (t) => {
        const [genreImg, unitImg, partImg, diagramImg] = await Promise.all([
          prisma.genre.count({ where: { tenantId: t.id, imageUrl: { not: null } } }),
          prisma.unit.count({ where: { tenantId: t.id, imageUrl: { not: null } } }),
          prisma.part.count({ where: { tenantId: t.id, imageUrl: { not: null } } }),
          prisma.diagramImage.count({ where: { tenantId: t.id } }),
        ]);
        return { ...t, imageCount: genreImg + unitImg + partImg + diagramImg };
      }),
    );
    return withImages;
  },

  // テナント詳細（顧客の登録/変更が反映される。運営者が確認用）
  async getTenantDetail(id: string) {
    const tenant = await prisma.tenant.findUnique({
      where: { id },
      include: {
        _count: {
          select: { categories: true, genres: true, units: true, parts: true },
        },
        admins: {
          select: { id: true, email: true, name: true, role: true, createdAt: true, updatedAt: true },
          orderBy: { createdAt: 'asc' },
        },
        users: {
          select: { id: true, email: true, name: true, createdAt: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
    if (!tenant) throw new Error('Tenant not found');
    return tenant;
  },

  // 全テナント横断サマリー
  async getSummary() {
    const [total, active, pending, suspended, partTotal] = await Promise.all([
      prisma.tenant.count(),
      prisma.tenant.count({ where: { status: 'active' } }),
      prisma.tenant.count({ where: { status: 'pending' } }),
      prisma.tenant.count({ where: { status: 'suspended' } }),
      prisma.part.count(),
    ]);
    return { total, active, pending, suspended, partTotal };
  },

  // テナント発行（admin無しで pending 発行。複製元指定時はカテゴリー複製）
  async createTenant(data: {
    name: string;
    slug: string;
    stockMode?: 'shared' | 'perCategory';
    sourceCategoryId?: string;
  }) {
    const slug = data.slug.trim().toLowerCase();
    if (!SLUG_RE.test(slug)) {
      throw new Error('slug は英小文字・数字・ハイフンのみ使用できます');
    }
    const existing = await prisma.tenant.findUnique({ where: { slug } });
    if (existing) {
      throw new Error('このslugは既に使用されています');
    }
    const stockMode = data.stockMode ?? 'perCategory';

    // Tenant + SystemSettings を作成（admin はキー有効化時に顧客が登録）
    const tenant = await createWithUniqueKey((licenseKey) =>
      prisma.tenant.create({
        data: {
          name: data.name,
          slug,
          stockMode,
          status: 'pending',
          licenseKey,
          systemSettings: {
            create: { stockMode, systemName: data.name },
          },
        },
      }),
    );

    // 複製元カテゴリーが指定されていれば、そのカテゴリーを新テナントへコピー
    let cloned: { categoryId: string; parts: number } | null = null;
    if (data.sourceCategoryId) {
      cloned = await this.cloneCategoryInto(tenant.id, data.sourceCategoryId, stockMode);
    }

    return { tenant, cloned };
  },

  // 既存カテゴリーを別テナントへ複製（duplicate-category.ts のパターンをtenantId対応に移植）
  async cloneCategoryInto(
    targetTenantId: string,
    sourceCategoryId: string,
    stockMode: 'shared' | 'perCategory',
  ) {
    const src = await prisma.category.findUnique({
      where: { id: sourceCategoryId },
      include: {
        genres: {
          include: { units: { include: { parts: true, diagramImage: true } }, parts: true },
        },
      },
    });
    if (!src) throw new Error('複製元カテゴリーが見つかりません');

    // 元カテゴリーの在庫を品番→数量で引く（複製先の在庫初期値に使う）
    const srcStockRows = await prisma.partMaster.findMany({
      where: { tenantId: src.tenantId, categoryId: stockMode === 'perCategory' ? src.id : null },
    });
    const srcStock = new Map(srcStockRows.map((r) => [r.partNumber, r.stockQuantity]));

    // 1) カテゴリー作成
    const maxCatOrder = await prisma.category.aggregate({
      where: { tenantId: targetTenantId },
      _max: { order: true },
    });
    const newCat = await prisma.category.create({
      data: {
        categoryId: src.categoryId,
        name: src.name,
        subtitle: src.subtitle,
        imageUrl: src.imageUrl,
        cropPositionX: src.cropPositionX,
        cropPositionY: src.cropPositionY,
        order: (maxCatOrder._max.order ?? -1) + 1,
        tenantId: targetTenantId,
      },
    });

    // 2) perCategory在庫レコードをまとめて作成
    if (stockMode === 'perCategory') {
      const pnSet = new Map<string, number>();
      for (const g of src.genres)
        for (const u of g.units)
          for (const p of u.parts)
            if (!pnSet.has(p.partNumber)) pnSet.set(p.partNumber, srcStock.get(p.partNumber) ?? 0);
      const stockData = Array.from(pnSet.entries()).map(([partNumber, stockQuantity]) => ({
        tenantId: targetTenantId,
        categoryId: newCat.id,
        partNumber,
        stockQuantity,
      }));
      for (let i = 0; i < stockData.length; i += 500) {
        await prisma.partMaster.createMany({
          data: stockData.slice(i, i + 500),
          skipDuplicates: true,
        });
      }
    }

    // 3) ジャンル→ユニット→展開図を作成、パーツはバッファに溜める
    const partsBuffer: any[] = [];
    for (const g of src.genres) {
      const newGenre = await prisma.genre.create({
        data: {
          genreId: g.genreId,
          categoryId: newCat.id,
          name: g.name,
          subtitle: g.subtitle,
          imageUrl: g.imageUrl,
          cropPositionX: g.cropPositionX,
          cropPositionY: g.cropPositionY,
          order: g.order,
          tenantId: targetTenantId,
        },
      });

      for (const u of g.units) {
        const newUnit = await prisma.unit.create({
          data: {
            genreId: newGenre.id,
            unitNumber: u.unitNumber,
            unitName: u.unitName,
            imageUrl: u.imageUrl,
            cropPositionX: u.cropPositionX,
            cropPositionY: u.cropPositionY,
            partsCount: u.partsCount,
            sortOrder: u.sortOrder,
            tenantId: targetTenantId,
          },
        });

        if (u.diagramImage.length > 0) {
          await prisma.diagramImage.createMany({
            data: u.diagramImage.map((d) => ({
              unitId: newUnit.id,
              imageUrl: d.imageUrl,
              imageType: d.imageType,
              isMain: d.isMain,
              sortOrder: d.sortOrder,
              tenantId: targetTenantId,
            })),
          });
        }

        for (const p of u.parts) {
          partsBuffer.push({
            genreId: newGenre.id,
            unitId: newUnit.id,
            unitNumber: p.unitNumber,
            partNumber: p.partNumber,
            partName: p.partName,
            quantity: p.quantity,
            price: p.price,
            currency: p.currency,
            originalPrice: p.originalPrice,
            storageCase: p.storageCase,
            notes: p.notes,
            orderDate: p.orderDate,
            expectedArrivalDate: p.expectedArrivalDate,
            imageUrl: p.imageUrl,
            cropPositionX: p.cropPositionX,
            cropPositionY: p.cropPositionY,
            sortOrder: p.sortOrder,
            tenantId: targetTenantId,
          });
        }
      }
    }

    // 4) パーツをチャンク投入
    let inserted = 0;
    for (let i = 0; i < partsBuffer.length; i += 500) {
      const res = await prisma.part.createMany({ data: partsBuffer.slice(i, i + 500) });
      inserted += res.count;
    }

    return { categoryId: newCat.id, parts: inserted };
  },

  // 状態変更（active↔suspended のみ。pending からの直接遷移は不可）
  async setStatus(id: string, status: 'active' | 'suspended') {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');
    if (tenant.status === 'pending') {
      throw new Error('未有効化テナントは停止/再開できません（キー有効化待ち）');
    }
    return prisma.tenant.update({ where: { id }, data: { status } });
  },

  // 契約/課金情報の更新（運営者用）。渡されたフィールドのみ更新。
  async updateBilling(
    id: string,
    data: {
      plan?: string | null;
      monthlyFee?: number | null;
      billingStatus?: string | null;
      contractStartDate?: string | null;
      nextBillingDate?: string | null;
      billingNote?: string | null;
    },
  ) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const ALLOWED_STATUS = ['trial', 'paid', 'unpaid', 'free'];
    if (
      data.billingStatus != null &&
      data.billingStatus !== '' &&
      !ALLOWED_STATUS.includes(data.billingStatus)
    ) {
      throw new Error('課金ステータスが不正です（trial/paid/unpaid/free）');
    }

    // 空文字は null に正規化。日付は Date へ。undefined は「更新しない」
    const toDate = (v: string | null | undefined) =>
      v === undefined ? undefined : v ? new Date(v) : null;
    const toStr = (v: string | null | undefined) =>
      v === undefined ? undefined : v === '' ? null : v;

    return prisma.tenant.update({
      where: { id },
      data: {
        plan: toStr(data.plan),
        monthlyFee: data.monthlyFee === undefined ? undefined : data.monthlyFee,
        billingStatus: toStr(data.billingStatus),
        contractStartDate: toDate(data.contractStartDate),
        nextBillingDate: toDate(data.nextBillingDate),
        billingNote: toStr(data.billingNote),
      },
    });
  },

  // ライセンスキー再発行
  async regenerateKey(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');
    return createWithUniqueKey((licenseKey) =>
      prisma.tenant.update({ where: { id }, data: { licenseKey } }),
    );
  },

  // テナント削除（多段階関門）
  async deleteTenant(id: string, confirmName: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');
    // 1) 既定テナントは削除禁止
    if (tenant.slug === 'default') {
      throw new Error('既定テナントは削除できません');
    }
    // 2) active（稼働中）は誤削除防止のため不可。pending（未有効化）/suspended（停止）は削除可。
    //    active は先に停止(suspended)させてから削除する。
    if (tenant.status === 'active') {
      throw new Error('稼働中のテナントは削除できません。先に停止(suspended)してください');
    }
    // 3) 確認名の厳密一致
    if (confirmName !== tenant.name) {
      throw new Error('確認のためテナント名を正確に入力してください');
    }
    // onDelete:Cascade で関連（admin/user/category/genre/unit/part/partMaster/
    // diagramImage/systemSettings/stockCountLog）が連鎖削除される
    await prisma.tenant.delete({ where: { id } });
    return { success: true };
  },

  // 削除前バックアップ（全モデルのdump）。JSONとCSV(parts)の両方をフロントで使う
  async exportTenantBackup(id: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id } });
    if (!tenant) throw new Error('Tenant not found');

    const [categories, genres, units, parts, partMasters, diagramImages, admins, users, systemSettings, stockCountLogs] =
      await Promise.all([
        prisma.category.findMany({ where: { tenantId: id } }),
        prisma.genre.findMany({ where: { tenantId: id } }),
        prisma.unit.findMany({ where: { tenantId: id } }),
        prisma.part.findMany({ where: { tenantId: id } }),
        prisma.partMaster.findMany({ where: { tenantId: id } }),
        prisma.diagramImage.findMany({ where: { tenantId: id } }),
        // adminはパスワードハッシュを含めない（復元時は再登録前提）
        prisma.admin.findMany({ where: { tenantId: id }, select: { id: true, email: true, name: true, role: true, createdAt: true } }),
        prisma.user.findMany({ where: { tenantId: id }, select: { id: true, email: true, name: true, createdAt: true } }),
        prisma.systemSettings.findMany({ where: { tenantId: id } }),
        prisma.stockCountLog.findMany({ where: { tenantId: id } }),
      ]);

    return {
      tenant,
      categories,
      genres,
      units,
      parts,
      partMasters,
      diagramImages,
      admins,
      users,
      systemSettings,
      stockCountLogs,
    };
  },

  // ライセンスキー有効化（購入者用・無認証）。顧客が自分のadminを登録する。
  async activate(data: {
    licenseKey: string;
    email: string;
    password: string;
    name?: string;
    companyName?: string;
    department?: string;
  }) {
    const key = data.licenseKey.trim().toUpperCase();
    // 登録者名は必須（企業登録時に誰が登録したか不明にしないため）
    const name = (data.name || '').trim();
    if (!name) {
      throw new Error('お名前を入力してください');
    }
    const tenant = await prisma.tenant.findUnique({ where: { licenseKey: key } });
    if (!tenant) {
      throw new Error('無効なライセンスキーです');
    }
    if (tenant.status !== 'pending') {
      throw new Error('このキーは既に有効化済み、または利用できません');
    }

    const hashed = await bcrypt.hash(data.password, 10);
    await prisma.$transaction([
      prisma.admin.create({
        data: {
          email: data.email,
          password: hashed,
          name,
          companyName: data.companyName?.trim() || null,
          department: data.department?.trim() || null,
          role: 'admin',
          tenantId: tenant.id,
        },
      }),
      prisma.tenant.update({ where: { id: tenant.id }, data: { status: 'active' } }),
    ]);

    return { slug: tenant.slug };
  },

  // ============================================================
  // EC連携：注文から pending テナントを発行する（冪等）。
  // 同一 orderId で再呼び出しされても新規発行せず既存を返す。
  // 決済確定後にECから呼ばれる想定。有効化は顧客が activate で行う。
  // ============================================================
  async provisionFromOrder(data: {
    orderId: string;
    email: string;
    plan?: string;
    billingType?: string; // monthly / yearly / onetime
    productId?: string; // EC の商品ID（記録用）
    limits?: { maxParts?: number | null; maxImageMB?: number | null; maxUsers?: number | null };
    frontendUrl: string;
  }) {
    const orderId = (data.orderId || '').trim();
    if (!orderId) throw new Error('orderId は必須です');

    const activationUrlOf = (key: string) =>
      `${data.frontendUrl.replace(/\/+$/, '')}/activate?key=${key}`;

    // 冪等：同一注文で発行済みならそれを返す
    const existing = await prisma.tenant.findUnique({ where: { provisionOrderId: orderId } });
    if (existing) {
      return {
        alreadyProvisioned: true,
        slug: existing.slug,
        licenseKey: existing.licenseKey,
        activationUrl: existing.licenseKey ? activationUrlOf(existing.licenseKey) : null,
        status: existing.status,
      };
    }

    // billingType → 課金ステータス（決済確定後に呼ばれる前提なので paid）
    const billingType = data.billingType || null;
    const billingStatus = 'paid';

    // slug 自動生成（ec-xxxxxxxx、英小文字数字）。衝突時リトライ。
    const genSlug = () =>
      'ec-' +
      Array.from(crypto.randomBytes(6))
        .map((b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32])
        .join('');

    let slug = genSlug();
    for (let i = 0; i < 5; i++) {
      const dup = await prisma.tenant.findUnique({ where: { slug } });
      if (!dup) break;
      slug = genSlug();
    }

    // テナント名は暫定（顧客が有効化時に会社名等を登録）。email をラベルに使う。
    const name = data.plan ? `${data.plan}（${data.email}）` : data.email;

    const tenant = await createWithUniqueKey((licenseKey) =>
      prisma.tenant.create({
        data: {
          name,
          slug,
          stockMode: 'perCategory',
          status: 'pending',
          licenseKey,
          plan: data.plan || null,
          billingType,
          billingStatus,
          provisionOrderId: orderId,
          ecProductId: data.productId || null,
          maxParts: data.limits?.maxParts ?? null,
          maxImageMB: data.limits?.maxImageMB ?? null,
          maxUsers: data.limits?.maxUsers ?? null,
          contractStartDate: new Date(),
          systemSettings: { create: { stockMode: 'perCategory', systemName: name } },
        },
      }),
    );

    return {
      alreadyProvisioned: false,
      slug: tenant.slug,
      licenseKey: tenant.licenseKey,
      activationUrl: tenant.licenseKey ? activationUrlOf(tenant.licenseKey) : null,
      status: tenant.status,
    };
  },

  // ============================================================
  // EC連携：既存テナントのプランを変更する（アップ/ダウングレード）。
  // ECのプラン変更(B:固定変更)を受けて上限・プラン情報を上書きする。
  // テナントは orderId（発行時の注文ID）または slug で特定。
  // 上限を下げても既存データは消さない（新規追加のみブロックされる設計）。
  // ============================================================
  async changePlan(data: {
    orderId?: string;
    slug?: string;
    plan?: string;
    billingType?: string;
    productId?: string;
    limits?: { maxParts?: number | null; maxImageMB?: number | null; maxUsers?: number | null };
  }) {
    let tenant = null;
    if (data.orderId) {
      tenant = await prisma.tenant.findUnique({ where: { provisionOrderId: data.orderId.trim() } });
    } else if (data.slug) {
      tenant = await prisma.tenant.findUnique({ where: { slug: data.slug.trim() } });
    }
    if (!tenant) throw new Error('対象テナントが見つかりません');

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: {
        plan: data.plan ?? tenant.plan,
        billingType: data.billingType ?? tenant.billingType,
        ecProductId: data.productId ?? tenant.ecProductId,
        // limits が渡された項目のみ更新（undefined は据え置き、null は無制限化）
        maxParts: data.limits && 'maxParts' in data.limits ? data.limits.maxParts ?? null : tenant.maxParts,
        maxImageMB: data.limits && 'maxImageMB' in data.limits ? data.limits.maxImageMB ?? null : tenant.maxImageMB,
        maxUsers: data.limits && 'maxUsers' in data.limits ? data.limits.maxUsers ?? null : tenant.maxUsers,
      },
      select: {
        slug: true, plan: true, ecProductId: true,
        maxParts: true, maxImageMB: true, maxUsers: true,
      },
    });
    return { success: true, ...updated };
  },

  // ============================================================
  // EC連携：解約/一時停止でテナントを停止する（冪等）
  // ============================================================
  // orderId（発行時の注文ID）でテナントを特定し suspended にする。
  // reason は記録用（cancelled=解約 / suspended=一時停止。挙動は同じ）。
  // ログイン・データ閲覧は requireAuth/tenantContext が403で止める。データは消さない。
  // ============================================================
  async suspendByOrder(data: { orderId: string; reason?: string }) {
    const orderId = (data.orderId || '').trim();
    if (!orderId) throw new Error('orderId は必須です');
    const tenant = await prisma.tenant.findUnique({ where: { provisionOrderId: orderId } });
    if (!tenant) throw new Error('対象テナントが見つかりません');

    // reason は cancelled / suspended のみ記録（それ以外は無視して 'suspended' 扱い）
    const reason =
      data.reason === 'cancelled' || data.reason === 'suspended' ? data.reason : null;

    // 冪等：既に suspended でも reason だけ更新して 200 で返す
    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'suspended', suspendReason: reason ?? tenant.suspendReason },
      select: { slug: true, status: true, suspendReason: true },
    });
    return { success: true, alreadySuspended: tenant.status === 'suspended', ...updated };
  },

  // ============================================================
  // EC連携：再契約でテナントを再開する（冪等）
  // ============================================================
  // 「同じ契約(orderId)を停止から再開」= status を active に戻すだけ。データはそのまま。
  // pending（キー未有効化）は対象外。
  // ============================================================
  async unsuspendByOrder(data: { orderId: string }) {
    const orderId = (data.orderId || '').trim();
    if (!orderId) throw new Error('orderId は必須です');
    const tenant = await prisma.tenant.findUnique({ where: { provisionOrderId: orderId } });
    if (!tenant) throw new Error('対象テナントが見つかりません');
    if (tenant.status === 'pending') {
      throw new Error('未有効化テナントは再開できません（キー有効化待ち）');
    }

    const updated = await prisma.tenant.update({
      where: { id: tenant.id },
      data: { status: 'active', suspendReason: null },
      select: { slug: true, status: true },
    });
    return { success: true, alreadyActive: tenant.status === 'active', ...updated };
  },

  // ============================================================
  // EC連携：解約後の再購入で「以前のテナント（データ）を引き継ぐ」（冪等）
  // ============================================================
  // 新しい注文(newOrderId)で、停止中の旧テナント(prevOrderId)を復活させる。
  // 旧テナントの provisionOrderId を新注文IDに付け替え、active に戻す。
  // 「新規発行(provision)」とは別物：本人が『引き継ぐ』を選んだ時だけ EC が呼ぶ。
  // newOrderId で既にテナントがあれば冪等にそれを返す（二重処理防止）。
  // ============================================================
  async reactivateWithNewOrder(data: {
    prevOrderId: string;
    newOrderId: string;
    plan?: string;
    billingType?: string;
    productId?: string;
    limits?: { maxParts?: number | null; maxImageMB?: number | null; maxUsers?: number | null };
  }) {
    const prevOrderId = (data.prevOrderId || '').trim();
    const newOrderId = (data.newOrderId || '').trim();
    if (!prevOrderId || !newOrderId) {
      throw new Error('prevOrderId と newOrderId は必須です');
    }

    // 冪等：新注文IDで既に処理済みならそれを返す
    const already = await prisma.tenant.findUnique({
      where: { provisionOrderId: newOrderId },
      select: { slug: true, status: true, provisionOrderId: true },
    });
    if (already) {
      return { success: true, alreadyReactivated: true, ...already };
    }

    const prev = await prisma.tenant.findUnique({ where: { provisionOrderId: prevOrderId } });
    if (!prev) throw new Error('引き継ぎ元テナントが見つかりません');

    const updated = await prisma.tenant.update({
      where: { id: prev.id },
      data: {
        provisionOrderId: newOrderId, // 新契約の注文IDに付け替え
        status: 'active',
        suspendReason: null,
        contractStartDate: new Date(),
        plan: data.plan ?? prev.plan,
        billingType: data.billingType ?? prev.billingType,
        billingStatus: 'paid',
        ecProductId: data.productId ?? prev.ecProductId,
        maxParts: data.limits && 'maxParts' in data.limits ? data.limits.maxParts ?? null : prev.maxParts,
        maxImageMB:
          data.limits && 'maxImageMB' in data.limits ? data.limits.maxImageMB ?? null : prev.maxImageMB,
        maxUsers: data.limits && 'maxUsers' in data.limits ? data.limits.maxUsers ?? null : prev.maxUsers,
      },
      select: { slug: true, status: true, provisionOrderId: true },
    });
    return { success: true, alreadyReactivated: false, ...updated };
  },
};
