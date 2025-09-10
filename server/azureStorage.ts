import { BlobServiceClient, ContainerClient } from '@azure/storage-blob';

export class AzureStorageService {
  private blobServiceClient: BlobServiceClient;
  private containerClient: ContainerClient;
  
  constructor() {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
    const containerName = process.env.AZURE_STORAGE_CONTAINER || 'documents';
    
    if (!connectionString) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is required');
    }
    
    if (!connectionString.trim()) {
      throw new Error('AZURE_STORAGE_CONNECTION_STRING environment variable is empty');
    }
    
    try {
      this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
      this.containerClient = this.blobServiceClient.getContainerClient(containerName);
    } catch (error) {
      console.error('Failed to initialize Azure Storage client:', error);
      throw new Error(`Failed to initialize Azure Storage: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async uploadFile(buffer: Buffer, fileName: string, contentType: string): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    
    await blockBlobClient.upload(buffer, buffer.length, {
      blobHTTPHeaders: {
        blobContentType: contentType,
      },
    });
    
    return blockBlobClient.url;
  }

  async getFileUrl(fileName: string, expiresInMinutes: number = 60): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    
    // Generate a SAS (Shared Access Signature) URL for private access
    const expiresOn = new Date();
    expiresOn.setMinutes(expiresOn.getMinutes() + expiresInMinutes);
    
    try {
      const sasUrl = await blockBlobClient.generateSasUrl({
        permissions: { read: true }, // read permission
        expiresOn: expiresOn,
      });
      return sasUrl;
    } catch (error) {
      console.error('Failed to generate SAS URL:', error);
      // Fallback to direct URL (won't work with private containers but better than crashing)
      return blockBlobClient.url;
    }
  }

  async downloadFile(fileName: string): Promise<Buffer> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    const downloadResponse = await blockBlobClient.download();
    
    if (!downloadResponse.readableStreamBody) {
      throw new Error('Failed to download file');
    }
    
    const chunks: Buffer[] = [];
    
    return new Promise((resolve, reject) => {
      downloadResponse.readableStreamBody!.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      downloadResponse.readableStreamBody!.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
      
      downloadResponse.readableStreamBody!.on('error', reject);
    });
  }
  
  async ensureContainerExists(): Promise<void> {
    try {
      // Create container without public access since the storage account doesn't allow it
      await this.containerClient.createIfNotExists();
      console.log('Container created/verified successfully');
    } catch (error) {
      console.error('Failed to ensure container exists:', error);
      throw error;
    }
  }
}

export const azureStorage = new AzureStorageService();