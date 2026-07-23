declare const process: {
  argv: string[];
  exitCode?: number;
};

declare module 'node:path' {
  const path: {
    sep: string;
    resolve(...parts: string[]): string;
    relative(from: string, to: string): string;
    basename(value: string): string;
    extname(value: string): string;
    join(...parts: string[]): string;
    dirname(value: string): string;
  };
  export default path;
}

declare module 'node:fs/promises' {
  const fs: {
    readFile(path: string, encoding: string): Promise<string>;
    writeFile(path: string, data: string, encoding: string): Promise<void>;
    mkdir(path: string, options?: { recursive?: boolean }): Promise<void>;
    readdir(path: string, options: { withFileTypes: true }): Promise<Array<{
      name: string;
      isDirectory(): boolean;
      isFile(): boolean;
    }>>;
  };
  export default fs;
}

declare module 'node:test' {
  export default function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  const assert: {
    equal(actual: unknown, expected: unknown, message?: string): void;
    ok(value: unknown, message?: string): asserts value;
    match(value: string, regexp: RegExp, message?: string): void;
  };
  export default assert;
}
