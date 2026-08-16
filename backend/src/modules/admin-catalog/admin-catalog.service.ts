import { getPool, sql } from '../../config/database';
import { AppError } from '../../middleware/errorHandler';
import { normalizeBrandName } from '../../utils/brand-normalization';

type Entity = 'categories' | 'brands';
type CatalogInput = { name: string; slug?: string; description?: string | null; image_url?: string | null; logo_url?: string | null; is_active?: boolean; sort_order?: number };

const config = {
  categories: { table: 'Categories', image: 'image_url', hasSort: true },
  brands: { table: 'Brands', image: 'logo_url', hasSort: false },
} as const;

function slugify(value: string) {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
    .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 200);
}

function entry(entity: Entity) { return config[entity]; }

async function assertUnique(request: sql.Request, entity: Entity, name: string, slug: string, excludeId?: number) {
  const table = entry(entity).table;
  const result = await request.input('name', sql.NVarChar(200), name).input('slug', sql.NVarChar(200), slug)
    .input('excludeId', sql.Int, excludeId ?? -1)
    .query(`SELECT TOP 1 id FROM dbo.${table} WHERE id<>@excludeId AND (slug=@slug OR LOWER(LTRIM(RTRIM(name)))=LOWER(LTRIM(RTRIM(@name))))`);
  if (result.recordset[0]) throw new AppError(409, 'Category or Brand name/slug already exists');
}

export const adminCatalogService = {
  async list(entity: Entity, query: Record<string, unknown>) {
    const { table, hasSort } = entry(entity);
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const sortMap: Record<string, string> = { name: 'e.name', created_at: 'e.created_at', product_count: 'product_count', ...(hasSort ? { sort_order: 'e.sort_order' } : {}) };
    const sortBy = sortMap[String(query.sortBy)] || (hasSort ? 'e.sort_order' : 'e.name');
    const direction = String(query.sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';
    const clauses: string[] = [];
    const request = (await getPool()).request().input('offset', sql.Int, (page - 1) * limit).input('limit', sql.Int, limit);
    if (query.search) { request.input('search', sql.NVarChar(200), `%${String(query.search).trim()}%`); clauses.push('(e.name LIKE @search OR e.slug LIKE @search)'); }
    if (query.status === 'active') clauses.push('e.is_active=1');
    if (query.status === 'inactive') clauses.push('e.is_active=0');
    const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
    const rows = await request.query(`SELECT e.*,COUNT(p.id) product_count,COUNT(*) OVER() total FROM dbo.${table} e LEFT JOIN dbo.Products p ON p.${entity === 'categories' ? 'category_id' : 'brand_id'}=e.id ${where} GROUP BY e.id,e.name,e.slug,e.description,e.${entry(entity).image},e.is_active,e.created_at,e.updated_at${hasSort ? ',e.sort_order' : ',e.normalized_name,e.is_generic'} ORDER BY ${sortBy} ${direction},e.id ASC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY`);
    return { data: rows.recordset, page, limit, total: rows.recordset[0]?.total || 0 };
  },

  async get(entity: Entity, id: number) {
    const { table } = entry(entity);
    const result = await (await getPool()).request().input('id', sql.Int, id).query(`SELECT e.*,COUNT(p.id) product_count FROM dbo.${table} e LEFT JOIN dbo.Products p ON p.${entity === 'categories' ? 'category_id' : 'brand_id'}=e.id WHERE e.id=@id GROUP BY e.id,e.name,e.slug,e.description,e.${entry(entity).image},e.is_active,e.created_at,e.updated_at${entry(entity).hasSort ? ',e.sort_order' : ',e.normalized_name,e.is_generic'}`);
    if (!result.recordset[0]) throw new AppError(404, 'Category or Brand not found');
    return result.recordset[0];
  },

  async create(entity: Entity, input: CatalogInput) {
    const { table, image, hasSort } = entry(entity); const name = input.name.trim(); const slug = slugify(input.slug?.trim() || name);
    if (!name || !slug) throw new AppError(400, 'name and slug are required');
    const pool = await getPool(); const tx = pool.transaction(); await tx.begin();
    try {
      await assertUnique(tx.request(), entity, name, slug);
      const result = await tx.request().input('name', sql.NVarChar(200), name).input('slug', sql.NVarChar(200), slug).input('description', sql.NVarChar(1000), input.description?.trim() || null).input('image', sql.NVarChar(1000), entity === 'categories' ? input.image_url?.trim() || null : input.logo_url?.trim() || null).input('active', sql.Bit, input.is_active ?? true).input('sortOrder', sql.Int, input.sort_order ?? 0).input('normalized',sql.NVarChar(200),entity==='brands'?normalizeBrandName(name):null)
        .query(`INSERT dbo.${table}(name,slug,description,${image},is_active${hasSort ? ',sort_order' : ',normalized_name,is_generic'},created_at,updated_at) OUTPUT INSERTED.id VALUES(@name,@slug,@description,@image,@active${hasSort ? ',@sortOrder' : ',@normalized,0'},SYSUTCDATETIME(),SYSUTCDATETIME())`);
      await tx.commit(); return this.get(entity, result.recordset[0].id);
    } catch (error) { await tx.rollback(); if([2601,2627].includes((error as {number?:number}).number??0))throw new AppError(409,'Category or Brand already exists');throw error; }
  },

  async update(entity: Entity, id: number, input: CatalogInput) {
    const current = await this.get(entity, id); const { table, image, hasSort } = entry(entity);
    const name = input.name === undefined ? current.name : input.name.trim(); const slug = slugify(input.slug?.trim() || name);
    if (!name || !slug) throw new AppError(400, 'name and slug are required');
    if(entity==='brands'&&current.is_generic&&(name!==current.name||input.is_active===false))throw new AppError(409,'Generic Brand cannot be renamed or disabled');
    const pool = await getPool(); const tx = pool.transaction(); await tx.begin();
    try {
      await assertUnique(tx.request(), entity, name, slug, id);
      await tx.request().input('id', sql.Int, id).input('name', sql.NVarChar(200), name).input('slug', sql.NVarChar(200), slug).input('description', sql.NVarChar(1000), input.description === undefined ? current.description : input.description?.trim() || null).input('image', sql.NVarChar(1000), input[entity === 'categories' ? 'image_url' : 'logo_url'] === undefined ? current[image] : (entity === 'categories' ? input.image_url : input.logo_url)?.trim() || null).input('active', sql.Bit, input.is_active ?? current.is_active).input('sortOrder', sql.Int, input.sort_order ?? current.sort_order ?? 0).input('normalized',sql.NVarChar(200),entity==='brands'?normalizeBrandName(name):null)
        .query(`UPDATE dbo.${table} SET name=@name,slug=@slug,description=@description,${image}=@image,is_active=@active${hasSort ? ',sort_order=@sortOrder' : ',normalized_name=@normalized'},updated_at=SYSUTCDATETIME() WHERE id=@id`);
      await tx.commit(); return this.get(entity, id);
    } catch (error) { await tx.rollback();if([2601,2627].includes((error as {number?:number}).number??0))throw new AppError(409,'Category or Brand already exists'); throw error; }
  },

  async remove(entity: Entity, id: number) {
    const { table } = entry(entity); const pool = await getPool(); const tx = pool.transaction(); await tx.begin();
    try {
      if(entity==='brands'){const brand=await tx.request().input('genericId',sql.Int,id).query('SELECT is_generic FROM dbo.Brands WITH(UPDLOCK,HOLDLOCK) WHERE id=@genericId');if(brand.recordset[0]?.is_generic)throw new AppError(409,'Generic Brand cannot be deleted or disabled');}
      const count = await tx.request().input('id', sql.Int, id).query(`SELECT COUNT(*) total FROM dbo.Products WITH (UPDLOCK,HOLDLOCK) WHERE ${entity === 'categories' ? 'category_id' : 'brand_id'}=@id`);
      if (Number(count.recordset[0].total) > 0) {
        await tx.request().input('id', sql.Int, id).query(`UPDATE dbo.${table} SET is_active=0,updated_at=SYSUTCDATETIME() WHERE id=@id`); await tx.commit(); return { id, action: 'DISABLED_REFERENCED' };
      }
      const deleted = await tx.request().input('id', sql.Int, id).query(`DELETE dbo.${table} WHERE id=@id; SELECT @@ROWCOUNT affected_rows;`);
      if (deleted.recordset[0]?.affected_rows !== 1) throw new AppError(404, 'Category or Brand not found'); await tx.commit(); return { id, action: 'DELETED' };
    } catch (error) { await tx.rollback(); throw error; }
  },
};
