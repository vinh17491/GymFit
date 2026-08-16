import { config } from '../config/config';
import { closePool, query } from '../config/database';

if(process.env.REGRESSION04_CANONICAL_READONLY!=='1'||config.db.database!=='GYMFIT_DB')throw new Error('Read-only canonical gate failed');
type Check=[string,number,string,string];
const checks:Check[]=[];
const add=(name:string,value:unknown,severity='HIGH')=>{const count=Number(value);checks.push([name,count,count===0?'NONE':severity,count===0?'PASS':'FINDING']);};

async function main(){
  const current=String((await query<any>('SELECT DB_NAME() name')).recordset[0].name);
  if(current!=='GYMFIT_DB')throw new Error(`Unexpected database ${current}`);
  const row=(await query<any>(`SELECT
    (SELECT COUNT(*) FROM dbo.Users WHERE role NOT IN(N'member',N'coach',N'admin',N'seller')) invalid_user_role,
    (SELECT COUNT(*) FROM dbo.Shops s LEFT JOIN dbo.Users u ON u.id=s.owner_user_id WHERE s.owner_user_id IS NOT NULL AND u.id IS NULL) orphan_shop_owner,
    (SELECT COUNT(*) FROM dbo.Shops s JOIN dbo.Users u ON u.id=s.owner_user_id WHERE s.is_system=0 AND u.role<>N'seller') nonseller_shop_owner,
    (SELECT COUNT(*) FROM (SELECT owner_user_id FROM dbo.Shops WHERE owner_user_id IS NOT NULL GROUP BY owner_user_id HAVING COUNT(*)>1)d) duplicate_shop_owner,
    (SELECT COUNT(*) FROM dbo.Users u WHERE u.role=N'seller' AND NOT EXISTS(SELECT 1 FROM dbo.Shops s WHERE s.owner_user_id=u.id)) seller_without_shop,
    (SELECT COUNT(*) FROM dbo.Shops WHERE status NOT IN(N'ACTIVE',N'SUSPENDED')) invalid_shop_status,
    (SELECT COUNT(*) FROM dbo.SellerApplications a LEFT JOIN dbo.Users u ON u.id=a.user_id WHERE u.id IS NULL) orphan_application,
    (SELECT COUNT(*) FROM dbo.SellerApplications WHERE status NOT IN(N'DRAFT',N'PENDING',N'APPROVED',N'REJECTED',N'WITHDRAWN')) invalid_application_status,
    (SELECT COUNT(*) FROM dbo.SellerApplications WHERE status=N'APPROVED' AND (reviewed_by_user_id IS NULL OR reviewed_at IS NULL)) approved_missing_review,
    (SELECT COUNT(*) FROM dbo.SellerApplications WHERE status=N'REJECTED' AND (NULLIF(LTRIM(RTRIM(review_reason)),N'') IS NULL OR reviewed_by_user_id IS NULL OR reviewed_at IS NULL)) rejected_missing_review,
    (SELECT COUNT(*) FROM dbo.SellerApplications WHERE status=N'PENDING' AND (reviewed_by_user_id IS NOT NULL OR reviewed_at IS NOT NULL OR review_reason IS NOT NULL)) pending_review_metadata,
    (SELECT COUNT(*) FROM dbo.SellerApplications a JOIN dbo.Users u ON u.id=a.user_id WHERE a.status=N'PENDING' AND u.role=N'seller') seller_pending_application,
    (SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.Shops s ON s.id=p.shop_id WHERE s.id IS NULL) orphan_product_shop,
    (SELECT COUNT(*) FROM dbo.Products WHERE moderation_status NOT IN(N'DRAFT',N'PENDING_REVIEW',N'PUBLISHED',N'REJECTED',N'SUSPENDED')) invalid_product_status,
    (SELECT COUNT(*) FROM dbo.Products p JOIN dbo.Shops s ON s.id=p.shop_id WHERE p.is_active=1 AND p.moderation_status=N'PUBLISHED' AND s.status<>N'ACTIVE') published_inactive_shop,
    (SELECT COUNT(*) FROM dbo.Products WHERE (brand_id IS NULL AND brand_request_id IS NULL) OR (brand_id IS NOT NULL AND brand_request_id IS NOT NULL)) invalid_brand_source,
    (SELECT COUNT(*) FROM dbo.Products p LEFT JOIN dbo.BrandRequests r ON r.id=p.brand_request_id WHERE p.brand_request_id IS NOT NULL AND r.id IS NULL) orphan_brand_request,
    (SELECT COUNT(*) FROM dbo.ProductModerationHistory h LEFT JOIN dbo.Products p ON p.id=h.product_id WHERE p.id IS NULL) orphan_moderation_history,
    (SELECT COUNT(*) FROM dbo.Products WHERE id=0) product_zero,
    (SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1) untrusted_foreign_keys,
    (SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1) untrusted_checks,
    (SELECT COUNT(*) FROM dbo.Users WHERE email LIKE N'%GYMFIT_REGRESSION_04%') regression_users,
    (SELECT COUNT(*) FROM dbo.Shops WHERE name LIKE N'%GYMFIT_REGRESSION_04%') regression_shops,
    (SELECT COUNT(*) FROM dbo.Products WHERE product_name LIKE N'%GYMFIT_REGRESSION_04%' OR sku LIKE N'GYMFIT_REGRESSION_04%') regression_products
  `)).recordset[0];
  add('Invalid User role',row.invalid_user_role);add('Orphan Shop owner',row.orphan_shop_owner);add('Non-seller human Shop owner',row.nonseller_shop_owner);
  add('Duplicate Shop owner',row.duplicate_shop_owner);add('Seller without Shop',row.seller_without_shop,'MEDIUM');add('Invalid Shop status',row.invalid_shop_status);
  add('Orphan SellerApplication',row.orphan_application);add('Invalid application status',row.invalid_application_status);add('Approved application missing reviewer/time',row.approved_missing_review);
  add('Rejected application missing reason/reviewer/time',row.rejected_missing_review);add('Pending application with review metadata',row.pending_review_metadata);add('Seller with pending application',row.seller_pending_application,'MEDIUM');
  add('Product orphan Shop',row.orphan_product_shop);add('Invalid Product status',row.invalid_product_status);add('Published Product under inactive Shop',row.published_inactive_shop,'MEDIUM');
  add('Invalid Product Brand source XOR',row.invalid_brand_source);add('Orphan Product Brand Request',row.orphan_brand_request);add('Orphan Product moderation history',row.orphan_moderation_history);
  add('Product ID 0 missing/duplicate',Number(row.product_zero)===1?0:1);add('Disabled/untrusted foreign keys',row.untrusted_foreign_keys);add('Disabled/untrusted checks',row.untrusted_checks);
  add('REGRESSION-04 canonical User fixtures',row.regression_users);add('REGRESSION-04 canonical Shop fixtures',row.regression_shops);add('REGRESSION-04 canonical Product fixtures',row.regression_products);
  add('Leftover GYMFIT_REGRESSION databases',(await query<any>("SELECT COUNT(*) count FROM sys.databases WHERE name LIKE N'GYMFIT_REGRESSION[_]%'")).recordset[0].count);
  for(const item of checks)console.log(`R04_INTEGRITY ${item.join('|')}`);
  console.log(`R04_CANONICAL_READONLY PASS database=${current} checks=${checks.length}`);
}
main().catch(error=>{console.error('R04_CANONICAL_READONLY FAIL',error instanceof Error?error.message:error);process.exitCode=1;}).finally(closePool);
