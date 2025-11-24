# MongoDB GridFS File Storage

## Overview

Files can now be stored directly in MongoDB using GridFS instead of the local filesystem. This is useful for:
- Cloud deployments where file system access is limited
- Distributed systems where files need to be accessible across multiple servers
- Simplified backup (files are included in MongoDB backups)

## Configuration

To enable MongoDB storage, set the `STORAGE_TYPE` environment variable in your `.env` file:

```env
STORAGE_TYPE=mongodb
```

For local file storage (default):
```env
STORAGE_TYPE=local
```

## How It Works

### GridFS
MongoDB GridFS is a specification for storing and retrieving files that exceed the 16MB BSON document size limit. GridFS divides files into chunks and stores them as separate documents.

### File Storage
- **Local Storage**: Files are saved to `backend/uploads/` directory
- **MongoDB Storage**: Files are stored in MongoDB GridFS bucket named `files`

### File Metadata
File metadata (name, type, size, description, tier, etc.) is always stored in the `File` collection, regardless of storage type.

## Benefits of MongoDB Storage

1. **No File System Dependencies**: Works in serverless/containerized environments
2. **Automatic Backup**: Files are included in MongoDB backups
3. **Scalability**: Files can be accessed from any server connected to the same MongoDB instance
4. **Atomic Operations**: File operations are transactional with metadata

## Limitations

1. **Performance**: For very large files or high-traffic scenarios, local storage or S3 may be faster
2. **Database Size**: Large files increase MongoDB database size
3. **Backup Size**: MongoDB backups will include all files

## Migration

To migrate existing files from local storage to MongoDB:

1. Set `STORAGE_TYPE=mongodb` in `.env`
2. Files uploaded after this change will be stored in MongoDB
3. Existing files in local storage will continue to work
4. To fully migrate, you would need to write a migration script to upload existing files to GridFS

## API Usage

The API remains the same regardless of storage type:

- **Upload**: `POST /api/files/upload`
- **Download**: `GET /api/files/:id/download`
- **Delete**: `DELETE /api/files/:id`

The storage type is handled automatically based on the `STORAGE_TYPE` environment variable.

