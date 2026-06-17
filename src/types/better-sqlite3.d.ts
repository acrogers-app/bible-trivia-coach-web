declare module 'better-sqlite3' {
  interface Statement<Result = unknown> {
    all(...params: unknown[]): Result[];
    get(...params: unknown[]): Result | undefined;
    run(...params: unknown[]): unknown;
  }

  export default class Database {
    constructor(
      path: string,
      options?: {
        readonly?: boolean;
        fileMustExist?: boolean;
        timeout?: number;
        verbose?: (...args: unknown[]) => void;
      }
    );

    prepare<Result = unknown>(sql: string): Statement<Result>;
  }
}
