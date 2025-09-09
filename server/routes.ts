import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";
import { insertDocumentSchema, insertChildSchema, insertUserSchema } from "@shared/schema";

export async function registerRoutes(app: Express): Promise<Server> {
  // OCR processing route using Azure Computer Vision
  app.post("/api/ocr", async (req, res) => {
    try {
      const { storagePath } = req.body;
      
      if (!storagePath) {
        return res.status(400).json({ message: "Storage path is required" });
      }

      const azureEndpoint = process.env.AZURE_VISION_ENDPOINT;
      const azureKey = process.env.AZURE_VISION_API_KEY;

      if (!azureEndpoint || !azureKey) {
        throw new Error("Azure Computer Vision credentials not configured");
      }

      // Get the file URL from Supabase storage
      const { createClient } = require('@supabase/supabase-js');
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL || 'https://placeholder.supabase.co',
        process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder-key'
      );

      const { data } = supabase.storage
        .from('documents')
        .getPublicUrl(storagePath);

      const imageUrl = data.publicUrl;

      // Call Azure Computer Vision OCR API
      const ocrEndpoint = `${azureEndpoint}/vision/v3.2/read/analyze`;
      
      const response = await fetch(ocrEndpoint, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': azureKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          url: imageUrl
        }),
      });

      if (!response.ok) {
        throw new Error(`Azure OCR API error: ${response.statusText}`);
      }

      // Get the operation location for polling
      const operationLocation = response.headers.get('Operation-Location');
      if (!operationLocation) {
        throw new Error('No operation location returned from Azure OCR');
      }

      // Poll for results (Azure OCR is asynchronous)
      let ocrResult;
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
        
        const resultResponse = await fetch(operationLocation, {
          headers: {
            'Ocp-Apim-Subscription-Key': azureKey,
          },
        });

        if (!resultResponse.ok) {
          throw new Error(`Failed to get OCR results: ${resultResponse.statusText}`);
        }

        ocrResult = await resultResponse.json();
        
        if (ocrResult.status === 'succeeded') {
          break;
        } else if (ocrResult.status === 'failed') {
          throw new Error('OCR processing failed');
        }
        
        attempts++;
      }

      if (ocrResult.status !== 'succeeded') {
        throw new Error('OCR processing timed out');
      }

      // Extract text from Azure OCR result
      let extractedText = '';
      if (ocrResult.analyzeResult && ocrResult.analyzeResult.readResults) {
        for (const page of ocrResult.analyzeResult.readResults) {
          for (const line of page.lines) {
            extractedText += line.text + ' ';
          }
        }
      }

      // Auto-classify document based on extracted text
      const text = extractedText.toLowerCase();
      let classification = 'Other';
      
      if (text.includes('homework') || text.includes('assignment') || text.includes('due date')) {
        classification = 'Homework';
      } else if (text.includes('permission') || text.includes('field trip') || text.includes('consent')) {
        classification = 'Permission Slip';
      } else if (text.includes('report card') || text.includes('grades') || text.includes('semester')) {
        classification = 'Report Card';
      } else if (text.includes('event') || text.includes('fundraiser') || text.includes('meeting')) {
        classification = 'Flyer';
      }

      // Extract metadata
      const extracted: any = {};
      
      // Extract dates (looking for various date patterns)
      const datePatterns = [
        /due\s+(?:date\s+)?(?:is\s+)?(?:on\s+)?(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/i,
        /(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})/g,
        /(?:january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2},?\s+\d{4}/gi
      ];
      
      for (const pattern of datePatterns) {
        const match = text.match(pattern);
        if (match) {
          extracted.due_date = match[1] || match[0];
          break;
        }
      }

      // Extract teacher names
      const teacherPatterns = [
        /(?:teacher|instructor|mr\.|mrs\.|ms\.|miss)\s+([a-z]+)/i,
        /([a-z]+)\s+(?:teacher|class)/i
      ];
      
      for (const pattern of teacherPatterns) {
        const match = text.match(pattern);
        if (match) {
          extracted.teacher = match[1];
          break;
        }
      }

      // Extract subjects
      const subjectKeywords = ['math', 'science', 'english', 'reading', 'social studies', 'history', 'art', 'music', 'pe', 'physical education'];
      for (const subject of subjectKeywords) {
        if (text.includes(subject)) {
          extracted.subject = subject.charAt(0).toUpperCase() + subject.slice(1);
          break;
        }
      }

      // Generate suggested tags
      const suggestedTags = [];
      if (classification !== 'Other') {
        suggestedTags.push(classification.toLowerCase().replace(' ', '-'));
      }
      if (extracted.subject) {
        suggestedTags.push(extracted.subject.toLowerCase());
      }
      if (text.includes('urgent') || text.includes('important')) {
        suggestedTags.push('urgent');
      }

      const response_data = {
        text: extractedText.trim(),
        classification: classification as 'Homework' | 'Flyer' | 'Permission Slip' | 'Report Card' | 'Other',
        extracted,
        suggestedTags
      };
      
      res.json(response_data);
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
      let userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Find the actual database user (in case frontend uses localStorage ID)
      let user = await storage.getUser(userId);
      if (!user) {
        // Try to find user by email if they have the wrong ID
        const userEmail = req.headers['x-user-email'] as string;
        if (userEmail) {
          user = await storage.getUserByEmail(userEmail);
          if (user) {
            userId = user.id;
            console.log(`Found user by email for documents, using correct ID: ${userId}`);
          }
        }
      }

      const query = req.query.search as string;
      const documents = query 
        ? await storage.searchDocuments(userId, query)
        : await storage.getDocumentsByUser(userId);
      
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
      let userId = req.headers['x-user-id'] as string;
      const userEmail = req.headers['x-user-email'] as string;
      
      console.log(`Fetching children - Original user ID: ${userId}, Email: ${userEmail}`);
      
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Find the actual database user (in case frontend uses localStorage ID)
      let user = await storage.getUser(userId);
      console.log(`Found user by ID: ${!!user}`);
      
      if (!user && userEmail) {
        // Try to find user by email if they have the wrong ID
        console.log(`Trying to find user by email: ${userEmail}`);
        user = await storage.getUserByEmail(userEmail);
        if (user) {
          userId = user.id;
          console.log(`Found user by email, using correct ID: ${userId}`);
        } else {
          console.log(`User not found by email either`);
        }
      }

      const children = await storage.getChildrenByUser(userId);
      console.log(`Found ${children.length} children for user ${userId}`);
      res.json(children);
    } catch (error) {
      console.error("Error fetching children:", error);
      res.status(500).json({ message: "Failed to fetch children" });
    }
  });

  app.post("/api/children", async (req, res) => {
    try {
      let userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      // Ensure user exists in database before creating child
      let user = await storage.getUser(userId);
      if (!user) {
        console.log(`User ${userId} not found in database, attempting to get from request`);
        // Try to get email from request headers or create a placeholder
        const userEmail = req.headers['x-user-email'] as string || `user-${userId}@example.com`;
        try {
          // Check if user exists by email first
          user = await storage.getUserByEmail(userEmail);
          if (!user) {
            // Create new user (database will auto-generate ID)
            user = await storage.createUser({ email: userEmail });
            console.log(`Created user in database: ${user.id}`);
          }
          // Update the userId to match the database user
          userId = user.id;
          console.log(`Using user ID: ${userId}`);
        } catch (createError) {
          console.error('Failed to create user:', createError);
          return res.status(500).json({ message: "Failed to ensure user exists" });
        }
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
