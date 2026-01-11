export interface FileItem {
    name: string;
    type: 'directory' | 'file';
    size: number;
    mtime: number;
    atime: number;
    birthTime?: number;
    isShared?: boolean;
    permissions?: number;
    uid?: number;
    gid?: number;
    filePath?: string;
    path?: string;
    shareId?: string;
    db_user?: string;
    host?: string;
    phpVersion?: string;
    records?: number;
    status?: string;
    version?: string;
    full_version?: string;
    id?: number | string;
    displayPath?: string;
}
