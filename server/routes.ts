import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertDocumentSchema, insertChildSchema, insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // Mock OCR processing route
  app.post("/api/ocr", async (req, res) => {
    try {
      // Mock OCR response - in a real app you'd process the image here
      const mockResponse = {
        text: "Sample text extracted from document",
        classification: "Other" as const,
        extracted: {},
        suggestedTags: ["document"]
      };
      
      res.json(mockResponse);
    } catch (error) {
      console.error("OCR processing error:", error);
      res.status(500).json({ 
        message: "Failed to process OCR",
        error: error instanceof Error ? error.message : "Unknown error"
      });
    }
  });

  // Documents routes
  app.get("/api/documents", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const documents = await storage.getDocumentsByUser(userId);
      res.json(documents);
    } catch (error) {
      console.error("Error fetching documents:", error);
      res.status(500).json({ message: "Failed to fetch documents" });
    }
  });

  app.post("/api/documents", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const documentData = insertDocumentSchema.parse({
        ...req.body,
        userId,
      });

      const document = await storage.createDocument(documentData);
      res.status(201).json(document);
    } catch (error) {
      console.error("Error creating document:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid document data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create document" });
    }
  });

  app.get("/api/documents/:id", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const document = await storage.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error fetching document:", error);
      res.status(500).json({ message: "Failed to fetch document" });
    }
  });

  app.patch("/api/documents/:id", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const document = await storage.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      const updatedDocument = await storage.updateDocument(req.params.id, req.body);
      res.json(updatedDocument);
    } catch (error) {
      console.error("Error updating document:", error);
      res.status(500).json({ message: "Failed to update document" });
    }
  });

  app.delete("/api/documents/:id", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const document = await storage.getDocumentById(req.params.id);
      if (!document) {
        return res.status(404).json({ message: "Document not found" });
      }

      // Check if user owns this document
      if (document.userId !== userId) {
        return res.status(403).json({ message: "Access denied" });
      }

      await storage.deleteDocument(req.params.id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting document:", error);
      res.status(500).json({ message: "Failed to delete document" });
    }
  });

  // User management route
  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(userData.email);
      if (existingUser) {
        return res.json(existingUser); // Return existing user
      }
      
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      console.error("Error creating user:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Children routes
  app.get("/api/children", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const children = await storage.getChildrenByUser(userId);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  app.post("/api/children", async (req, res) => {
    try {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const childData = insertChildSchema.parse({
        ...req.body,
        userId,
      });

      const child = await storage.createChild(childData);
      res.status(201).json(child);
    } catch (error) {
      console.error("Error creating child:", error);
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid child data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create child" });
    }
  });

  // Shared documents route (public access)
  app.get("/api/shared/:token", async (req, res) => {
    try {
      const document = await storage.getDocumentByShareToken(req.params.token);
      if (!document || !document.isShared) {
        return res.status(404).json({ message: "Shared document not found" });
      }

      res.json(document);
    } catch (error) {
      console.error("Error fetching shared document:", error);
      res.status(500).json({ message: "Failed to fetch shared document" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
