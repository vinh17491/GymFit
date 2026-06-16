import { NextFunction, Request, Response } from "express";
import { getPool } from "../config/database";

type AuthRequest = Request & { userId?: number; roleName?: string; roleId?: number };

// ======================== PUBLIC ========================

// GET /blogs - Public
export const getBlogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const offset = (page - 1) * limit;
    const tag = req.query.tag as string;

    const pool = await getPool();

    let countQuery = "SELECT COUNT(*) AS Total FROM Blogs WHERE Status = 'PUBLISHED'";
    if (tag) {
      countQuery += " AND Tags LIKE @tag";
    }
    const countRequest = pool.request();
    if (tag) {
      countRequest.input("tag", `%${tag}%`);
    }
    const countResult = await countRequest.query(countQuery);
    const total = countResult.recordset[0].Total;

    let dataQuery = `
      SELECT b.*, u.FullName AS AuthorName, u.Avatar AS AuthorAvatar,
        (SELECT COUNT(*) FROM BlogComments WHERE BlogId = b.Id) AS CommentCount,
        (SELECT COUNT(*) FROM BlogLikes WHERE BlogId = b.Id) AS LikeCount
      FROM Blogs b
      LEFT JOIN Users u ON b.AuthorId = u.Id
      WHERE b.Status = 'PUBLISHED'
    `;
    if (tag) {
      dataQuery += " AND b.Tags LIKE @tag";
    }
    dataQuery += " ORDER BY b.PublishedAt DESC OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY";

    const dataRequest = pool.request();
    if (tag) {
      dataRequest.input("tag", `%${tag}%`);
    }
    dataRequest.input("limit", limit);
    dataRequest.input("offset", offset);
    const result = await dataRequest.query(dataQuery);

    res.status(200).json({
      data: result.recordset,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next({ message: "Unable to fetch blogs", error });
  }
};

// GET /blogs/:id - Public
export const getBlogById = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();

    const blogResult = await pool.request()
      .input("id", req.params.id)
      .query(`
        SELECT b.*, u.FullName AS AuthorName, u.Avatar AS AuthorAvatar,
          (SELECT COUNT(*) FROM BlogComments WHERE BlogId = b.Id) AS CommentCount,
          (SELECT COUNT(*) FROM BlogLikes WHERE BlogId = b.Id) AS LikeCount
        FROM Blogs b
        LEFT JOIN Users u ON b.AuthorId = u.Id
        WHERE b.Id = @id
      `);

    if (blogResult.recordset.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const blog = blogResult.recordset[0];

    // Increment view count
    await pool.request()
      .input("id", req.params.id)
      .query("UPDATE Blogs SET ViewCount = ViewCount + 1 WHERE Id = @id");

    // Get comments
    const commentsResult = await pool.request()
      .input("blogId", req.params.id)
      .query(`
        SELECT bc.*, u.FullName AS UserName, u.Avatar AS UserAvatar
        FROM BlogComments bc
        LEFT JOIN Users u ON bc.UserId = u.Id
        WHERE bc.BlogId = @blogId
        ORDER BY bc.CreatedAt DESC
      `);

    // Get likes
    const likesResult = await pool.request()
      .input("blogId", req.params.id)
      .query(`
        SELECT bl.UserId, bl.CreatedAt, u.FullName AS UserName
        FROM BlogLikes bl
        LEFT JOIN Users u ON bl.UserId = u.Id
        WHERE bl.BlogId = @blogId
        ORDER BY bl.CreatedAt DESC
      `);

    res.status(200).json({
      ...blog,
      comments: commentsResult.recordset,
      likes: likesResult.recordset,
    });
  } catch (error) {
    next({ message: "Unable to fetch blog", error });
  }
};

// GET /blogs/search?q= - Public
export const searchBlogs = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const q = req.query.q as string;
    if (!q) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 12));
    const offset = (page - 1) * limit;

    const pool = await getPool();
    const searchPattern = `%${q}%`;

    const countResult = await pool.request()
      .input("search", searchPattern)
      .query(`
        SELECT COUNT(*) AS Total FROM Blogs
        WHERE Status = 'PUBLISHED' AND (Title LIKE @search OR Content LIKE @search)
      `);
    const total = countResult.recordset[0].Total;

    const dataResult = await pool.request()
      .input("search", searchPattern)
      .input("limit", limit)
      .input("offset", offset)
      .query(`
        SELECT b.*, u.FullName AS AuthorName, u.Avatar AS AuthorAvatar,
          (SELECT COUNT(*) FROM BlogComments WHERE BlogId = b.Id) AS CommentCount,
          (SELECT COUNT(*) FROM BlogLikes WHERE BlogId = b.Id) AS LikeCount
        FROM Blogs b
        LEFT JOIN Users u ON b.AuthorId = u.Id
        WHERE b.Status = 'PUBLISHED' AND (b.Title LIKE @search OR b.Content LIKE @search)
        ORDER BY b.PublishedAt DESC
        OFFSET @offset ROWS FETCH NEXT @limit ROWS ONLY
      `);

    res.status(200).json({
      data: dataResult.recordset,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next({ message: "Unable to search blogs", error });
  }
};

// GET /blogs/:id/comments - Public
export const getComments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const pool = await getPool();

    const blog = await pool.request()
      .input("id", req.params.id)
      .query("SELECT Id FROM Blogs WHERE Id = @id");
    if (blog.recordset.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const result = await pool.request()
      .input("blogId", req.params.id)
      .query(`
        SELECT bc.*, u.FullName AS UserName, u.Avatar AS UserAvatar
        FROM BlogComments bc
        LEFT JOIN Users u ON bc.UserId = u.Id
        WHERE bc.BlogId = @blogId
        ORDER BY bc.CreatedAt DESC
      `);

    res.status(200).json(result.recordset);
  } catch (error) {
    next({ message: "Unable to fetch comments", error });
  }
};

// ======================== AUTHENTICATED ========================

// POST /blogs/:id/comment - Auth
export const createComment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const blogId = Number(req.params.id);
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Comment content is required" });
    }

    const pool = await getPool();

    const blog = await pool.request()
      .input("id", blogId)
      .query("SELECT Id FROM Blogs WHERE Id = @id");
    if (blog.recordset.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const result = await pool.request()
      .input("blogId", blogId)
      .input("userId", userId)
      .input("content", content.trim())
      .query(`
        INSERT INTO BlogComments (BlogId, UserId, Content)
        OUTPUT INSERTED.*
        VALUES (@blogId, @userId, @content)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to create comment", error });
  }
};

// POST /blogs/:id/like - Auth
export const likeBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const blogId = Number(req.params.id);

    const pool = await getPool();

    const blog = await pool.request()
      .input("id", blogId)
      .query("SELECT Id FROM Blogs WHERE Id = @id");
    if (blog.recordset.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const existing = await pool.request()
      .input("blogId", blogId)
      .input("userId", userId)
      .query("SELECT Id FROM BlogLikes WHERE BlogId = @blogId AND UserId = @userId");
    if (existing.recordset.length > 0) {
      return res.status(409).json({ message: "Blog already liked" });
    }

    await pool.request()
      .input("blogId", blogId)
      .input("userId", userId)
      .query("INSERT INTO BlogLikes (BlogId, UserId) VALUES (@blogId, @userId)");

    const countResult = await pool.request()
      .input("blogId", blogId)
      .query("SELECT COUNT(*) AS LikeCount FROM BlogLikes WHERE BlogId = @blogId");

    res.status(201).json({ message: "Blog liked", liked: true, likeCount: countResult.recordset[0].LikeCount });
  } catch (error) {
    next({ message: "Unable to like blog", error });
  }
};

// DELETE /blogs/:id/like - Auth
export const unlikeBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = (req as AuthRequest).userId!;
    const blogId = Number(req.params.id);

    const pool = await getPool();

    const existing = await pool.request()
      .input("blogId", blogId)
      .input("userId", userId)
      .query("SELECT Id FROM BlogLikes WHERE BlogId = @blogId AND UserId = @userId");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Like not found" });
    }

    await pool.request()
      .input("blogId", blogId)
      .input("userId", userId)
      .query("DELETE FROM BlogLikes WHERE BlogId = @blogId AND UserId = @userId");

    const countResult = await pool.request()
      .input("blogId", blogId)
      .query("SELECT COUNT(*) AS LikeCount FROM BlogLikes WHERE BlogId = @blogId");

    res.status(200).json({ message: "Blog unliked", liked: false, likeCount: countResult.recordset[0].LikeCount });
  } catch (error) {
    next({ message: "Unable to unlike blog", error });
  }
};

// ======================== ADMIN ========================

// POST /blogs/admin - ADMIN only
export const createBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const authReq = req as AuthRequest;
    const { title, content, excerpt, coverImage, tags, status } = req.body;
    const authorId = authReq.userId!;

    if (!title || !content) {
      return res.status(400).json({ message: "Title and content are required" });
    }

    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");

    const finalStatus = (status || "DRAFT").toUpperCase();
    if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(finalStatus)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const pool = await getPool();

    const result = await pool.request()
      .input("authorId", authorId)
      .input("title", title)
      .input("slug", slug)
      .input("content", content)
      .input("excerpt", excerpt || null)
      .input("coverImage", coverImage || null)
      .input("tags", tags || null)
      .input("status", finalStatus)
      .input("publishedAt", finalStatus === "PUBLISHED" ? new Date().toISOString() : null)
      .query(`
        INSERT INTO Blogs (AuthorId, Title, Slug, Content, Excerpt, CoverImage, Tags, Status, PublishedAt)
        OUTPUT INSERTED.*
        VALUES (@authorId, @title, @slug, @content, @excerpt, @coverImage, @tags, @status, @publishedAt)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (error) {
    next({ message: "Unable to create blog", error });
  }
};

// PUT /blogs/admin/:id - ADMIN only
export const updateBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blogId = Number(req.params.id);
    const { title, content, excerpt, coverImage, tags, status } = req.body;

    const pool = await getPool();

    const existing = await pool.request()
      .input("id", blogId)
      .query("SELECT * FROM Blogs WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    const blog = existing.recordset[0];
    const finalTitle = title ?? blog.Title;
    const finalContent = content ?? blog.Content;
    const finalExcerpt = excerpt !== undefined ? excerpt : blog.Excerpt;
    const finalCoverImage = coverImage !== undefined ? coverImage : blog.CoverImage;
    const finalTags = tags !== undefined ? tags : blog.Tags;
    let finalStatus = status ?? blog.Status;
    let finalPublishedAt = blog.PublishedAt;

    if (status) {
      const statusUpper = status.toUpperCase();
      if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(statusUpper)) {
        return res.status(400).json({ message: "Invalid status" });
      }
      finalStatus = statusUpper;
      if (statusUpper === "PUBLISHED" && !blog.PublishedAt) {
        finalPublishedAt = new Date().toISOString();
      }
    }

    // Regenerate slug if title changed
    let finalSlug = blog.Slug;
    if (title && title !== blog.Title) {
      finalSlug = title
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
    }

    await pool.request()
      .input("id", blogId)
      .input("title", finalTitle)
      .input("slug", finalSlug)
      .input("content", finalContent)
      .input("excerpt", finalExcerpt)
      .input("coverImage", finalCoverImage)
      .input("tags", finalTags)
      .input("status", finalStatus)
      .input("publishedAt", finalPublishedAt)
      .query(`
        UPDATE Blogs
        SET Title = @title, Slug = @slug, Content = @content, Excerpt = @excerpt,
            CoverImage = @coverImage, Tags = @tags, Status = @status,
            PublishedAt = @publishedAt, UpdatedAt = GETUTCDATE()
        WHERE Id = @id
      `);

    const updated = await pool.request()
      .input("id", blogId)
      .query("SELECT * FROM Blogs WHERE Id = @id");

    res.status(200).json(updated.recordset[0]);
  } catch (error) {
    next({ message: "Unable to update blog", error });
  }
};

// DELETE /blogs/admin/:id - ADMIN only
export const deleteBlog = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const blogId = Number(req.params.id);

    const pool = await getPool();

    const existing = await pool.request()
      .input("id", blogId)
      .query("SELECT Id FROM Blogs WHERE Id = @id");
    if (existing.recordset.length === 0) {
      return res.status(404).json({ message: "Blog not found" });
    }

    // Delete related comments and likes first
    await pool.request()
      .input("blogId", blogId)
      .query("DELETE FROM BlogComments WHERE BlogId = @blogId");
    await pool.request()
      .input("blogId", blogId)
      .query("DELETE FROM BlogLikes WHERE BlogId = @blogId");
    await pool.request()
      .input("id", blogId)
      .query("DELETE FROM Blogs WHERE Id = @id");

    res.status(200).json({ message: "Blog deleted" });
  } catch (error) {
    next({ message: "Unable to delete blog", error });
  }
};