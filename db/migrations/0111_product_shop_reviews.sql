SET NOCOUNT ON;
SET XACT_ABORT ON;

IF OBJECT_ID(N'dbo.ProductReviews',N'U') IS NOT NULL
   OR OBJECT_ID(N'dbo.ShopReviews',N'U') IS NOT NULL
   OR OBJECT_ID(N'dbo.ReviewModerationHistory',N'U') IS NOT NULL
  THROW 51110,'SELLER-012 review tables already exist; refusing ambiguous migration.',1;

CREATE TABLE dbo.ProductReviews(
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ProductReviews PRIMARY KEY,
  buyer_id INT NOT NULL,
  parent_order_id INT NOT NULL,
  shop_order_id INT NOT NULL,
  order_item_id INT NOT NULL,
  product_id INT NOT NULL,
  variant_id INT NULL,
  shop_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment NVARCHAR(2000) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_ProductReviews_Status DEFAULT N'PUBLISHED',
  verified_purchase BIT NOT NULL CONSTRAINT DF_ProductReviews_Verified DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ProductReviews_CreatedAt DEFAULT SYSUTCDATETIME(),
  published_at DATETIME2 NULL,
  hidden_at DATETIME2 NULL,
  rejected_at DATETIME2 NULL,
  moderated_by INT NULL,
  moderation_reason NVARCHAR(1000) NULL,
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ProductReviews_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_ProductReviews_OrderItem UNIQUE(order_item_id),
  CONSTRAINT FK_ProductReviews_Buyer FOREIGN KEY(buyer_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_ProductReviews_ParentOrder FOREIGN KEY(parent_order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_ProductReviews_ShopOrder FOREIGN KEY(shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_ProductReviews_OrderItem FOREIGN KEY(order_item_id) REFERENCES dbo.OrderItems(id),
  CONSTRAINT FK_ProductReviews_Product FOREIGN KEY(product_id) REFERENCES dbo.Products(id),
  CONSTRAINT FK_ProductReviews_Variant FOREIGN KEY(variant_id) REFERENCES dbo.ProductVariants(id),
  CONSTRAINT FK_ProductReviews_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT FK_ProductReviews_Moderator FOREIGN KEY(moderated_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_ProductReviews_Rating CHECK(rating BETWEEN 1 AND 5),
  CONSTRAINT CK_ProductReviews_Comment CHECK(comment IS NULL OR LEN(LTRIM(RTRIM(comment))) BETWEEN 1 AND 2000),
  CONSTRAINT CK_ProductReviews_Status CHECK(status IN(N'PENDING',N'PUBLISHED',N'HIDDEN',N'REJECTED')),
  CONSTRAINT CK_ProductReviews_Verified CHECK(verified_purchase=1),
  CONSTRAINT CK_ProductReviews_State CHECK(
    (status=N'PENDING' AND published_at IS NULL AND hidden_at IS NULL AND rejected_at IS NULL)
    OR (status=N'PUBLISHED' AND published_at IS NOT NULL AND hidden_at IS NULL AND rejected_at IS NULL)
    OR (status=N'HIDDEN' AND published_at IS NOT NULL AND hidden_at IS NOT NULL AND rejected_at IS NULL
        AND moderated_by IS NOT NULL AND LEN(LTRIM(RTRIM(moderation_reason)))>0)
    OR (status=N'REJECTED' AND published_at IS NOT NULL AND rejected_at IS NOT NULL
        AND moderated_by IS NOT NULL AND LEN(LTRIM(RTRIM(moderation_reason)))>0)
  )
);

CREATE TABLE dbo.ShopReviews(
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ShopReviews PRIMARY KEY,
  buyer_id INT NOT NULL,
  parent_order_id INT NOT NULL,
  shop_order_id INT NOT NULL,
  shop_id INT NOT NULL,
  rating TINYINT NOT NULL,
  comment NVARCHAR(2000) NULL,
  status NVARCHAR(20) NOT NULL CONSTRAINT DF_ShopReviews_Status DEFAULT N'PUBLISHED',
  verified_purchase BIT NOT NULL CONSTRAINT DF_ShopReviews_Verified DEFAULT 1,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ShopReviews_CreatedAt DEFAULT SYSUTCDATETIME(),
  published_at DATETIME2 NULL,
  hidden_at DATETIME2 NULL,
  rejected_at DATETIME2 NULL,
  moderated_by INT NULL,
  moderation_reason NVARCHAR(1000) NULL,
  updated_at DATETIME2 NOT NULL CONSTRAINT DF_ShopReviews_UpdatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT UQ_ShopReviews_ShopOrder UNIQUE(shop_order_id),
  CONSTRAINT FK_ShopReviews_Buyer FOREIGN KEY(buyer_id) REFERENCES dbo.Users(id),
  CONSTRAINT FK_ShopReviews_ParentOrder FOREIGN KEY(parent_order_id) REFERENCES dbo.Orders(id),
  CONSTRAINT FK_ShopReviews_ShopOrder FOREIGN KEY(shop_order_id) REFERENCES dbo.ShopOrders(id),
  CONSTRAINT FK_ShopReviews_Shop FOREIGN KEY(shop_id) REFERENCES dbo.Shops(id),
  CONSTRAINT FK_ShopReviews_Moderator FOREIGN KEY(moderated_by) REFERENCES dbo.Users(id),
  CONSTRAINT CK_ShopReviews_Rating CHECK(rating BETWEEN 1 AND 5),
  CONSTRAINT CK_ShopReviews_Comment CHECK(comment IS NULL OR LEN(LTRIM(RTRIM(comment))) BETWEEN 1 AND 2000),
  CONSTRAINT CK_ShopReviews_Status CHECK(status IN(N'PENDING',N'PUBLISHED',N'HIDDEN',N'REJECTED')),
  CONSTRAINT CK_ShopReviews_Verified CHECK(verified_purchase=1),
  CONSTRAINT CK_ShopReviews_State CHECK(
    (status=N'PENDING' AND published_at IS NULL AND hidden_at IS NULL AND rejected_at IS NULL)
    OR (status=N'PUBLISHED' AND published_at IS NOT NULL AND hidden_at IS NULL AND rejected_at IS NULL)
    OR (status=N'HIDDEN' AND published_at IS NOT NULL AND hidden_at IS NOT NULL AND rejected_at IS NULL
        AND moderated_by IS NOT NULL AND LEN(LTRIM(RTRIM(moderation_reason)))>0)
    OR (status=N'REJECTED' AND published_at IS NOT NULL AND rejected_at IS NOT NULL
        AND moderated_by IS NOT NULL AND LEN(LTRIM(RTRIM(moderation_reason)))>0)
  )
);

CREATE TABLE dbo.ReviewModerationHistory(
  id BIGINT IDENTITY(1,1) NOT NULL CONSTRAINT PK_ReviewModerationHistory PRIMARY KEY,
  review_type NVARCHAR(20) NOT NULL,
  review_id BIGINT NOT NULL,
  event_type NVARCHAR(40) NOT NULL,
  from_status NVARCHAR(20) NULL,
  to_status NVARCHAR(20) NOT NULL,
  actor_id INT NOT NULL,
  reason NVARCHAR(1000) NULL,
  created_at DATETIME2 NOT NULL CONSTRAINT DF_ReviewModerationHistory_CreatedAt DEFAULT SYSUTCDATETIME(),
  CONSTRAINT FK_ReviewModerationHistory_Actor FOREIGN KEY(actor_id) REFERENCES dbo.Users(id),
  CONSTRAINT CK_ReviewModerationHistory_Type CHECK(review_type IN(N'PRODUCT',N'SHOP')),
  CONSTRAINT CK_ReviewModerationHistory_Event CHECK(event_type IN(N'CREATED_AND_PUBLISHED',N'HIDDEN',N'REJECTED',N'RESTORED')),
  CONSTRAINT CK_ReviewModerationHistory_From CHECK(from_status IS NULL OR from_status IN(N'PENDING',N'PUBLISHED',N'HIDDEN',N'REJECTED')),
  CONSTRAINT CK_ReviewModerationHistory_To CHECK(to_status IN(N'PUBLISHED',N'HIDDEN',N'REJECTED')),
  CONSTRAINT CK_ReviewModerationHistory_Reason CHECK(
    event_type=N'CREATED_AND_PUBLISHED' OR LEN(LTRIM(RTRIM(reason)))>0
  )
);

CREATE INDEX IX_ProductReviews_Product_Status_Published
  ON dbo.ProductReviews(product_id,status,published_at DESC,id DESC)
  INCLUDE(rating,comment,verified_purchase,buyer_id,variant_id);
CREATE INDEX IX_ProductReviews_Buyer_Created
  ON dbo.ProductReviews(buyer_id,created_at DESC,id DESC);
CREATE INDEX IX_ProductReviews_Shop_Status
  ON dbo.ProductReviews(shop_id,status,published_at DESC,id DESC);
CREATE INDEX IX_ShopReviews_Shop_Status_Published
  ON dbo.ShopReviews(shop_id,status,published_at DESC,id DESC)
  INCLUDE(rating,comment,verified_purchase,buyer_id);
CREATE INDEX IX_ShopReviews_Buyer_Created
  ON dbo.ShopReviews(buyer_id,created_at DESC,id DESC);
CREATE INDEX IX_ReviewModerationHistory_Review
  ON dbo.ReviewModerationHistory(review_type,review_id,created_at DESC,id DESC);
GO

CREATE OR ALTER TRIGGER dbo.TR_ProductReviews_ContentImmutable
ON dbo.ProductReviews
AFTER UPDATE,DELETE
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.id=d.id WHERE i.id IS NULL)
    THROW 51111,'Product Reviews cannot be deleted.',1;
  IF EXISTS(
    SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
    WHERE i.buyer_id<>d.buyer_id OR i.parent_order_id<>d.parent_order_id
       OR i.shop_order_id<>d.shop_order_id OR i.order_item_id<>d.order_item_id
       OR i.product_id<>d.product_id OR ISNULL(i.variant_id,-1)<>ISNULL(d.variant_id,-1)
       OR i.shop_id<>d.shop_id OR i.rating<>d.rating
       OR ISNULL(i.comment,N'')<>ISNULL(d.comment,N'')
       OR i.verified_purchase<>d.verified_purchase OR i.created_at<>d.created_at
       OR ISNULL(i.published_at,'19000101')<>ISNULL(d.published_at,'19000101')
  ) THROW 51112,'Buyer Review content and verified purchase evidence are immutable.',1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ShopReviews_ContentImmutable
ON dbo.ShopReviews
AFTER UPDATE,DELETE
AS
BEGIN
  SET NOCOUNT ON;
  IF EXISTS(SELECT 1 FROM deleted d LEFT JOIN inserted i ON i.id=d.id WHERE i.id IS NULL)
    THROW 51113,'Shop Reviews cannot be deleted.',1;
  IF EXISTS(
    SELECT 1 FROM inserted i JOIN deleted d ON d.id=i.id
    WHERE i.buyer_id<>d.buyer_id OR i.parent_order_id<>d.parent_order_id
       OR i.shop_order_id<>d.shop_order_id OR i.shop_id<>d.shop_id
       OR i.rating<>d.rating OR ISNULL(i.comment,N'')<>ISNULL(d.comment,N'')
       OR i.verified_purchase<>d.verified_purchase OR i.created_at<>d.created_at
       OR ISNULL(i.published_at,'19000101')<>ISNULL(d.published_at,'19000101')
  ) THROW 51114,'Buyer Review content and verified purchase evidence are immutable.',1;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_ReviewModerationHistory_Immutable
ON dbo.ReviewModerationHistory
INSTEAD OF UPDATE,DELETE
AS
BEGIN
  THROW 51115,'Review moderation history is immutable.',1;
END;
GO

IF EXISTS(SELECT 1 FROM dbo.ProductReviews) OR EXISTS(SELECT 1 FROM dbo.ShopReviews)
  THROW 51116,'SELLER-012 must not fabricate Review rows.',1;
