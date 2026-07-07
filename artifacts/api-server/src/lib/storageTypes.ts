import type { Readable } from "stream";

/** Thrown when a requested object does not exist in the backing store. */
export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export interface UploadTarget {
  /**
   * URL the browser PUTs the file to. Depending on the backend this is either a
   * presigned URL (replit/GCS) or a same-origin relay URL on this API server
   * (s3, because Oracle Object Storage has no CORS support).
   */
  uploadURL: string;
  /** App-internal path stored in the DB, e.g. "/objects/uploads/<uuid>". */
  objectPath: string;
}

/**
 * Backend-agnostic object storage contract. Implemented by the Replit (GCS via
 * sidecar) backend and the S3-compatible backend, selected at runtime by the
 * STORAGE_DRIVER env var (see objectStorage.ts).
 */
export interface StorageBackend {
  /**
   * Create an upload target for a new private object.
   * @param opts.relayBaseUrl Base URL for the same-origin upload relay
   *   ("/api/storage/uploads/direct"). Backends that presign upload URLs ignore it.
   */
  getUploadURL(opts: { relayBaseUrl: string }): Promise<UploadTarget>;

  /**
   * Stream a raw request body into a private object. Used only by backends that
   * rely on the same-origin upload relay (s3). Presigning backends throw.
   */
  putPrivateObject(objectId: string, body: Readable, contentType: string): Promise<void>;

  /** Fetch a public object as a web Response, or null if it does not exist. */
  getPublicObjectResponse(filePath: string, cacheTtlSec?: number): Promise<Response | null>;

  /**
   * Fetch a private object (path form "/objects/...") as a web Response.
   * Throws ObjectNotFoundError if it does not exist.
   */
  getPrivateObjectResponse(objectPath: string, cacheTtlSec?: number): Promise<Response>;
}
