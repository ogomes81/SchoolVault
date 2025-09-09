import { eq, and, desc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { 
  type User, 
  type InsertUser,
  type Profile,
  type InsertProfile,
  type Child,
  type InsertChild,
  type Document,
  type InsertDocument,
  users,
  profiles,
  children,
  documents
} from "@shared/schema";

// Initialize database connection
const sql = neon(process.env.DATABASE_URL!);
const db = drizzle(sql);

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Profile management
  getProfile(userId: string): Promise<Profile | undefined>;
  createProfile(profile: InsertProfile): Promise<Profile>;
  
  // Children management
  getChildrenByUser(userId: string): Promise<Child[]>;
  getChildById(id: string): Promise<Child | undefined>;
  createChild(child: InsertChild): Promise<Child>;
  updateChild(id: string, updates: Partial<Child>): Promise<Child>;
  deleteChild(id: string): Promise<void>;
  
  // Document management
  getDocumentsByUser(userId: string): Promise<(Document & { child?: Child })[]>;
  getDocumentById(id: string): Promise<(Document & { child?: Child }) | undefined>;
  getDocumentByShareToken(shareToken: string): Promise<(Document & { child?: Child }) | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<Document>;
  deleteDocument(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  
  async getUser(id: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return result[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return result[0];
  }

  async createUser(user: InsertUser): Promise<User> {
    const result = await db.insert(users).values(user).returning();
    return result[0];
  }

  async getProfile(userId: string): Promise<Profile | undefined> {
    const result = await db.select().from(profiles).where(eq(profiles.userId, userId)).limit(1);
    return result[0];
  }

  async createProfile(profile: InsertProfile): Promise<Profile> {
    const result = await db.insert(profiles).values(profile).returning();
    return result[0];
  }

  async getChildrenByUser(userId: string): Promise<Child[]> {
    return db.select().from(children).where(eq(children.userId, userId)).orderBy(children.name);
  }

  async getChildById(id: string): Promise<Child | undefined> {
    const result = await db.select().from(children).where(eq(children.id, id)).limit(1);
    return result[0];
  }

  async createChild(child: InsertChild): Promise<Child> {
    const result = await db.insert(children).values(child).returning();
    return result[0];
  }

  async updateChild(id: string, updates: Partial<Child>): Promise<Child> {
    const result = await db.update(children).set(updates).where(eq(children.id, id)).returning();
    if (!result[0]) {
      throw new Error('Child not found');
    }
    return result[0];
  }

  async deleteChild(id: string): Promise<void> {
    await db.delete(children).where(eq(children.id, id));
  }

  async getDocumentsByUser(userId: string): Promise<(Document & { child?: Child })[]> {
    const result = await db
      .select({
        id: documents.id,
        userId: documents.userId,
        childId: documents.childId,
        title: documents.title,
        docType: documents.docType,
        storagePath: documents.storagePath,
        ocrText: documents.ocrText,
        tags: documents.tags,
        dueDate: documents.dueDate,
        eventDate: documents.eventDate,
        teacher: documents.teacher,
        subject: documents.subject,
        isShared: documents.isShared,
        shareToken: documents.shareToken,
        createdAt: documents.createdAt,
        child: children,
      })
      .from(documents)
      .leftJoin(children, eq(documents.childId, children.id))
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));

    return result.map(row => ({
      id: row.id,
      userId: row.userId,
      childId: row.childId,
      title: row.title,
      docType: row.docType,
      storagePath: row.storagePath,
      ocrText: row.ocrText,
      tags: row.tags,
      dueDate: row.dueDate,
      eventDate: row.eventDate,
      teacher: row.teacher,
      subject: row.subject,
      isShared: row.isShared,
      shareToken: row.shareToken,
      createdAt: row.createdAt,
      child: row.child || undefined,
    }));
  }

  async getDocumentById(id: string): Promise<(Document & { child?: Child }) | undefined> {
    const result = await db
      .select({
        id: documents.id,
        userId: documents.userId,
        childId: documents.childId,
        title: documents.title,
        docType: documents.docType,
        storagePath: documents.storagePath,
        ocrText: documents.ocrText,
        tags: documents.tags,
        dueDate: documents.dueDate,
        eventDate: documents.eventDate,
        teacher: documents.teacher,
        subject: documents.subject,
        isShared: documents.isShared,
        shareToken: documents.shareToken,
        createdAt: documents.createdAt,
        child: children,
      })
      .from(documents)
      .leftJoin(children, eq(documents.childId, children.id))
      .where(eq(documents.id, id))
      .limit(1);

    if (!result[0]) return undefined;

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      childId: row.childId,
      title: row.title,
      docType: row.docType,
      storagePath: row.storagePath,
      ocrText: row.ocrText,
      tags: row.tags,
      dueDate: row.dueDate,
      eventDate: row.eventDate,
      teacher: row.teacher,
      subject: row.subject,
      isShared: row.isShared,
      shareToken: row.shareToken,
      createdAt: row.createdAt,
      child: row.child || undefined,
    };
  }

  async getDocumentByShareToken(shareToken: string): Promise<(Document & { child?: Child }) | undefined> {
    const result = await db
      .select({
        id: documents.id,
        userId: documents.userId,
        childId: documents.childId,
        title: documents.title,
        docType: documents.docType,
        storagePath: documents.storagePath,
        ocrText: documents.ocrText,
        tags: documents.tags,
        dueDate: documents.dueDate,
        eventDate: documents.eventDate,
        teacher: documents.teacher,
        subject: documents.subject,
        isShared: documents.isShared,
        shareToken: documents.shareToken,
        createdAt: documents.createdAt,
        child: children,
      })
      .from(documents)
      .leftJoin(children, eq(documents.childId, children.id))
      .where(and(eq(documents.shareToken, shareToken), eq(documents.isShared, true)))
      .limit(1);

    if (!result[0]) return undefined;

    const row = result[0];
    return {
      id: row.id,
      userId: row.userId,
      childId: row.childId,
      title: row.title,
      docType: row.docType,
      storagePath: row.storagePath,
      ocrText: row.ocrText,
      tags: row.tags,
      dueDate: row.dueDate,
      eventDate: row.eventDate,
      teacher: row.teacher,
      subject: row.subject,
      isShared: row.isShared,
      shareToken: row.shareToken,
      createdAt: row.createdAt,
      child: row.child || undefined,
    };
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const result = await db.insert(documents).values(document).returning();
    return result[0];
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<Document> {
    const result = await db.update(documents).set(updates).where(eq(documents.id, id)).returning();
    if (!result[0]) {
      throw new Error('Document not found');
    }
    return result[0];
  }

  async deleteDocument(id: string): Promise<void> {
    await db.delete(documents).where(eq(documents.id, id));
  }
}

export const storage = new DatabaseStorage();
