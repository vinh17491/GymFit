const sql = require('mssql');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env') });

const config = {
  server: process.env.DB_HOST || "DESKTOP-0PI1Q6Q",
  database: process.env.DB_NAME || "GymFit",
  user: process.env.DB_USER || "sa",
  password: process.env.DB_PASSWORD || "1",
  port: Number(process.env.DB_PORT) || 1433,
  options: { encrypt: false, trustServerCertificate: true },
};

async function main() {
  await sql.connect(config);
  
  // ChatConversations columns
  const convCols = await sql.query`
    SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
      COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME='ChatConversations' 
    ORDER BY ORDINAL_POSITION`;
  console.log('\n=== CHATCONVERSATIONS COLUMNS ===');
  console.log(JSON.stringify(convCols.recordset, null, 2));

  // ChatMessages columns
  const msgCols = await sql.query`
    SELECT COLUMN_NAME, IS_NULLABLE, DATA_TYPE, CHARACTER_MAXIMUM_LENGTH,
      COLUMN_DEFAULT
    FROM INFORMATION_SCHEMA.COLUMNS 
    WHERE TABLE_NAME='ChatMessages' 
    ORDER BY ORDINAL_POSITION`;
  console.log('\n=== CHATMESSAGES COLUMNS ===');
  console.log(JSON.stringify(msgCols.recordset, null, 2));

  // Foreign keys
  const fks = await sql.query`
    SELECT 
      fk.name AS FK_Name,
      tp.name AS ParentTable,
      ref.name AS ReferencedTable,
      c.name AS ParentColumn,
      rc.name AS ReferencedColumn
    FROM sys.foreign_keys fk
    INNER JOIN sys.foreign_key_columns fkc ON fkc.constraint_object_id = fk.object_id
    INNER JOIN sys.tables tp ON fk.parent_object_id = tp.object_id
    INNER JOIN sys.tables ref ON fk.referenced_object_id = ref.object_id
    INNER JOIN sys.columns c ON fkc.parent_column_id = c.column_id AND c.object_id = tp.object_id
    INNER JOIN sys.columns rc ON fkc.referenced_column_id = rc.column_id AND rc.object_id = ref.object_id
    WHERE tp.name IN ('ChatConversations','ChatMessages')`;
  console.log('\n=== FOREIGN KEYS ===');
  console.log(JSON.stringify(fks.recordset, null, 2));

  // Indexes
  const idx = await sql.query`
    SELECT t.name AS TableName, i.name AS IndexName, i.type_desc,
      c.name AS ColumnName
    FROM sys.indexes i
    JOIN sys.index_columns ic ON i.object_id = ic.object_id AND i.index_id = ic.index_id
    JOIN sys.columns c ON ic.object_id = c.object_id AND ic.column_id = c.column_id
    JOIN sys.tables t ON i.object_id = t.object_id
    WHERE t.name IN ('ChatConversations','ChatMessages')`;
  console.log('\n=== INDEXES ===');
  console.log(JSON.stringify(idx.recordset, null, 2));

  console.log('\n=== ROW COUNTS ===');
  const convCnt = await sql.query`SELECT COUNT(*) as cnt FROM ChatConversations`;
  const msgCnt = await sql.query`SELECT COUNT(*) as cnt FROM ChatMessages`;
  console.log(`ChatConversations: ${convCnt.recordset[0].cnt}`);
  console.log(`ChatMessages: ${msgCnt.recordset[0].cnt}`);

  await sql.close();
  process.exit(0);
}

main().catch(err => { console.error(err); process.exit(1); });