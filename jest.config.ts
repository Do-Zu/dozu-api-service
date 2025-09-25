import type { Config } from 'jest';

const config: Config = {
    preset: 'ts-jest', // dùng ts-jest để chạy file .ts trực tiếp
    testEnvironment: 'node', // môi trường Node.js
    roots: ['<rootDir>/src'], // chỉ chạy test trong thư mục src
    moduleFileExtensions: ['ts', 'js', 'json'],
    testMatch: ['**/*.test.ts', '**/*.spec.ts'], // pattern test file
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1', // hỗ trợ alias @/ cho import
    },
    clearMocks: true, // auto reset mock mỗi test
    verbose: true, // log chi tiết
};

export default config;
