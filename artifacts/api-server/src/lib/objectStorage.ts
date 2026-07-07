import type { Readable } from "stream";
import { ReplitStorageBackend } from "./objectStorageReplit";
import { S3StorageBackend } from "./objectStorageS3";
import {
  ObjectNotFoundError,
  type StorageBackend,
  type UploadTarget,
} from "./storageTypes";

export { ObjectNotFoundError };
export type { StorageBackend, UploadTarget };

/**
 * Select the object storage backend based on the STORAGE_DRIVER env var:
 *   - "replit" (default): Google Cloud Storage via the Replit sidecar.
 *   - "s3": any S3-compatible store (e.g. Oracle Cloud Object Storage).
 *
 * Both backend modules are imported eagerly, but neither opens a connection at
 * import time — the store-specific client is constructed only for the selected
 * backend, so importing this module is safe on and off Replit.
 */
function selectStorageBackend(): StorageBackend {
  const driver = (process.env.STORAGE_DRIVER || "replit").toLowerCase();
  switch (driver) {
    case "s3":
      return new S3StorageBackend();
    case "replit":
      return new ReplitStorageBackend();
    default:
      throw new Error(
        `Unknown STORAGE_DRIVER "${driver}" — expected "replit" or "s3".`,
      );
  }
}

/**
 * Facade over the selected StorageBackend. Route handlers use this class and are
 * agnostic to which backend is active.
 */
export class ObjectStorageService implements StorageBackend {
  private readonly backend: StorageBackend;

  constructor() {
    this.backend = selectStorageBackend();
  }

  getUploadURL(opts: { relayBaseUrl: string }): Promise<UploadTarget> {
    return this.backend.getUploadURL(opts);
  }

  putPrivateObject(objectId: string, body: Readable, contentType: string): Promise<void> {
    return this.backend.putPrivateObject(objectId, body, contentType);
  }

  getPublicObjectResponse(filePath: string, cacheTtlSec?: number): Promise<Response | null> {
    return this.backend.getPublicObjectResponse(filePath, cacheTtlSec);
  }

  getPrivateObjectResponse(objectPath: string, cacheTtlSec?: number): Promise<Response> {
    return this.backend.getPrivateObjectResponse(objectPath, cacheTtlSec);
  }
}
