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
    
    this.blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
    this.containerClient = this.blobServiceClient.getContainerClient(containerName);
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

  async getFileUrl(fileName: string): Promise<string> {
    const blockBlobClient = this.containerClient.getBlockBlobClient(fileName);
    return blockBlobClient.url;
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
      await this.containerClient.createIfNotExists({
        access: 'blob', // Public read access for images
      });
    } catch (error) {
      console.error('Failed to ensure container exists:', error);
    }
  }
}

export const azureStorage = new AzureStorageService();